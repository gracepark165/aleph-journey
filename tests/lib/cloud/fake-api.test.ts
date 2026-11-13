import { describe, expect, it } from 'vitest'
import { createFakeCloudApi } from '@/lib/cloud/fake-api'
import { CloudError } from '@/lib/cloud/types'
import { addDays, isoWeek, seoulDate } from '@/lib/progress/dates'

const WEEK = isoWeek(seoulDate(new Date()))
const LAST_WEEK = isoWeek(addDays(seoulDate(new Date()), -7))
const me = { nickname: '나', avatarId: 'zoe' }

async function setup() {
  const api = createFakeCloudApi(window.localStorage)
  await api.ensureSession()
  const profile = await api.ensureProfile(me)
  return { api, profile }
}
const codeOf = async (p: Promise<unknown>) => p.then(() => null, (e: CloudError) => e.code)

describe('fake cloud api', () => {
  it('continueKakaoLogin makes the user a non-guest', async () => {
    window.localStorage.clear()
    const api = createFakeCloudApi(window.localStorage)
    expect((await api.ensureSession()).isGuest).toBe(true)
    await api.continueKakaoLogin('/')
    expect((await api.ensureSession()).isGuest).toBe(false)
  })

  it('returns the same user id across calls', async () => {
    const api = createFakeCloudApi(window.localStorage)
    expect((await api.ensureSession()).id).toBe((await api.ensureSession()).id)
  })

  it('adds the demo friend case-insensitively and ranks them', async () => {
    const { api } = await setup()
    const friend = await api.addFriend('alef-demo')
    expect(friend.nickname).toBe('다윗')
    expect(friend.avatarId).toBe('saul')
    const rows = await api.leaderboard(WEEK)
    expect(rows.map(r => [r.nickname, r.weekXp, r.isMe])).toEqual([['다윗', 120, false], ['나', 0, true]])
  })

  it('rejects duplicates, own code and unknown codes', async () => {
    const { api, profile } = await setup()
    await api.addFriend('ALEF-DEMO')
    expect(await codeOf(api.addFriend('ALEF-DEMO'))).toBe('already')
    expect(await codeOf(api.addFriend(profile.friendCode))).toBe('self')
    expect(await codeOf(api.addFriend('ALEF-ZZZZ'))).toBe('not_found')
  })

  it('caps recordXp like the server', async () => {
    const { api } = await setup()
    expect(await codeOf(api.recordXp(WEEK, 31, 1))).toBe('invalid_gained')
    await expect(api.recordXp(WEEK, 30, 1)).resolves.toBeUndefined()
    expect((await api.leaderboard(WEEK))[0].weekXp).toBe(30)
  })

  it('rejects weeks other than this one and the previous one, like the server', async () => {
    const { api } = await setup()
    expect(await codeOf(api.recordXp('2020-W01', 5, 1))).toBe('invalid_week')
    await expect(api.recordXp(LAST_WEEK, 5, 1)).resolves.toBeUndefined()
  })

  it('removes friends and deletes the account', async () => {
    const { api } = await setup()
    const f = await api.addFriend('ALEF-DEMO')
    await api.removeFriend(f.userId)
    expect(await api.leaderboard(WEEK)).toHaveLength(1)
    await api.deleteAccount()
    expect(window.localStorage.length).toBe(0)
  })

  it('rejects gained 0 and non-integers, and caps the week at 2100', async () => {
    const { api } = await setup()
    expect(await codeOf(api.recordXp(WEEK, 0, 1))).toBe('invalid_gained')
    expect(await codeOf(api.recordXp(WEEK, 1.5, 1))).toBe('invalid_gained')
    for (let i = 0; i < 71; i++) await api.recordXp(WEEK, 30, 1)
    expect((await api.leaderboard(WEEK))[0].weekXp).toBe(2100)
  })

  it('breaks weekXp ties by streak, then nickname', async () => {
    const api = createFakeCloudApi(window.localStorage)
    await api.ensureSession()
    await api.ensureProfile({ nickname: '가', avatarId: 'zoe' })
    await api.addFriend('ALEF-DEMO')
    await api.recordXp(WEEK, 30, 1)
    await api.recordXp(WEEK, 30, 1)
    await api.recordXp(WEEK, 30, 1)
    await api.recordXp(WEEK, 30, 1) // 120 xp, streak 1 vs demo streak 6
    expect((await api.leaderboard(WEEK)).map(r => r.nickname)).toEqual(['다윗', '가'])
  })

  it('orders by nickname when xp and streak tie', async () => {
    const api = createFakeCloudApi(window.localStorage)
    await api.ensureSession()
    await api.ensureProfile({ nickname: '가', avatarId: 'zoe' })
    await api.addFriend('ALEF-DEMO')
    for (let i = 0; i < 4; i++) await api.recordXp(WEEK, 30, 6) // 120, streak 6
    expect((await api.leaderboard(WEEK)).map(r => r.nickname)).toEqual(['가', '다윗'])
  })

  it('crowns only last week\'s winner with xp', async () => {
    const { api } = await setup()
    await api.addFriend('ALEF-DEMO')
    expect((await api.leaderboard(WEEK)).some(r => r.crown)).toBe(false)
    await api.recordXp(LAST_WEEK, 30, 1)
    const rows = await api.leaderboard(WEEK)
    expect(rows.find(r => r.isMe)!.crown).toBe(true)
    expect(rows.find(r => !r.isMe)!.crown).toBe(false)
  })
})
