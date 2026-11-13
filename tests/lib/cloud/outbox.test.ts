import { afterEach, describe, expect, it, vi } from 'vitest'
import { enqueue, flush, pending, OUTBOX_KEY, type XpEvent } from '@/lib/cloud/outbox'
import { CloudError } from '@/lib/cloud/types'

const ev = (n: number): XpEvent => ({ week: '2026-W45', gained: n, streak: 1 })
const strip = (list: XpEvent[]) => list.map(({ week, gained, streak }) => ({ week, gained, streak }))

afterEach(() => { vi.unstubAllGlobals() })

describe('outbox', () => {
  it('stops at the first failure, keeps order, and resumes', async () => {
    enqueue(ev(1)); enqueue(ev(2)); enqueue(ev(3))
    const seen: number[] = []
    let calls = 0
    const r1 = await flush(async e => {
      if (++calls === 2) throw new Error('offline')
      seen.push(e.gained)
    })
    expect(r1).toEqual({ sent: 1, left: 2 })
    expect(pending().map(e => e.gained)).toEqual([2, 3])
    const r2 = await flush(async e => { seen.push(e.gained) })
    expect(r2).toEqual({ sent: 2, left: 0 })
    expect(seen).toEqual([1, 2, 3])
    expect(pending()).toEqual([])
  })

  it('does not run two sends at once', async () => {
    enqueue(ev(1))
    let release!: () => void
    const send = vi.fn(() => new Promise<void>(res => { release = res }))
    const a = flush(send)
    const b = await flush(send)
    expect(b).toEqual({ sent: 0, left: 1 })
    release()
    expect(await a).toEqual({ sent: 1, left: 0 })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('works in memory when storage throws', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      enqueue(ev(5))
      expect(strip(pending())).toEqual([ev(5)])
      expect(await flush(async () => {})).toEqual({ sent: 1, left: 0 })
      expect(pending()).toEqual([])
    } finally {
      get.mockRestore(); set.mockRestore()
    }
  })

  it('persists under OUTBOX_KEY with a stable id', () => {
    enqueue(ev(7))
    const stored = JSON.parse(localStorage.getItem(OUTBOX_KEY)!)
    expect(strip(stored)).toEqual([ev(7)])
    expect(typeof stored[0].id).toBe('string')
    expect(pending()[0].id).toBe(stored[0].id)
    localStorage.removeItem(OUTBOX_KEY)
  })

  it('gives already-queued events without an id a stable id on read', async () => {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify([ev(1), ev(2)]))
    const ids = pending().map(e => e.id)
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(2)
    expect(pending().map(e => e.id)).toEqual(ids)
    expect(await flush(async () => {})).toEqual({ sent: 2, left: 0 })
  })

  it('drops a permanently rejected event and still sends the next one', async () => {
    enqueue(ev(1)); enqueue(ev(2))
    const sent: number[] = []
    const r = await flush(async e => {
      if (e.gained === 1) throw new CloudError('invalid_week')
      sent.push(e.gained)
    })
    expect(sent).toEqual([2])
    expect(r).toEqual({ sent: 1, left: 0 })
    expect(pending()).toEqual([])
  })

  it('drops invalid_gained too, but a network error keeps the queue', async () => {
    enqueue(ev(40)); enqueue(ev(2)); enqueue(ev(3))
    const r = await flush(async e => {
      if (e.gained === 40) throw new CloudError('invalid_gained')
      throw new CloudError('network')
    })
    expect(r).toEqual({ sent: 0, left: 2 })
    expect(pending().map(e => e.gained)).toEqual([2, 3])
    await flush(async () => {})
  })

  it('removes the sent event by id even when the head changed mid-flush (another tab)', async () => {
    enqueue(ev(1)); enqueue(ev(2))
    const sent: number[] = []
    await flush(async e => {
      if (e.gained === 1) {
        // Another tab already sent event 1 and queued event 3.
        const others = pending().filter(x => x.gained !== 1)
        localStorage.setItem(OUTBOX_KEY, JSON.stringify([...others, { ...ev(3), id: 'other-tab' }]))
      }
      sent.push(e.gained)
    })
    expect(sent).toEqual([1, 2])
    expect(pending().map(e => e.gained)).toEqual([3])
    await flush(async () => {})
  })

  it('skips an event another tab already removed', async () => {
    enqueue(ev(1)); enqueue(ev(2))
    const sent: number[] = []
    await flush(async e => {
      if (e.gained === 1) localStorage.setItem(OUTBOX_KEY, JSON.stringify([]))
      sent.push(e.gained)
    })
    expect(sent).toEqual([1])
    expect(pending()).toEqual([])
  })

  it('runs under the aleph-outbox Web Lock when available', async () => {
    const request = vi.fn((_name: string, cb: () => Promise<unknown>) => cb())
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { locks: { request } }))
    enqueue(ev(1))
    const send = vi.fn(async () => {})
    expect(await flush(send)).toEqual({ sent: 1, left: 0 })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][0]).toBe('aleph-outbox')
    expect(send).toHaveBeenCalledTimes(1)
  })
})
