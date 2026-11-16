'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Profile } from '@/lib/profile'
import { isoWeek, previousIsoWeek } from '@/lib/progress/dates'
import { mergeSnapshots } from '@/lib/progress/merge'
import { PROFILE_DIRTY_KEY, readFlag, writeFlag } from '@/lib/prefs'
import { useProgress } from '@/lib/progress/ProgressProvider'
import type { ProgressSnapshot } from '@/lib/progress/snapshot'
import { parseSnapshot } from '@/lib/progress/store'
import { createCloudApi } from './config'
import { enqueue, flush, type XpEvent } from './outbox'
import { CloudError, type CloudApi, type CloudProfile, type CloudUser, type FriendSummary, type LeaderboardRow } from './types'

export type CloudStatus = 'off' | 'connecting' | 'ready' | 'error'
export type LeaderboardState = 'idle' | 'loading' | 'ready' | 'error' | 'offline'

export type CloudContextValue = {
  status: CloudStatus
  user: CloudUser | null
  profile: CloudProfile | null
  leaderboard: { rows: LeaderboardRow[]; state: LeaderboardState }
  refreshLeaderboard(): Promise<void>
  lookupCode(code: string): Promise<(FriendSummary & { isMe: boolean }) | null>
  addFriend(code: string): Promise<FriendSummary>
  removeFriend(userId: string): Promise<void>
  connectKakao(): Promise<void>
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
}

const noop = async () => {}

/** What useCloud() returns without a provider or without a configured backend. */
const OFF: CloudContextValue = {
  status: 'off',
  user: null,
  profile: null,
  leaderboard: { rows: [], state: 'idle' },
  refreshLeaderboard: noop,
  lookupCode: async () => null,
  addFriend: async () => { throw new CloudError('unknown', 'cloud is off') },
  removeFriend: noop,
  connectKakao: noop,
  signOut: noop,
  deleteAccount: noop,
}

const CloudContext = createContext<CloudContextValue>(OFF)

export { PROFILE_DIRTY_KEY }

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
const sameProfile = (a: Profile | null, b: Profile | null) =>
  !!a && !!b && a.nickname === b.nickname && a.avatarId === b.avatarId

/**
 * The server rejects XP events below 1 and weeks before the previous one: drop those from the outbox
 * without sending. Other rejections (invalid_week/invalid_gained) are dropped by the outbox itself.
 */
const sender = (api: CloudApi, today: () => string) => (ev: XpEvent) =>
  ev.gained < 1 || ev.week < previousIsoWeek(isoWeek(today()))
    ? Promise.resolve()
    : api.recordXp(ev.week, ev.gained, ev.streak)

