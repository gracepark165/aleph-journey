import { describe, expect, test } from 'vitest'
import { MAP, STOPS, arrowPath, stopFor, viewFor } from '@/lib/journey-map'

describe('journey map', () => {
  test('16 stops from Rameses to Canaan', () => {
    expect(STOPS).toHaveLength(16)
    expect(STOPS[0].nameKo).toBe('라암셋')
    expect(STOPS[15].nameKo).toBe('가나안')
  })
  test('unit index maps to a stop, clamped at both ends', () => {
    expect(stopFor(1).nameKo).toBe('숙곳')
    expect(stopFor(-3)).toBe(STOPS[0])
    expect(stopFor(99)).toBe(STOPS[15])
  })
  test('arrow starts just past the cleared stop and stops short of the next', () => {
    const d = arrowPath({ x: 0, y: 0 }, { x: 0, y: 200 })
    const [, sx, sy] = /^M (\S+) (\S+)/.exec(d)!.map(Number)
    const end = d.trim().split(' ').slice(-2).map(Number)
    expect(sx).toBe(0)
    expect(sy).toBe(20)
    expect(end).toEqual([0, 148])
  })
  test('view keeps both stops inside the map bounds', () => {
    const v = viewFor(STOPS[0], STOPS[1])
    expect(v.x).toBeGreaterThanOrEqual(0)
    expect(v.y + v.h).toBeLessThanOrEqual(MAP.height)
    for (const s of [STOPS[0], STOPS[1]]) {
      expect(s.x).toBeGreaterThan(v.x); expect(s.x).toBeLessThan(v.x + v.w)
      expect(s.y).toBeGreaterThan(v.y); expect(s.y).toBeLessThan(v.y + v.h)
    }
  })
})
