import { beforeEach, describe, expect, test, vi } from 'vitest'

type Result = { data: unknown; error: unknown; status?: number }
const ok = (data: unknown = null): Result => ({ data, error: null, status: 200 })

const auth = {
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  linkIdentity: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}
const rpc = vi.fn()
const from = vi.fn()
const createClient = vi.fn<(...args: unknown[]) => unknown>(() => ({ auth, rpc, from }))

vi.mock('@supabase/supabase-js', () => ({ createClient: (...args: unknown[]) => createClient(...args) }))

import { createSupabaseCloudApi } from '@/lib/cloud/supabase-api'
import { CloudError } from '@/lib/cloud/types'
import { PROFILE_KEY } from '@/lib/prefs'

const TICKET_KEY = 'aleph-journey:ticket'
const session = (id: string, isAnonymous: boolean) => ({ data: { session: { user: { id, is_anonymous: isAnonymous } } }, error: null })
const noSession = { data: { session: null }, error: null }

const api = () => createSupabaseCloudApi('https://x.supabase.co', 'anon-key')

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  auth.getSession.mockResolvedValue(session('guest-1', true))
  auth.signInAnonymously.mockResolvedValue({ data: { user: { id: 'anon-1', is_anonymous: true }, session: {} }, error: null })
  auth.linkIdentity.mockResolvedValue({ data: { provider: 'kakao', url: 'https://kauth' }, error: null })
  auth.signInWithOAuth.mockResolvedValue({ data: { provider: 'kakao', url: 'https://kauth' }, error: null })
  auth.signOut.mockResolvedValue({ error: null })
  rpc.mockResolvedValue(ok())
})

