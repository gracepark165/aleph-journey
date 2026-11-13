import { describe, expect, it, vi } from 'vitest'
import { enqueue, flush, pending, OUTBOX_KEY, type XpEvent } from '@/lib/cloud/outbox'

const ev = (n: number): XpEvent => ({ week: '2026-W45', gained: n, streak: 1 })

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
      expect(pending()).toEqual([ev(5)])
      expect(await flush(async () => {})).toEqual({ sent: 1, left: 0 })
      expect(pending()).toEqual([])
    } finally {
      get.mockRestore(); set.mockRestore()
    }
  })

  it('persists under OUTBOX_KEY', () => {
    enqueue(ev(7))
    expect(JSON.parse(localStorage.getItem(OUTBOX_KEY)!)).toEqual([ev(7)])
  })
})
