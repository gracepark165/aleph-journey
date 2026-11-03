import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ProgressProvider } from '@/lib/progress/ProgressProvider'
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
