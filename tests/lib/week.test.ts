import { describe, expect, test } from 'vitest'
import { weekRangeLabel } from '@/lib/week'

describe('weekRangeLabel', () => {
  test('Monday to Sunday within one month', () => {
    // 2026-11-13 is a Friday: its week runs Mon 11/9 to Sun 11/15.
    expect(weekRangeLabel('2026-11-13')).toBe('11월 9일 ~ 15일')
    expect(weekRangeLabel('2026-11-09')).toBe('11월 9일 ~ 15일')
    expect(weekRangeLabel('2026-11-15')).toBe('11월 9일 ~ 15일')
    expect(weekRangeLabel('2026-11-03')).toBe('11월 2일 ~ 8일')
  })
  test('names both months when the week crosses one', () => {
    expect(weekRangeLabel('2026-12-02')).toBe('11월 30일 ~ 12월 6일')
  })
})
