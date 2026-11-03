'use client'

import { useCallback, useState } from 'react'
import type { LessonType } from '@/lib/content/schema'
import { useProgress } from './ProgressProvider'

/** Completes a lesson once and reports how much XP it earned. */
export function useLessonFinish(lesson: { id: string; type: LessonType }) {
  const { completeLesson, snapshot } = useProgress()
  const [xpBefore, setXpBefore] = useState<number | null>(null)
  const finish = useCallback((result: { score: number; perfect: boolean }, learned?: string[]) => {
    if (xpBefore !== null) return
    setXpBefore(snapshot.xp)
    completeLesson(lesson, result, learned)
  }, [completeLesson, xpBefore, lesson, snapshot.xp])
  return { finish, xpGained: xpBefore === null ? null : snapshot.xp - xpBefore }
}
