import { describe, expect, test, vi } from 'vitest'
import { createLocalStore, STORAGE_KEY } from '@/lib/progress/store'
import { emptySnapshot } from '@/lib/progress/snapshot'
import { recordLessonComplete } from '@/lib/progress/streak'

const T = '2026-11-03'
function fakeStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init))
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: k => m.get(k) ?? null,
    key: i => [...m.keys()][i] ?? null,
    removeItem: k => { m.delete(k) },
    setItem: (k, v) => { m.set(k, v) },
  }
}

describe('local progress store', () => {
  test('key name', () => expect(STORAGE_KEY).toBe('aleph-journey:progress'))
  test('round trip', () => {
    const store = createLocalStore(fakeStorage())
    const s = recordLessonComplete(emptySnapshot(T), { id: 'r', type: 'reading' }, { score: 100, perfect: true }, T, 'x')
    store.save(s)
    expect(store.load(T)).toEqual(s)
  })
  test('missing data gives empty snapshot', () => {
    expect(createLocalStore(fakeStorage()).load(T)).toEqual(emptySnapshot(T))
  })
  test('broken JSON gives empty snapshot', () => {
    expect(createLocalStore(fakeStorage({ [STORAGE_KEY]: '{broken' })).load(T)).toEqual(emptySnapshot(T))
  })
  test('other version gives empty snapshot', () => {
    const s = { ...emptySnapshot(T), version: 2 }
    expect(createLocalStore(fakeStorage({ [STORAGE_KEY]: JSON.stringify(s) })).load(T)).toEqual(emptySnapshot(T))
  })
  test('wrong shape gives empty snapshot', () => {
    const s = { ...emptySnapshot(T), xp: 'lots' }
    expect(createLocalStore(fakeStorage({ [STORAGE_KEY]: JSON.stringify(s) })).load(T)).toEqual(emptySnapshot(T))
  })
  test('throwing storage does not propagate', () => {
    const bad = fakeStorage()
    bad.getItem = () => { throw new Error('denied') }
    bad.setItem = () => { throw new Error('quota') }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = createLocalStore(bad)
    expect(store.load(T)).toEqual(emptySnapshot(T))
    expect(() => store.save(emptySnapshot(T))).not.toThrow()
    warn.mockRestore()
  })
})
