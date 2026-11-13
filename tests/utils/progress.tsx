import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ProgressProvider } from '@/lib/progress/ProgressProvider'
import { CloudProvider } from '@/lib/cloud/CloudProvider'
import type { CloudApi } from '@/lib/cloud/types'
import type { ProgressStore } from '@/lib/progress/store'
import { emptySnapshot, type ProgressSnapshot } from '@/lib/progress/snapshot'

export const FIXED_NOW = new Date('2026-11-03T03:00:00Z') // 12:00 in Seoul
export const TODAY = '2026-11-03'

export function memoryStore(initial?: ProgressSnapshot) {
  let saved: ProgressSnapshot = initial ?? emptySnapshot(TODAY)
  const store: ProgressStore & { saves: number; current(): ProgressSnapshot } = {
    saves: 0,
    load: () => saved,
    peek: () => saved,
    save: s => { saved = s; store.saves++ },
    current: () => saved,
  }
  return store
}

export function renderWithProgress(ui: ReactElement, store = memoryStore()) {
  return { store, ...render(<ProgressProvider store={store} now={() => FIXED_NOW}>{ui}</ProgressProvider>) }
}

/** Same as renderWithProgress, with a CloudProvider (inside ProgressProvider) around `ui`. */
export function renderWithCloud(
  ui: ReactElement,
  api: CloudApi | null,
  { store = memoryStore(), pushDelayMs = 0 }: { store?: ReturnType<typeof memoryStore>; pushDelayMs?: number } = {},
) {
  return {
    store,
    ...render(
      <ProgressProvider store={store} now={() => FIXED_NOW}>
        <CloudProvider api={api} pushDelayMs={pushDelayMs}>{ui}</CloudProvider>
      </ProgressProvider>,
    ),
  }
}
