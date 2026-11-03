import type { LessonType } from '@/lib/content/schema'
import { addDays, daysBetween, isoWeek } from './dates'
import type { ProgressSnapshot } from './snapshot'

export const XP = { reading: 10, quiz: 10, roleplay: 20, perfectBonus: 5, repeat: 5 } as const
const MAX_REST_TOKENS = 1

export function xpForLesson(type: LessonType, perfect: boolean, isRepeat: boolean): number {
  if (isRepeat) return XP.repeat
  return XP[type] + (perfect ? XP.perfectBonus : 0)
}

/** Apply day rollover (missed days, rest tokens) and then the weekly token grant. Order matters. */
export function startOfDay(s: ProgressSnapshot, today: string): ProgressSnapshot {
  let next = s
  const last = next.streak.lastActiveDate
  if (last !== null) {
    const gap = daysBetween(last, today)
    if (gap === 2 && next.restTokens > 0) {
      next = { ...next, restTokens: next.restTokens - 1, streak: { ...next.streak, lastActiveDate: addDays(today, -1) } }
    } else if (gap > 1) {
      next = { ...next, streak: { ...next.streak, current: 0 } }
    }
  }
  const week = isoWeek(today)
  if (next.restTokenWeek !== week) {
    next = { ...next, restTokens: Math.min(MAX_REST_TOKENS, next.restTokens + 1), restTokenWeek: week }
  }
  if (next.today.date !== today) next = { ...next, today: { date: today, lessonsCompleted: 0 } }
  return next
}

export function recordLessonComplete(
  s: ProgressSnapshot,
  lesson: { id: string; type: LessonType },
  result: { score: number; perfect: boolean },
  today: string,
  nowIso: string,
): ProgressSnapshot {
  const base = startOfDay(s, today)
  const prev = base.completed[lesson.id]
  const completed = {
    ...base.completed,
    [lesson.id]: !prev || result.score > prev.score
      ? { completedAt: nowIso, score: result.score, perfect: result.perfect || (prev?.perfect ?? false) }
      : { ...prev, perfect: prev.perfect || result.perfect },
  }
  const lessonsCompleted = base.today.lessonsCompleted + 1
  let streak = base.streak
  if (lessonsCompleted >= base.dailyGoal && streak.lastActiveDate !== today) {
    const current = streak.current + 1
    streak = { current, longest: Math.max(streak.longest, current), lastActiveDate: today }
  }
  return {
    ...base,
    xp: base.xp + xpForLesson(lesson.type, result.perfect, prev !== undefined),
    completed,
    streak,
    today: { date: today, lessonsCompleted },
  }
}
