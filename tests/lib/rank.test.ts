import { describe, expect, test } from 'vitest'
import { RANKS, rankFor } from '@/lib/rank'

describe('rankFor', () => {
  test('22 ranks follow the Hebrew alphabet from alef to tav', () => {
    expect(RANKS).toHaveLength(22)
    expect(RANKS[0]).toMatchObject({ letter: 'א', nameKo: '알레프', minXp: 0 })
    expect(RANKS[21]).toMatchObject({ letter: 'ת', nameKo: '타브' })
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].minXp).toBeGreaterThan(RANKS[i - 1].minXp)
  })
  test('new learner is alef with progress toward bet', () => {
    expect(rankFor(0)).toMatchObject({ rank: { letter: 'א' }, next: { letter: 'ב' }, xpToNext: 30, progress: 0 })
  })
  test('exactly at a threshold moves up', () => {
    expect(rankFor(30).rank.letter).toBe('ב')
    expect(rankFor(50)).toMatchObject({ rank: { letter: 'ב' }, xpToNext: 20, progress: 0.5 })
  })
  test('top rank has no next', () => {
    const r = rankFor(1_000_000)
    expect(r.rank.letter).toBe('ת')
    expect(r.next).toBeNull()
    expect(r.progress).toBe(1)
  })
})
