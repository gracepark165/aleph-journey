export type ReviewItem = {
  lemmaId: string
  intervalDays: number
  nextReviewDate: string
  correctCount: number
  wrongCount: number
}

export type CompletedLesson = { completedAt: string; score: number; perfect: boolean }

export type ProgressSnapshot = {
  version: 1
  xp: number
  dailyGoal: number
  completed: Record<string, CompletedLesson>
  streak: { current: number; longest: number; lastActiveDate: string | null }
  restTokens: number
  restTokenWeek: string | null
  today: { date: string; lessonsCompleted: number }
  reviews: Record<string, ReviewItem>
  /** XP earned in the current ISO week (week label like '2026-W46'); basis for weekly friend rankings. */
  weekXp: { week: string | null; xp: number }
}

export function emptySnapshot(today: string): ProgressSnapshot {
  return {
    version: 1,
    xp: 0,
    dailyGoal: 1,
    completed: {},
    streak: { current: 0, longest: 0, lastActiveDate: null },
    restTokens: 0,
    restTokenWeek: null,
    today: { date: today, lessonsCompleted: 0 },
    reviews: {},
    weekXp: { week: null, xp: 0 },
  }
}
