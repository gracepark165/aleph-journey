import { describe, it, expect } from 'vitest'
import { mergeSnapshots } from '@/lib/progress/merge'
import { emptySnapshot, type ProgressSnapshot } from '@/lib/progress/snapshot'

const base = (over: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
  ...emptySnapshot('2026-11-13'),
  ...over,
})

describe('mergeSnapshots', () => {
  it('takes the larger xp', () => {
    expect(mergeSnapshots(base({ xp: 10 }), base({ xp: 30 })).xp).toBe(30)
  })

  it('unions completed lessons', () => {
    const l = { completedAt: '2026-11-01', score: 5, perfect: false }
    const m = mergeSnapshots(base({ completed: { a: l } }), base({ completed: { b: l } }))
    expect(Object.keys(m.completed).sort()).toEqual(['a', 'b'])
  })

  it('keeps the higher score for the same lesson', () => {
    const lo = { completedAt: '2026-11-01', score: 5, perfect: false }
    const hi = { completedAt: '2026-11-02', score: 8, perfect: false }
    const m = mergeSnapshots(base({ completed: { a: lo } }), base({ completed: { a: hi } }))
    expect(m.completed.a).toEqual(hi)
  })

  it('ORs perfect on equal scores', () => {
    const x = { completedAt: '2026-11-01', score: 8, perfect: false }
    const y = { completedAt: '2026-11-01', score: 8, perfect: true }
    const m = mergeSnapshots(base({ completed: { a: x } }), base({ completed: { a: y } }))
    expect(m.completed.a.perfect).toBe(true)
  })

  it('keeps the review with the later nextReviewDate', () => {
    const early = { lemmaId: 'w', intervalDays: 1, nextReviewDate: '2026-11-14', correctCount: 9, wrongCount: 9 }
    const late = { lemmaId: 'w', intervalDays: 4, nextReviewDate: '2026-11-17', correctCount: 1, wrongCount: 0 }
    const m = mergeSnapshots(base({ reviews: { w: early } }), base({ reviews: { w: late } }))
    expect(m.reviews.w).toEqual(late)
  })

  it('breaks review date ties by larger correct+wrong', () => {
    const few = { lemmaId: 'w', intervalDays: 1, nextReviewDate: '2026-11-14', correctCount: 1, wrongCount: 0 }
    const many = { lemmaId: 'w', intervalDays: 2, nextReviewDate: '2026-11-14', correctCount: 3, wrongCount: 2 }
    const m = mergeSnapshots(base({ reviews: { w: few } }), base({ reviews: { w: many } }))
    expect(m.reviews.w).toEqual(many)
  })

  it('takes the whole streak with the more recent lastActiveDate, longest is max', () => {
    const a = base({ streak: { current: 9, longest: 20, lastActiveDate: '2026-11-10' } })
    const b = base({ streak: { current: 2, longest: 5, lastActiveDate: '2026-11-12' } })
    expect(mergeSnapshots(a, b).streak).toEqual({ current: 2, longest: 20, lastActiveDate: '2026-11-12' })
  })

  it('breaks streak date ties by larger current', () => {
    const a = base({ streak: { current: 3, longest: 3, lastActiveDate: '2026-11-12' } })
    const b = base({ streak: { current: 4, longest: 4, lastActiveDate: '2026-11-12' } })
    expect(mergeSnapshots(a, b).streak.current).toBe(4)
  })

  it('weekXp: same week takes larger xp', () => {
    const m = mergeSnapshots(
      base({ weekXp: { week: '2026-W46', xp: 10 } }),
      base({ weekXp: { week: '2026-W46', xp: 25 } }),
    )
    expect(m.weekXp).toEqual({ week: '2026-W46', xp: 25 })
  })

  it('weekXp: different weeks takes the later week', () => {
    const m = mergeSnapshots(
      base({ weekXp: { week: '2026-W45', xp: 90 } }),
      base({ weekXp: { week: '2026-W46', xp: 5 } }),
    )
    expect(m.weekXp).toEqual({ week: '2026-W46', xp: 5 })
  })

  it('today: later date wins', () => {
    const m = mergeSnapshots(
      base({ today: { date: '2026-11-12', lessonsCompleted: 5 } }),
      base({ today: { date: '2026-11-13', lessonsCompleted: 1 } }),
    )
    expect(m.today).toEqual({ date: '2026-11-13', lessonsCompleted: 1 })
  })

  it('today: same date takes larger lessonsCompleted', () => {
    const m = mergeSnapshots(
      base({ today: { date: '2026-11-13', lessonsCompleted: 2 } }),
      base({ today: { date: '2026-11-13', lessonsCompleted: 3 } }),
    )
    expect(m.today.lessonsCompleted).toBe(3)
  })

  it('rest tokens and dailyGoal follow the later restTokenWeek', () => {
    const a = base({ restTokens: 1, restTokenWeek: '2026-W45', dailyGoal: 3 })
    const b = base({ restTokens: 0, restTokenWeek: '2026-W46', dailyGoal: 2 })
    const m = mergeSnapshots(a, b)
    expect(m).toMatchObject({ restTokens: 0, restTokenWeek: '2026-W46', dailyGoal: 2 })
  })

  it('is commutative', () => {
    const a = base({
      xp: 50,
      dailyGoal: 3,
      completed: { x: { completedAt: '2026-11-01', score: 7, perfect: false } },
      streak: { current: 4, longest: 9, lastActiveDate: '2026-11-12' },
      restTokens: 1,
      restTokenWeek: '2026-W46',
      today: { date: '2026-11-13', lessonsCompleted: 2 },
      reviews: { w: { lemmaId: 'w', intervalDays: 2, nextReviewDate: '2026-11-15', correctCount: 2, wrongCount: 1 } },
      weekXp: { week: '2026-W46', xp: 40 },
    })
    const b = base({
      xp: 70,
      dailyGoal: 2,
      completed: { x: { completedAt: '2026-11-03', score: 7, perfect: true }, y: { completedAt: '2026-11-02', score: 3, perfect: false } },
      streak: { current: 4, longest: 12, lastActiveDate: '2026-11-12' },
      restTokens: 0,
      restTokenWeek: '2026-W46',
      today: { date: '2026-11-13', lessonsCompleted: 2 },
      reviews: { w: { lemmaId: 'w', intervalDays: 3, nextReviewDate: '2026-11-15', correctCount: 1, wrongCount: 2 } },
      weekXp: { week: '2026-W46', xp: 40 },
    })
    expect(mergeSnapshots(a, b)).toEqual(mergeSnapshots(b, a))
  })

  it('merging with an empty snapshot returns the original', () => {
    const a = base({
      xp: 50,
      dailyGoal: 1,
      completed: { x: { completedAt: '2026-11-01', score: 7, perfect: false } },
      streak: { current: 4, longest: 9, lastActiveDate: '2026-11-12' },
      restTokens: 1,
      restTokenWeek: '2026-W46',
      today: { date: '2026-11-13', lessonsCompleted: 2 },
      reviews: { w: { lemmaId: 'w', intervalDays: 2, nextReviewDate: '2026-11-15', correctCount: 2, wrongCount: 1 } },
      weekXp: { week: '2026-W46', xp: 40 },
    })
    const e = emptySnapshot('2026-11-13')
    expect(mergeSnapshots(a, e)).toEqual(a)
    expect(mergeSnapshots(e, a)).toEqual(a)
  })

  it('does not mutate inputs', () => {
    const a = base({ xp: 1 })
    const b = base({ xp: 2 })
    const ca = structuredClone(a)
    const cb = structuredClone(b)
    mergeSnapshots(a, b)
    expect(a).toEqual(ca)
    expect(b).toEqual(cb)
  })
})
