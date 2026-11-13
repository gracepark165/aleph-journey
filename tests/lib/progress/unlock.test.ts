import { describe, expect, test } from 'vitest'
import { isLessonUnlocked, isUnitUnlocked } from '@/lib/progress/unlock'
import { readCourse } from '@/lib/content/read-files'

const course = readCourse()
const c = (ids: string[]) => Object.fromEntries(ids.map(id => [id, { completedAt: '', score: 100, perfect: true }]))

describe('unlock', () => {
  test('only first lesson open with no progress', () => {
    expect(isLessonUnlocked(course, 'alef-bet-1', {})).toBe(true)
    expect(isLessonUnlocked(course, 'rebekah-reading', {})).toBe(false)
    expect(isUnitUnlocked(course, 'unit-0-alefbet', {})).toBe(true)
    expect(isUnitUnlocked(course, 'unit-1-rebekah', {})).toBe(false)
  })
  test('completing a lesson opens the next one only', () => {
    const done = c(['alef-bet-1'])
    expect(isLessonUnlocked(course, 'rebekah-reading', done)).toBe(true)
    expect(isLessonUnlocked(course, 'rebekah-quiz', done)).toBe(false)
    expect(isUnitUnlocked(course, 'unit-1-rebekah', done)).toBe(true)
  })
  test('unknown ids are locked', () => {
    expect(isLessonUnlocked(course, 'nope', {})).toBe(false)
    expect(isUnitUnlocked(course, 'nope', {})).toBe(false)
  })
  test('review mode opens every known lesson but not unknown ids', () => {
    expect(isLessonUnlocked(course, 'jonah-roleplay', {}, { all: true })).toBe(true)
    expect(isUnitUnlocked(course, 'unit-10-jonah', {}, { all: true })).toBe(true)
    expect(isLessonUnlocked(course, 'nope', {}, { all: true })).toBe(false)
  })
})