export function CloudProvider({
  children,
  api: apiProp,
  pushDelayMs = 1000,
}: {
  children: ReactNode
  /** Omit to use createCloudApi() (resolved on the client after mount); null turns the cloud off. */
  api?: CloudApi | null
  pushDelayMs?: number
}) {
  const progress = useProgress()
  const { ready, profile: localProfile, setProfile, subscribe } = progress

  const [api, setApi] = useState<CloudApi | null | undefined>(apiProp)
  const [status, setStatus] = useState<CloudStatus>('off')
  const [user, setUser] = useState<CloudUser | null>(null)
  const [cloudProfile, setCloudProfile] = useState<CloudProfile | null>(null)
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [boardState, setBoardState] = useState<LeaderboardState>('idle')

  /** Latest progress API for async steps that outlive a render. */
  const progressRef = useRef(progress)
  useEffect(() => { progressRef.current = progress })

  const running = useRef(false)
  const started = useRef(false)
  /** Profile as the server last returned it; a local profile equal to it is not pushed back. */
  const serverProfile = useRef<Profile | null>(null)
  /** Profile currently being sent with updateProfile, so re-renders don't resend it. */
  const profileInFlight = useRef<Profile | null>(null)
  const lastSnap = useRef<ProgressSnapshot | null>(null)
  const pushPending = useRef(false)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (apiProp === undefined) setApi(createCloudApi())
    else setApi(apiProp)
  }, [apiProp])

  const loadLeaderboard = useCallback(async (a: CloudApi) => {
    setBoardState('loading')
    try {
      setRows(await a.leaderboard(isoWeek(progressRef.current.today)))
      setBoardState('ready')
    } catch (e) {
      setBoardState(isOffline() ? 'offline' : 'error')
      throw e
    }
  }, [])

  const pushNow = useCallback(async (a: CloudApi) => {
    const s = lastSnap.current ?? progressRef.current.snapshot
    try {
      await flush(sender(a, () => progressRef.current.today))
      await a.pushProgress(s)
      await loadLeaderboard(a)
    } catch (e) {
      console.warn('cloud sync failed', e)
    }
  }, [loadLeaderboard])

  const schedulePush = useCallback((a: CloudApi) => {
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null
      if (!started.current) { pushPending.current = true; return }
      void pushNow(a)
    }, pushDelayMs)
  }, [pushDelayMs, pushNow])

  /** ensureSession → ensureProfile → server profile wins → pull/merge → push → outbox → leaderboard. One at a time. */
  const start = useCallback(async (a: CloudApi) => {
    if (running.current || started.current) return
    running.current = true
    setStatus('connecting')
    try {
      setUser(await a.ensureSession())
      const cp = await a.ensureProfile(progressRef.current.profile)
      const server = { nickname: cp.nickname, avatarId: cp.avatarId }
      serverProfile.current = server
      setCloudProfile(cp)
      // Server wins, unless a local edit never reached it: then the profile effect pushes the local one.
      const keepLocal = readFlag(PROFILE_DIRTY_KEY)
      if (!keepLocal && !sameProfile(progressRef.current.profile, server)) progressRef.current.setProfile(server)

      const remote = parseSnapshot(await a.pullProgress())
      // A lesson committed while the pull was in flight is in lastSnap (set synchronously by the
      // listener) before progressRef catches up; merging both keeps whichever is newer.
      const rendered = progressRef.current.snapshot
      let merged = lastSnap.current ? mergeSnapshots(rendered, lastSnap.current) : rendered
      if (remote) merged = mergeSnapshots(merged, remote)
      if (merged !== rendered) progressRef.current.replaceSnapshot(merged)
      lastSnap.current = merged
      await a.pushProgress(merged)
      await flush(sender(a, () => progressRef.current.today))
      await loadLeaderboard(a)
      started.current = true
      setStatus('ready')
      if (pushPending.current) {
        pushPending.current = false
        schedulePush(a)
      }
    } catch (e) {
      console.warn('cloud startup failed', e)
      setStatus('error')
      setBoardState(isOffline() ? 'offline' : 'error')
    } finally {
      running.current = false
    }
  }, [loadLeaderboard, schedulePush])

  /** Before startup has succeeded (e.g. the user taps "다시 시도" after an error), this retries the whole startup. */
  const refreshLeaderboard = useCallback(async () => {
    if (!api) return
    if (!started.current) { await start(api); return }
    try { await loadLeaderboard(api) } catch (e) { console.warn('leaderboard failed', e) }
  }, [api, loadLeaderboard, start])

  // Startup once progress is loaded; retry when the browser comes back online.
  useEffect(() => {
    if (!api || !ready) return
    void start(api)
    const onOnline = () => { void start(api) }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [api, ready, start])

  // Lesson/review commits: queue XP, flush, and push progress (debounced).
  useEffect(() => {
    if (!api) return
    const unsubscribe = subscribe((s, ev) => {
      lastSnap.current = s
      if (ev && ev.gained >= 1) enqueue(ev)
      if (started.current && ev) void flush(sender(api, () => progressRef.current.today))
      schedulePush(api)
    })
    return () => {
      unsubscribe()
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [api, subscribe, schedulePush])

  // Local profile edits go to the server; the server→local overwrite is equal to serverProfile and is skipped.
  useEffect(() => {
    if (!api || status !== 'ready' || !serverProfile.current) return
    if (sameProfile(localProfile, serverProfile.current)) { writeFlag(PROFILE_DIRTY_KEY, false); return }
    if (sameProfile(localProfile, profileInFlight.current)) return
    const sent = { nickname: localProfile.nickname, avatarId: localProfile.avatarId }
    profileInFlight.current = sent
    writeFlag(PROFILE_DIRTY_KEY, true)
    api.updateProfile(sent).then(cp => {
      if (sameProfile(profileInFlight.current, sent)) profileInFlight.current = null
      const server = { nickname: cp.nickname, avatarId: cp.avatarId }
      serverProfile.current = server
      setCloudProfile(cp)
      // Apply the server's version (e.g. a cleaned nickname) only if the user hasn't edited again meanwhile.
      if (sameProfile(progressRef.current.profile, sent)) {
        writeFlag(PROFILE_DIRTY_KEY, false)
        if (!sameProfile(sent, server)) setProfile(server)
      }
    }, e => {
      // Not synced: serverProfile is untouched and the dirty flag stays, so the next change or startup retries.
      if (sameProfile(profileInFlight.current, sent)) profileInFlight.current = null
      console.warn('profile update failed', e)
    })
  }, [api, status, localProfile, setProfile])

  const reset = useCallback(() => {
    started.current = false
    serverProfile.current = null
    profileInFlight.current = null
    setUser(null)
    setCloudProfile(null)
    setRows([])
    setBoardState('idle')
  }, [])

  const value = useMemo<CloudContextValue>(() => {
    if (!api) return OFF
    return {
      status,
      user,
      profile: cloudProfile,
      leaderboard: { rows, state: boardState },
      refreshLeaderboard,
      lookupCode: code => api.profileByCode(code),
      async addFriend(code) {
        const f = await api.addFriend(code)
        void refreshLeaderboard()
        return f
      },
      async removeFriend(id) {
        await api.removeFriend(id)
        void refreshLeaderboard()
      },
      connectKakao: () => api.connectKakao(window.location.pathname + window.location.search),
      async signOut() {
        await api.signOut()
        reset()
        void start(api)
      },
      async deleteAccount() {
        await api.deleteAccount()
        reset()
        void start(api)
      },
    }
  }, [api, status, user, cloudProfile, rows, boardState, refreshLeaderboard, reset, start])

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}

/** Cloud session, profile and leaderboard; a safe 'off' value outside a CloudProvider. */
export function useCloud(): CloudContextValue {
  return useContext(CloudContext)
}
