'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { LessonType } from '@/lib/content/schema'
import { seoulDate } from './dates'
import { addLearned, recordReview } from './review'
import { emptySnapshot, type ProgressSnapshot } from './snapshot'
import { createLocalStore, type ProgressStore } from './store'
import { recordLessonComplete, startOfDay } from './streak'

export type ProgressApi = {
  ready: boolean
  snapshot: ProgressSnapshot
  today: string
  completeLesson(lesson: { id: string; type: LessonType }, result: { score: number; perfect: boolean }, learnedLemmaIds?: string[]): void
  reviewAnswered(lemmaId: string, correct: boolean): void
}

const ProgressContext = createContext<ProgressApi | null>(null)

export function ProgressProvider({ children, store, now = () => new Date() }: { children: ReactNode; store?: ProgressStore; now?: () => Date }) {
  const storeRef = useRef<ProgressStore>(store ?? createLocalStore())
  const nowRef = useRef(now)
  const [today, setToday] = useState(() => seoulDate(now()))
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>(() => emptySnapshot(today))
  const current = useRef(snapshot)
  const [ready, setReady] = useState(false)

  const commit = useCallback((next: ProgressSnapshot) => {
    current.current = next
    setSnapshot(next)
    storeRef.current.save(next)
  }, [])

  useEffect(() => {
    const day = seoulDate(nowRef.current())
    setToday(day)
    commit(startOfDay(storeRef.current.load(day), day))
    setReady(true)
  }, [commit])

  const completeLesson = useCallback<ProgressApi['completeLesson']>((lesson, result, learned = []) => {
    const t = nowRef.current()
    const day = seoulDate(t)
    setToday(day)
    commit(addLearned(recordLessonComplete(current.current, lesson, result, day, t.toISOString()), learned, day))
  }, [commit])

  const reviewAnswered = useCallback<ProgressApi['reviewAnswered']>((lemmaId, correct) => {
    const day = seoulDate(nowRef.current())
    commit(recordReview(current.current, lemmaId, correct, day))
  }, [commit])

  const api = useMemo(() => ({ ready, snapshot, today, completeLesson, reviewAnswered }), [ready, snapshot, today, completeLesson, reviewAnswered])
  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider')
  return ctx
}
