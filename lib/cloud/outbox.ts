import { readJson, writeJson } from '@/lib/prefs'
import { CloudError, type CloudErrorCode } from './types'

/** `id` is set when queued (or on first read for events queued before ids existed). */
export type XpEvent = { week: string; gained: number; streak: number; id?: string }
export type QueuedXpEvent = XpEvent & { id: string }

export const OUTBOX_KEY = 'aleph-journey:outbox'
/** Web Lock name: one flush at a time across all tabs of this origin. */
export const OUTBOX_LOCK = 'aleph-outbox'

/** Server rejections that will never succeed on retry: the event is dropped instead of blocking the queue. */
const PERMANENT: CloudErrorCode[] = ['invalid_week', 'invalid_gained']

/** Fallback when storage is blocked: lasts for this visit only. */
let memory: QueuedXpEvent[] = []
/** Per-tab guard; across tabs the Web Lock (when available) serialises flushes. */
let flushing = false

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch { /* insecure context */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function isEvent(v: unknown): v is XpEvent {
  const e = v as XpEvent
  return !!e && typeof e.week === 'string' && typeof e.gained === 'number' && typeof e.streak === 'number'
}

function save(list: QueuedXpEvent[]): void {
  memory = list
  writeJson(OUTBOX_KEY, list)
}

export function pending(): QueuedXpEvent[] {
  const raw = readJson(OUTBOX_KEY)
  if (!Array.isArray(raw)) return [...memory]
  let changed = false
  const list = raw.filter(isEvent).map(e => {
    if (typeof e.id === 'string' && e.id) return e as QueuedXpEvent
    changed = true
    return { ...e, id: newId() }
  })
  // Persist ids given to older events so every later read (and other tabs) sees the same ones.
  if (changed) save(list)
  return list
}

export function enqueue(ev: XpEvent): void {
  const { week, gained, streak } = ev
  save([...pending(), { week, gained, streak, id: newId() }])
}

function remove(id: string): void {
  save(pending().filter(e => e.id !== id))
}

const isPermanent = (e: unknown) => e instanceof CloudError && PERMANENT.includes(e.code)

async function run(send: (ev: QueuedXpEvent) => Promise<void>): Promise<number> {
  let sent = 0
  for (const ev of pending()) {
    // Another tab (without Web Locks) may have sent it meanwhile.
    if (!pending().some(e => e.id === ev.id)) continue
    try {
      await send(ev)
    } catch (e) {
      if (isPermanent(e)) { remove(ev.id); continue }
      break
    }
    sent++
    remove(ev.id)
  }
  return sent
}

type Locks = { request(name: string, cb: () => Promise<unknown>): Promise<unknown> }
const webLocks = (): Locks | null => {
  const l = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: Locks }).locks : undefined
  return l && typeof l.request === 'function' ? l : null
}

/**
 * Send queued events oldest first. A network/unknown failure stops the flush so order is kept;
 * a permanent rejection (invalid week/gained) drops that event and continues. Events are removed
 * by id, so changes made by another tab are kept. A second call in the same tab while one is
 * running sends nothing; across tabs the 'aleph-outbox' Web Lock runs flushes one after another.
 */
export async function flush(send: (ev: QueuedXpEvent) => Promise<void>): Promise<{ sent: number; left: number }> {
  if (flushing) return { sent: 0, left: pending().length }
  flushing = true
  let sent = 0
  try {
    const locks = webLocks()
    sent = locks ? ((await locks.request(OUTBOX_LOCK, () => run(send))) as number) : await run(send)
  } finally {
    flushing = false
  }
  return { sent, left: pending().length }
}
