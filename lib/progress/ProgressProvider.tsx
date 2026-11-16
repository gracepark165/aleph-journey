'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { LessonType } from '@/lib/content/schema'
import { INTRO_SEEN_KEY, parseUnlockParam, PROFILE_KEY, readFlag, readJson, REVIEW_MODE_KEY, writeFlag, writeJson } from '@/lib/prefs'
import { AVATARS, cleanNickname, DEFAULT_PROFILE, type Profile } from '@/lib/profile'
import type { XpEvent } from '@/lib/cloud/outbox'
import { isoWeek, seoulDate } from './dates'
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
  profile: Profile
  setProfile(p: Profile): void
  /** Called on every progress commit from lessons/reviews (`ev` is null for reviews), never on replaceSnapshot. */
  subscribe(listener: (s: ProgressSnapshot, ev: XpEvent | null) => void): () => void
  /** Apply a merged snapshot (saved, listeners not called). */
  replaceSnapshot(s: ProgressSnapshot): void
}

type Listener = (s: ProgressSnapshot, ev: XpEvent | null) => void

function loadProfile(): Profile {
  const raw = readJson(PROFILE_KEY) as Partial<Profile> | null
  const nickname = typeof raw?.nickname === 'string' ? cleanNickname(raw.nickname) : ''
  const avatarId = AVATARS.some(a => a.id === raw?.avatarId) ? (raw!.avatarId as string) : DEFAULT_PROFILE.avatarId
  return { nickname: nickname || DEFAULT_PROFILE.nickname, avatarId }
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
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE)

  const listeners = useRef(new Set<Listener>())

  /** A failing listener (e.g. cloud sync) must never reach the lesson UI or skip other listeners. */
  const notify = useCallback((s: ProgressSnapshot, ev: XpEvent | null) => {
    listeners.current.forEach(l => {
      try { l(s, ev) } catch (e) { console.warn('progress listener failed', e) }
    })
  }, [])

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
    setProfileState(loadProfile())
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
    const base = latest()
    const next = addLearned(recordLessonComplete(base, lesson, result, day, t.toISOString()), learned, day)
    commit(next)
    const ev: XpEvent = { week: isoWeek(day), gained: next.xp - base.xp, streak: next.streak.current }
    notify(next, ev)
  }, [commit, latest, notify])

  const reviewAnswered = useCallback<ProgressApi['reviewAnswered']>((lemmaId, correct) => {
    const day = seoulDate(nowRef.current())
    const next = recordReview(latest(), lemmaId, correct, day)
    commit(next)
    notify(next, null)
  }, [commit, latest, notify])

  const subscribe = useCallback<ProgressApi['subscribe']>(listener => {
    listeners.current.add(listener)
    return () => { listeners.current.delete(listener) }
  }, [])

  const replaceSnapshot = useCallback<ProgressApi['replaceSnapshot']>(s => commit(s), [commit])

  const setUnlockAll = useCallback((on: boolean) => {
    writeFlag(REVIEW_MODE_KEY, on)
    setUnlockAllState(on)
  }, [])

  const markIntroSeen = useCallback(() => {
    writeFlag(INTRO_SEEN_KEY, true)
    setIntroSeen(true)
  }, [])

  const setProfile = useCallback((p: Profile) => {
    writeJson(PROFILE_KEY, p)
    setProfileState(p)
  }, [])

  const api = useMemo(
    () => ({ ready, snapshot, today, completeLesson, reviewAnswered, unlockAll, setUnlockAll, introSeen, markIntroSeen, profile, setProfile, subscribe, replaceSnapshot }),
    [ready, snapshot, today, completeLesson, reviewAnswered, unlockAll, setUnlockAll, introSeen, markIntroSeen, profile, setProfile, subscribe, replaceSnapshot],
  )
  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider')
  return ctx
}
