import { createClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/profile'
import { PROFILE_KEY, TICKET_KEY } from '@/lib/prefs'
import type { ProgressSnapshot } from '@/lib/progress/snapshot'
import { CloudError, type CloudApi, type CloudErrorCode, type CloudProfile, type CloudUser, type FriendSummary, type LeaderboardRow } from './types'

const KAKAO_SCOPES = 'profile_nickname profile_image'
const KNOWN: CloudErrorCode[] = ['not_found', 'self', 'already', 'invalid_ticket', 'not_guest', 'invalid_week', 'invalid_gained', 'rate_limited']
/** A request that hangs longer than this fails (as a network error) instead of loading forever. */
const REQUEST_TIMEOUT_MS = 10_000
/** Matches the server ticket lifetime (create_transfer_ticket). */
const TICKET_TTL_MS = 10 * 60_000

type Ticket = { ticket: string; guestId: string; expiresAt: number }
type ProfileRow = { nickname: string | null; avatar_id: string | null; friend_code: string }
type FriendRow = { user_id: string; nickname: string | null; avatar_id: string | null }
type CodeRow = { nickname: string | null; avatar_id: string | null; is_me: boolean }
type BoardRow = FriendRow & { total_xp: number; week_xp: number; streak: number; is_me: boolean; crown: boolean }

/** Maps a supabase-js error (or thrown value) to a CloudError. `status` is the response status when known. */
function toCloudError(e: unknown, status?: number): CloudError {
  if (e instanceof CloudError) return e
  if (e instanceof TypeError) return new CloudError('network', e.message)
  const err = (e ?? {}) as { message?: unknown; status?: unknown; name?: unknown }
  const message = typeof err.message === 'string' ? err.message : ''
  if (KNOWN.includes(message as CloudErrorCode)) return new CloudError(message as CloudErrorCode)
  if (status === 0 || err.status === 0 || err.name === 'AuthRetryableFetchError' || err.name === 'TimeoutError' || err.name === 'AbortError') {
    return new CloudError('network', message)
  }
  return new CloudError('unknown', message || 'unknown')
}

const toProfile = (row: ProfileRow, fallback: Profile): CloudProfile => ({
  nickname: row.nickname ?? fallback.nickname,
  avatarId: row.avatar_id ?? fallback.avatarId,
  friendCode: row.friend_code,
})
const toFriend = (r: FriendRow): FriendSummary => ({ userId: r.user_id, nickname: r.nickname ?? '', avatarId: r.avatar_id ?? '' })

/**
 * The guest transfer ticket lives in localStorage (the Kakao app handoff may come back in a new tab,
 * which would not see sessionStorage) and expires with the server ticket. Expired or malformed: cleared.
 */
function readTicket(): Omit<Ticket, 'expiresAt'> | null {
  try {
    const t = JSON.parse(window.localStorage.getItem(TICKET_KEY) ?? 'null') as Ticket | null
    if (t && typeof t.ticket === 'string' && typeof t.guestId === 'string' && typeof t.expiresAt === 'number' && t.expiresAt > Date.now()) {
      return { ticket: t.ticket, guestId: t.guestId }
    }
    if (t) clearTicket()
    return null
  } catch {
    return null
  }
}
function writeTicket(t: Omit<Ticket, 'expiresAt'>): void {
  try {
    window.localStorage.setItem(TICKET_KEY, JSON.stringify({ ...t, expiresAt: Date.now() + TICKET_TTL_MS }))
  } catch { /* storage blocked: no merge after login */ }
}
function clearTicket(): void {
  try { window.localStorage.removeItem(TICKET_KEY) } catch { /* storage blocked */ }
}

/** fetch with a default timeout, so a hanging request ends in an error instead of a spinner forever. */
const timedFetch: typeof fetch = (input, init) => {
  const canTimeout = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
  const signal = init?.signal ?? (canTimeout ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined)
  return fetch(input, signal ? { ...init, signal } : init)
}

const kakaoOptions = (returnTo: string) => ({
  redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
  scopes: KAKAO_SCOPES,
})

/** The real backend: Supabase auth (anonymous + Kakao) and the RPCs in supabase/migrations. Uses only the anon key. */
export function createSupabaseCloudApi(url: string, anonKey: string): CloudApi {
  const sb = createClient(url, anonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { fetch: timedFetch },
  })

  async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    let res: { data: unknown; error: unknown; status?: number }
    try {
      res = args === undefined ? await sb.rpc(fn) : await sb.rpc(fn, args)
    } catch (e) {
      throw toCloudError(e)
    }
    if (res.error) throw toCloudError(res.error, res.status)
    return res.data as T
  }

  async function currentUser() {
    let res
    try { res = await sb.auth.getSession() } catch (e) { throw toCloudError(e) }
    if (res.error) throw toCloudError(res.error)
    return res.data.session?.user ?? null
  }

  async function requireUser() {
    const user = await currentUser()
    if (!user) throw new CloudError('unknown', 'unauthenticated')
    return user
  }

  async function continueKakaoLogin(returnTo: string): Promise<void> {
    let res
    try { res = await sb.auth.signInWithOAuth({ provider: 'kakao', options: kakaoOptions(returnTo) }) } catch (e) { throw toCloudError(e) }
    if (res.error) throw toCloudError(res.error)
  }

  return {
    async ensureSession(): Promise<CloudUser> {
      const existing = await currentUser()
      if (existing) return { id: existing.id, isGuest: !!existing.is_anonymous }
      let res
      try { res = await sb.auth.signInAnonymously() } catch (e) { throw toCloudError(e) }
      if (res.error || !res.data.user) throw toCloudError(res.error)
      return { id: res.data.user.id, isGuest: !!res.data.user.is_anonymous }
    },
    async ensureProfile(p) {
      return toProfile(await call<ProfileRow>('ensure_profile', { p_nickname: p.nickname, p_avatar_id: p.avatarId }), p)
    },
    async updateProfile(p) {
      return toProfile(await call<ProfileRow>('update_profile', { p_nickname: p.nickname, p_avatar_id: p.avatarId }), p)
    },
    async pullProgress() {
      const user = await requireUser()
      let res
      try {
        res = await sb.from('progress').select('snapshot').eq('user_id', user.id).maybeSingle()
      } catch (e) { throw toCloudError(e) }
      if (res.error) throw toCloudError(res.error, res.status)
      return ((res.data as { snapshot: ProgressSnapshot } | null)?.snapshot) ?? null
    },
    async pushProgress(snapshot) {
      const user = await requireUser()
      let res
      try {
        res = await sb.from('progress').upsert(
          { user_id: user.id, snapshot, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
      } catch (e) { throw toCloudError(e) }
      if (res.error) throw toCloudError(res.error, res.status)
    },
    async recordXp(week, gained, streak) {
      await call('record_xp', { p_week: week, p_gained: gained, p_streak: streak })
    },
    async leaderboard(week): Promise<LeaderboardRow[]> {
      const rows = (await call<BoardRow[] | null>('friend_leaderboard', { p_week: week })) ?? []
      return rows.map(r => ({
        ...toFriend(r),
        totalXp: r.total_xp ?? 0,
        weekXp: r.week_xp ?? 0,
        streak: r.streak ?? 0,
        isMe: !!r.is_me,
        crown: !!r.crown,
      }))
    },
    async profileByCode(code) {
      const rows = (await call<CodeRow[] | null>('profile_by_code', { p_code: code })) ?? []
      const r = rows[0]
      if (!r) return null
      // The RPC does not expose the user id; callers use the code to add the friend.
      return { userId: '', nickname: r.nickname ?? '', avatarId: r.avatar_id ?? '', isMe: !!r.is_me }
    },
    async addFriend(code) {
      const rows = (await call<FriendRow[] | null>('add_friend', { p_code: code })) ?? []
      // No row: unknown code (the server returns nothing instead of raising, so the miss is counted for the rate limit).
      if (!rows[0]) throw new CloudError('not_found')
      return toFriend(rows[0])
    },
    async removeFriend(userId) {
      await call('remove_friend', { p_user: userId })
    },
    async connectKakao(returnTo) {
      const user = await currentUser()
      // Only a guest gets a ticket: the RPC raises not_guest for everyone else.
      if (user?.is_anonymous) {
        const ticket = await call<string>('create_transfer_ticket')
        writeTicket({ ticket, guestId: user.id })
      } else {
        clearTicket()
      }
      const options = kakaoOptions(returnTo)
      let res
      try { res = await sb.auth.linkIdentity({ provider: 'kakao', options }) } catch (e) { throw toCloudError(e) }
      if (!res.error) return
      const err = res.error as { code?: string }
      if (err.code !== 'identity_already_exists') throw toCloudError(res.error)
      // This Kakao account already has its own user: sign in as it; finishAuth absorbs the guest with the ticket.
      await continueKakaoLogin(returnTo)
    },
    continueKakaoLogin,
    async finishAuth() {
      try {
        const user = await currentUser()
        const t = readTicket()
        if (!user || !t || t.guestId === user.id) return { absorbed: false }
        await call('absorb_guest', { p_ticket: t.ticket })
        return { absorbed: true }
      } finally {
        clearTicket()
      }
    },
    async signOut() {
      let res
      // Only this device: other devices of the same (Kakao) account stay signed in.
      try { res = await sb.auth.signOut({ scope: 'local' }) } catch (e) { throw toCloudError(e) }
      if (res.error) throw toCloudError(res.error)
    },
    async deleteAccount() {
      await call('delete_my_account')
      // The user no longer exists on the server: only drop the local session.
      try { await sb.auth.signOut({ scope: 'local' }) } catch { /* session is gone either way */ }
      try { window.localStorage.removeItem(PROFILE_KEY) } catch { /* storage blocked */ }
    },
  }
}
