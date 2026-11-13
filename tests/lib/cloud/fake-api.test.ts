import { describe, expect, it } from 'vitest'
import { createFakeCloudApi } from '@/lib/cloud/fake-api'
import { CloudError } from '@/lib/cloud/types'
import { isoWeek, seoulDate } from '@/lib/progress/dates'

const WEEK = isoWeek(seoulDate(new Date()))
const me = { nickname: '나', avatarId: 'zoe' }

async function setup() {
  const api = createFakeCloudApi(window.localStorage)
  await api.ensureSession()
  const profile = await api.ensureProfile(me)
  return { api, profile }
}
const codeOf = async (p: Promise<unknown>) => p.then(() => null, (e: CloudError) => e.code)

describe('fake cloud api', () => {
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
    expect(await codeOf(api.recordXp(WEEK, 31, 1))).toBe('unknown')
    await expect(api.recordXp(WEEK, 30, 1)).resolves.toBeUndefined()
    expect((await api.leaderboard(WEEK))[0].weekXp).toBe(30)
  })

  it('removes friends and deletes the account', async () => {
    const { api } = await setup()
    const f = await api.addFriend('ALEF-DEMO')
    await api.removeFriend(f.userId)
    expect(await api.leaderboard(WEEK)).toHaveLength(1)
    await api.deleteAccount()
    expect(window.localStorage.length).toBe(0)
  })
})
