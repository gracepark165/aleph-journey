'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { LessonType } from '@/lib/content/schema'
import { INTRO_SEEN_KEY, parseUnlockParam, readFlag, REVIEW_MODE_KEY, writeFlag } from '@/lib/prefs'
import { seoulDate } from './dates'
import { addLearned, recordReview } from './review'
import { emptySnapshot, type ProgressSnapshot } from './snapshot'
import { createLocalStore, STORAGE_KEY, type ProgressStore } from './store'
import { recordLessonComplete, startOfDay } from './streak'

export type ProgressApi = {
  ready: boolean
  snapshot: ProgressSnapshot
  today: string
  completeLesson(lesson: { id: string; type: LessonType }, result: { score: number; perfect: boolean }, learnedLemmaIds?: string[]): void
  reviewAnswered(lemmaId: string, correct: boolean): void
  /** Review mode: every lesson open (?unlock=all). */
  unlockAll: boolean
  setUnlockAll(on: boolean): void
  /** Whether this browser has finished the intro; false until `ready`. */
  introSeen: boolean
  markIntroSeen(): void
}

const ProgressContext = createContext<ProgressApi | null>(null)

export function ProgressProvider({ children, store, now = () => new Date() }: { children: ReactNode; store?: ProgressStore; now?: () => Date }) {
  const storeRef = useRef<ProgressStore>(store ?? createLocalStore())
  const nowRef = useRef(now)
  const [today, setToday] = useState(() => seoulDate(now()))
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>(() => emptySnapshot(today))
  const current = useRef(snapshot)
  const [ready, setReady] = useState(false)
  const [unlockAll, setUnlockAllState] = useState(false)
  const [introSeen, setIntroSeen] = useState(false)

  const commit = useCallback((next: ProgressSnapshot) => {
    current.current = next
    setSnapshot(next)
    storeRef.current.save(next)
  }, [])

  /** Latest progress: what another tab saved, else our in-memory copy (e.g. when storage is blocked). */
  const latest = useCallback(() => storeRef.current.peek() ?? current.current, [])

  useEffect(() => {
    const day = seoulDate(nowRef.current())
    setToday(day)
    commit(startOfDay(storeRef.current.load(day), day))
    const param = parseUnlockParam(window.location.search)
    if (param) writeFlag(REVIEW_MODE_KEY, param === 'on')
    setUnlockAllState(param ? param === 'on' : readFlag(REVIEW_MODE_KEY))
    setIntroSeen(readFlag(INTRO_SEEN_KEY))
    setReady(true)
  }, [commit])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== STORAGE_KEY) return
      const fresh = storeRef.current.peek()
      if (fresh) {
        current.current = fresh
        setSnapshot(fresh)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const completeLesson = useCallback<ProgressApi['completeLesson']>((lesson, result, learned = []) => {
    const t = nowRef.current()
    const day = seoulDate(t)
    setToday(day)
    commit(addLearned(recordLessonComplete(latest(), lesson, result, day, t.toISOString()), learned, day))
  }, [commit, latest])

  const reviewAnswered = useCallback<ProgressApi['reviewAnswered']>((lemmaId, correct) => {
    const day = seoulDate(nowRef.current())
    commit(recordReview(latest(), lemmaId, correct, day))
  }, [commit, latest])

  const setUnlockAll = useCallback((on: boolean) => {
    writeFlag(REVIEW_MODE_KEY, on)
    setUnlockAllState(on)
  }, [])

  const markIntroSeen = useCallback(() => {
    writeFlag(INTRO_SEEN_KEY, true)
    setIntroSeen(true)
  }, [])

  const api = useMemo(
    () => ({ ready, snapshot, today, completeLesson, reviewAnswered, unlockAll, setUnlockAll, introSeen, markIntroSeen }),
    [ready, snapshot, today, completeLesson, reviewAnswered, unlockAll, setUnlockAll, introSeen, markIntroSeen],
  )
  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider')
  return ctx
}
