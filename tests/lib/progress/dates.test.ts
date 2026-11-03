import { describe, expect, test } from 'vitest'
import { addDays, daysBetween, isoWeek, seoulDate } from '@/lib/progress/dates'

describe('dates', () => {
  test('seoulDate uses Asia/Seoul regardless of host timezone', () => {
    expect(seoulDate(new Date('2026-11-03T15:00:00Z'))).toBe('2026-11-04')
    expect(seoulDate(new Date('2026-11-03T14:59:59Z'))).toBe('2026-11-03')
  })
  test('daysBetween across year boundary', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-11-03', '2026-11-03')).toBe(0)
    expect(daysBetween('2026-11-05', '2026-11-03')).toBe(-2)
  })
  test('addDays', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
  test('isoWeek', () => {
    expect(isoWeek('2026-11-03')).toBe('2026-W45')
    expect(isoWeek('2027-01-01')).toBe('2026-W53')
    expect(isoWeek('2026-11-08')).toBe('2026-W45')
    expect(isoWeek('2026-11-09')).toBe('2026-W46')
  })
})