describe('createSupabaseCloudApi', () => {
  test('creates one client with the given url and anon key', () => {
    api()
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient.mock.calls[0][0]).toBe('https://x.supabase.co')
    expect(createClient.mock.calls[0][1]).toBe('anon-key')
  })

  test('ensureSession signs in anonymously once when there is no session', async () => {
    auth.getSession.mockResolvedValue(noSession)
    expect(await api().ensureSession()).toEqual({ id: 'anon-1', isGuest: true })
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1)
  })

  test('ensureSession reuses an existing Kakao session', async () => {
    auth.getSession.mockResolvedValue(session('kakao-1', false))
    expect(await api().ensureSession()).toEqual({ id: 'kakao-1', isGuest: false })
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })

  test('ensureProfile maps the profile row', async () => {
    rpc.mockResolvedValue(ok({ user_id: 'u', nickname: '룻', avatar_id: 'naomi', friend_code: 'ALEF-AB23' }))
    expect(await api().ensureProfile({ nickname: '룻', avatarId: 'naomi' })).toEqual({ nickname: '룻', avatarId: 'naomi', friendCode: 'ALEF-AB23' })
    expect(rpc).toHaveBeenCalledWith('ensure_profile', { p_nickname: '룻', p_avatar_id: 'naomi' })
  })

  test('add_friend error message maps to CloudError code', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'self', code: 'P0001' }, status: 400 })
    const err = await api().addFriend('ALEF-ME22').catch(e => e)
    expect(err).toBeInstanceOf(CloudError)
    expect(err.code).toBe('self')
  })

  test('addFriend returns the friend summary', async () => {
    rpc.mockResolvedValue(ok([{ user_id: 'f1', nickname: '다윗', avatar_id: 'saul' }]))
    expect(await api().addFriend('ALEF-DEMO')).toEqual({ userId: 'f1', nickname: '다윗', avatarId: 'saul' })
    expect(rpc).toHaveBeenCalledWith('add_friend', { p_code: 'ALEF-DEMO' })
  })

  test('fetch failure maps to network', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 })
    const err = await api().leaderboard('2026-W46').catch(e => e)
    expect(err.code).toBe('network')
    rpc.mockRejectedValue(new TypeError('Failed to fetch'))
    expect((await api().removeFriend('f1').catch(e => e)).code).toBe('network')
  })

  test('unknown errors map to unknown', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'invalid_week' }, status: 400 })
    expect((await api().recordXp('2020-W01', 5, 1).catch(e => e)).code).toBe('unknown')
  })

  test('leaderboard maps rows', async () => {
    rpc.mockResolvedValue(ok([{ user_id: 'u', nickname: '룻', avatar_id: 'naomi', total_xp: 10, week_xp: 5, streak: 2, is_me: true, crown: false }]))
    expect(await api().leaderboard('2026-W46')).toEqual([{ userId: 'u', nickname: '룻', avatarId: 'naomi', totalXp: 10, weekXp: 5, streak: 2, isMe: true, crown: false }])
    expect(rpc).toHaveBeenCalledWith('friend_leaderboard', { p_week: '2026-W46' })
  })

  test('profileByCode returns null when nothing matches', async () => {
    rpc.mockResolvedValue(ok([]))
    expect(await api().profileByCode('ALEF-ZZZZ')).toBeNull()
  })

  test('connectKakao stores a ticket for the guest, then links Kakao', async () => {
    rpc.mockResolvedValue(ok('t-123'))
    await api().connectKakao('/profile')
    expect(rpc).toHaveBeenCalledWith('create_transfer_ticket')
    expect(JSON.parse(sessionStorage.getItem(TICKET_KEY)!)).toEqual({ ticket: 't-123', guestId: 'guest-1' })
    expect(auth.linkIdentity).toHaveBeenCalledWith({
      provider: 'kakao',
      options: { redirectTo: `${location.origin}/auth/callback?next=%2Fprofile`, scopes: 'profile_nickname profile_image' },
    })
    expect(auth.signInWithOAuth).not.toHaveBeenCalled()
    // the ticket was saved before the redirect started
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(auth.linkIdentity.mock.invocationCallOrder[0])
  })

  test('connectKakao falls back to Kakao sign-in when the identity already exists, keeping the ticket', async () => {
    rpc.mockResolvedValue(ok('t-123'))
    auth.linkIdentity.mockResolvedValue({ data: null, error: { message: 'Identity is already linked to another user', code: 'identity_already_exists', status: 422 } })
    await api().connectKakao('/profile')
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'kakao',
      options: { redirectTo: `${location.origin}/auth/callback?next=%2Fprofile`, scopes: 'profile_nickname profile_image' },
    })
    expect(sessionStorage.getItem(TICKET_KEY)).not.toBeNull()
  })

  test('connectKakao does not ask for a ticket when already a Kakao user', async () => {
    auth.getSession.mockResolvedValue(session('kakao-1', false))
    await api().connectKakao('/')
    expect(rpc).not.toHaveBeenCalledWith('create_transfer_ticket')
    expect(sessionStorage.getItem(TICKET_KEY)).toBeNull()
  })

  test('finishAuth absorbs the guest when the ticket came from another user', async () => {
    sessionStorage.setItem(TICKET_KEY, JSON.stringify({ ticket: 't-123', guestId: 'guest-1' }))
    auth.getSession.mockResolvedValue(session('kakao-1', false))
    expect(await api().finishAuth()).toEqual({ absorbed: true })
    expect(rpc).toHaveBeenCalledWith('absorb_guest', { p_ticket: 't-123' })
    expect(sessionStorage.getItem(TICKET_KEY)).toBeNull()
  })

  test('finishAuth does not absorb when the same user linked Kakao', async () => {
    sessionStorage.setItem(TICKET_KEY, JSON.stringify({ ticket: 't-123', guestId: 'guest-1' }))
    auth.getSession.mockResolvedValue(session('guest-1', false))
    expect(await api().finishAuth()).toEqual({ absorbed: false })
    expect(rpc).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(TICKET_KEY)).toBeNull()
  })

  test('finishAuth clears the ticket even when absorbing fails', async () => {
    sessionStorage.setItem(TICKET_KEY, JSON.stringify({ ticket: 't-123', guestId: 'guest-1' }))
    auth.getSession.mockResolvedValue(session('kakao-1', false))
    rpc.mockResolvedValue({ data: null, error: { message: 'invalid_ticket' }, status: 400 })
    expect((await api().finishAuth().catch(e => e)).code).toBe('invalid_ticket')
    expect(sessionStorage.getItem(TICKET_KEY)).toBeNull()
  })

  test('deleteAccount deletes, signs out and forgets the local profile only', async () => {
    localStorage.setItem(PROFILE_KEY, '{"nickname":"룻","avatarId":"naomi"}')
    localStorage.setItem('other', 'kept')
    await api().deleteAccount()
    expect(rpc).toHaveBeenCalledWith('delete_my_account')
    expect(auth.signOut).toHaveBeenCalled()
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(auth.signOut.mock.invocationCallOrder[0])
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull()
    expect(localStorage.getItem('other')).toBe('kept')
  })

  test('pushProgress upserts my snapshot and pullProgress reads it back', async () => {
    const upsert = vi.fn().mockResolvedValue(ok())
    const maybeSingle = vi.fn().mockResolvedValue(ok({ snapshot: { xp: 3 } }))
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    from.mockReturnValue({ upsert, select })
    const a = api()
    await a.pushProgress({ xp: 3 } as never)
    expect(from).toHaveBeenCalledWith('progress')
    expect(upsert.mock.calls[0][0]).toMatchObject({ user_id: 'guest-1', snapshot: { xp: 3 } })
    expect(await a.pullProgress()).toEqual({ xp: 3 })
    expect(eq).toHaveBeenCalledWith('user_id', 'guest-1')
  })
})
