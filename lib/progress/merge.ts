import type { CompletedLesson, ProgressSnapshot, ReviewItem } from './snapshot'

/** Compare nullable ISO strings; null is older than any value. */
function cmp(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return -1
  if (b === null) return 1
  return a < b ? -1 : 1
}

function mergeLesson(a: CompletedLesson, b: CompletedLesson): CompletedLesson {
  if (a.score !== b.score) return { ...(a.score > b.score ? a : b) }
  return {
    score: a.score,
    perfect: a.perfect || b.perfect,
    completedAt: cmp(a.completedAt, b.completedAt) >= 0 ? a.completedAt : b.completedAt,
  }
}

function mergeReview(a: ReviewItem, b: ReviewItem): ReviewItem {
  const d = cmp(a.nextReviewDate, b.nextReviewDate)
  if (d !== 0) return { ...(d > 0 ? a : b) }
  const ca = a.correctCount + a.wrongCount
  const cb = b.correctCount + b.wrongCount
  if (ca !== cb) return { ...(ca > cb ? a : b) }
  // Deterministic tie-break independent of argument order.
  const ka = [a.intervalDays, a.correctCount, a.wrongCount]
  const kb = [b.intervalDays, b.correctCount, b.wrongCount]
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return { ...(ka[i] > kb[i] ? a : b) }
  }
  return { ...a }
}

function mergeRecords<T>(
  a: Record<string, T>,
  b: Record<string, T>,
  pick: (x: T, y: T) => T,
): Record<string, T> {
  const out: Record<string, T> = {}
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[k] = k in a && k in b ? pick(a[k], b[k]) : { ...(a[k] ?? b[k]) }
  }
  return out
}

/** Merge two devices' snapshots. Pure and commutative. */
export function mergeSnapshots(a: ProgressSnapshot, b: ProgressSnapshot): ProgressSnapshot {
  const sa = a.streak
  const sb = b.streak
  const sd = cmp(sa.lastActiveDate, sb.lastActiveDate)
  const sWin = sd !== 0 ? (sd > 0 ? sa : sb) : sa.current >= sb.current ? sa : sb

  const wd = cmp(a.weekXp.week, b.weekXp.week)
  const weekXp =
    wd === 0
      ? { week: a.weekXp.week, xp: Math.max(a.weekXp.xp, b.weekXp.xp) }
      : { ...(wd > 0 ? a.weekXp : b.weekXp) }

  const td = cmp(a.today.date, b.today.date)
  const today =
    td === 0
      ? { date: a.today.date, lessonsCompleted: Math.max(a.today.lessonsCompleted, b.today.lessonsCompleted) }
      : { ...(td > 0 ? a.today : b.today) }

  const rd = cmp(a.restTokenWeek, b.restTokenWeek)
  const rest =
    rd !== 0
      ? rd > 0
        ? a
        : b
      : { restTokens: Math.max(a.restTokens, b.restTokens), dailyGoal: Math.max(a.dailyGoal, b.dailyGoal), restTokenWeek: a.restTokenWeek }

  return {
    version: 1,
    xp: Math.max(a.xp, b.xp),
    dailyGoal: rest.dailyGoal,
    completed: mergeRecords(a.completed, b.completed, mergeLesson),
    streak: {
      current: sWin.current,
      longest: Math.max(sa.longest, sb.longest),
      lastActiveDate: sWin.lastActiveDate,
    },
    restTokens: rest.restTokens,
    restTokenWeek: rest.restTokenWeek,
    today,
    reviews: mergeRecords(a.reviews, b.reviews, mergeReview),
    weekXp,
  }
}
