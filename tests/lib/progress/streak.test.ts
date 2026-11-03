import { describe, expect, test } from 'vitest'
import { emptySnapshot, type ProgressSnapshot } from '@/lib/progress/snapshot'
import { recordLessonComplete, startOfDay, xpForLesson, XP } from '@/lib/progress/streak'

const NOW = '2026-11-03T00:00:00.000Z'
const reading = { id: 'r', type: 'reading' as const }
const quiz = { id: 'q', type: 'quiz' as const }
const done = (s: ProgressSnapshot, day: string, lesson = reading, result = { score: 100, perfect: true }) =>
  recordLessonComplete(s, lesson, result, day, NOW)

describe('xp', () => {
  test('values', () => {
    expect(XP).toEqual({ reading: 10, quiz: 10, roleplay: 20, perfectBonus: 5, repeat: 5 })
    expect(xpForLesson('reading', false, false)).toBe(10)
    expect(xpForLesson('roleplay', true, false)).toBe(25)
    expect(xpForLesson('roleplay', true, true)).toBe(5)
  })
})

describe('streak', () => {
  test('first lesson starts streak at 1', () => {
    const s = done(emptySnapshot('2026-11-03'), '2026-11-03')
    expect(s.streak).toEqual({ current: 1, longest: 1, lastActiveDate: '2026-11-03' })
    expect(s.xp).toBe(15)
    expect(s.today).toEqual({ date: '2026-11-03', lessonsCompleted: 1 })
  })
  test('second lesson same day does not increase streak', () => {
    const s = done(done(emptySnapshot('2026-11-03'), '2026-11-03'), '2026-11-03', quiz)
    expect(s.streak.current).toBe(1)
    expect(s.today.lessonsCompleted).toBe(2)
  })
  test('next day continues streak', () => {
    const s = done(done(emptySnapshot('2026-11-03'), '2026-11-03'), '2026-11-04', quiz)
    expect(s.streak.current).toBe(2)
    expect(s.today).toEqual({ date: '2026-11-04', lessonsCompleted: 1 })
  })
  test('one missed day with a rest token keeps the streak', () => {
    let s = done(emptySnapshot('2026-11-03'), '2026-11-03')
    s = startOfDay(s, '2026-11-03')
    expect(s.restTokens).toBe(1)
    s = startOfDay(s, '2026-11-05')
    expect(s.restTokens).toBe(0)
    expect(s.streak.lastActiveDate).toBe('2026-11-04')
    expect(done(s, '2026-11-05', quiz).streak.current).toBe(2)
  })
  test('one missed day without token resets but keeps longest', () => {
    let s = done(done(emptySnapshot('2026-11-03'), '2026-11-03'), '2026-11-04', quiz)
    s = { ...s, restTokens: 0 }
    s = done(s, '2026-11-06')
    expect(s.streak).toMatchObject({ current: 1, longest: 2 })
  })
  test('two missed days reset even with a token', () => {
    let s = done(emptySnapshot('2026-11-03'), '2026-11-03')
    s = startOfDay(s, '2026-11-03')
    s = startOfDay(s, '2026-11-06')
    expect(s.streak.current).toBe(0)
    expect(s.restTokens).toBe(1)
  })
  test('rest token granted once per ISO week and capped at 1', () => {
    let s = startOfDay(emptySnapshot('2026-11-03'), '2026-11-03')
    s = startOfDay(s, '2026-11-04')
    expect(s.restTokens).toBe(1)
    expect(s.restTokenWeek).toBe('2026-W45')
    s = startOfDay(s, '2026-11-10')
    expect(s.restTokens).toBe(1)
    expect(s.restTokenWeek).toBe('2026-W46')
  })
  test('rollover runs before grant: missed Sunday is not covered by Monday token', () => {
    let s = done(emptySnapshot('2026-11-07'), '2026-11-07')
    s = { ...startOfDay(s, '2026-11-07'), restTokens: 0 }
    s = startOfDay(s, '2026-11-09')
    expect(s.streak.current).toBe(0)
    expect(s.restTokens).toBe(1)
  })
  test('repeat completion gives repeat xp and keeps best score', () => {
    let s = done(emptySnapshot('2026-11-03'), '2026-11-03', quiz, { score: 80, perfect: false })
    const before = s.xp
    s = done(s, '2026-11-03', quiz, { score: 60, perfect: false })
    expect(s.xp - before).toBe(5)
    expect(s.completed.q.score).toBe(80)
    s = done(s, '2026-11-03', quiz, { score: 100, perfect: true })
    expect(s.completed.q).toMatchObject({ score: 100, perfect: true })
  })
  test('repeat completion on a new day still counts toward the streak', () => {
    let s = done(emptySnapshot('2026-11-03'), '2026-11-03')
    s = done(s, '2026-11-04')
    expect(s.streak.current).toBe(2)
  })
})
