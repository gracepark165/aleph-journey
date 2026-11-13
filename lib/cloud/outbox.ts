import { readJson, writeJson } from '@/lib/prefs'

export type XpEvent = { week: string; gained: number; streak: number }

export const OUTBOX_KEY = 'aleph-journey:outbox'

/** Fallback when storage is blocked: lasts for this visit only. */
let memory: XpEvent[] = []
let flushing = false

function isEvent(v: unknown): v is XpEvent {
  const e = v as XpEvent
  return !!e && typeof e.week === 'string' && typeof e.gained === 'number' && typeof e.streak === 'number'
}

export function pending(): XpEvent[] {
  const raw = readJson(OUTBOX_KEY)
  if (Array.isArray(raw)) return raw.filter(isEvent)
  return [...memory]
}

function save(list: XpEvent[]): void {
  memory = list
  writeJson(OUTBOX_KEY, list)
}

export function enqueue(ev: XpEvent): void {
  save([...pending(), ev])
}

/**
 * Send queued events oldest first; stop at the first failure so order is kept,
 * and drop only what was sent. A second call while one is running sends nothing.
 */
export async function flush(send: (ev: XpEvent) => Promise<void>): Promise<{ sent: number; left: number }> {
  if (flushing) return { sent: 0, left: pending().length }
  flushing = true
  let sent = 0
  try {
    for (const ev of pending()) {
      try {
        await send(ev)
      } catch {
        break
      }
      sent++
      save(pending().slice(1))
    }
  } finally {
    flushing = false
  }
  return { sent, left: pending().length }
}
