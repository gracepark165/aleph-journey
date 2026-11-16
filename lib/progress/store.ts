import { z } from 'zod'
import { emptySnapshot, type ProgressSnapshot } from './snapshot'

export const STORAGE_KEY = 'aleph-journey:progress'

export interface ProgressStore {
  load(today: string): ProgressSnapshot
  save(s: ProgressSnapshot): void
  /** Latest valid saved snapshot, or null when nothing valid is readable (missing, corrupt, storage blocked). */
  peek(): ProgressSnapshot | null
}

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const SnapshotSchema = z.object({
  version: z.literal(1),
  xp: z.number().int().nonnegative(),
  dailyGoal: z.number().int().positive(),
  completed: z.record(z.object({ completedAt: z.string(), score: z.number(), perfect: z.boolean() })),
  streak: z.object({ current: z.number().int().nonnegative(), longest: z.number().int().nonnegative(), lastActiveDate: DateStr.nullable() }),
  restTokens: z.number().int().nonnegative(),
  restTokenWeek: z.string().nullable(),
  today: z.object({ date: DateStr, lessonsCompleted: z.number().int().nonnegative() }),
  reviews: z.record(z.object({
    lemmaId: z.string(),
    intervalDays: z.number().int().positive(),
    nextReviewDate: DateStr,
    correctCount: z.number().int().nonnegative(),
    wrongCount: z.number().int().nonnegative(),
  })),
  weekXp: z.object({ week: z.string().nullable(), xp: z.number().int().nonnegative() }).default({ week: null, xp: 0 }),
})

/** Validate a snapshot from outside (e.g. the server); old ones get defaults, invalid ones are null. */
export function parseSnapshot(raw: unknown): ProgressSnapshot | null {
  const parsed = SnapshotSchema.safeParse(raw)
  return parsed.success ? (parsed.data as ProgressSnapshot) : null
}

export function createLocalStore(storage?: Storage): ProgressStore {
  const get = () => storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  const peek = (): ProgressSnapshot | null => {
    try {
      const raw = get()?.getItem(STORAGE_KEY)
      if (!raw) return null
      return parseSnapshot(JSON.parse(raw))
    } catch {
      return null
    }
  }
  return {
    peek,
    load: today => peek() ?? emptySnapshot(today),
    save(s) {
      try {
        get()?.setItem(STORAGE_KEY, JSON.stringify(s))
      } catch (e) {
        console.warn('진도를 저장하지 못했습니다', e)
      }
    },
  }
}
