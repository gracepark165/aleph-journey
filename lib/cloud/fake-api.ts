import type { Profile } from '@/lib/profile'
import type { ProgressSnapshot } from '@/lib/progress/snapshot'
import { addDays, isoWeek, seoulDate } from '@/lib/progress/dates'
import { CloudError, type CloudApi, type CloudProfile, type FriendSummary, type LeaderboardRow } from './types'

const KEY = 'aleph.fakeCloud.v1'
const MY_CODE = 'ALEF-ME22'
const DEMO = { userId: 'demo-friend', code: 'ALEF-DEMO', nickname: '다윗', avatarId: 'saul', totalXp: 1500, weekXp: 120, streak: 6 }
const MAX_GAIN = 30
const MAX_WEEK_XP = 2100

/** ISO week label before the given one, e.g. '2026-W01' -> '2025-W52'. */
function previousWeek(week: string): string {
  const [y, w] = week.split('-W').map(Number)
  const jan4 = `${y}-01-04`
  const weekday = new Date(`${jan4}T00:00:00Z`).getUTCDay() || 7
  return isoWeek(addDays(jan4, 1 - weekday + (w - 1) * 7 - 7))
}
const byRank = (a: { weekXp: number; streak: number; nickname: string }, b: typeof a) =>
  b.weekXp - a.weekXp || b.streak - a.streak || a.nickname.localeCompare(b.nickname)

type State = {
  signedIn: boolean
  isGuest: boolean
  profile: Profile | null
  friends: string[]
  progress: ProgressSnapshot | null
  xp: Record<string, number> // week -> my weekly XP
  streak: number
}
const initial = (): State => ({ signedIn: false, isGuest: true, profile: null, friends: [], progress: null, xp: {}, streak: 0 })

/** Local-storage backed stand-in for the real backend (E2E and demos). */
export function createFakeCloudApi(storage: Storage = window.localStorage): CloudApi {
  const read = (): State => {
    try { return { ...initial(), ...JSON.parse(storage.getItem(KEY) ?? '{}') } } catch { return initial() }
  }
  const write = (s: State) => storage.setItem(KEY, JSON.stringify(s))
  const update = (fn: (s: State) => void) => { const s = read(); fn(s); write(s); return s }
  const requireProfile = (s: State): Profile => {
    if (!s.profile) throw new CloudError('unknown', 'no profile')
    return s.profile
  }
  const cloudProfile = (p: Profile): CloudProfile => ({ ...p, friendCode: MY_CODE })
  const currentWeek = () => isoWeek(seoulDate(new Date()))

  return {
    async ensureSession() {
      const s = update(st => { st.signedIn = true })
      return { id: 'fake-me', isGuest: s.isGuest }
    },
    async ensureProfile(p) {
      const s = update(st => { st.profile ??= p })
      return cloudProfile(s.profile!)
    },
    async updateProfile(p) {
      update(st => { st.profile = p })
      return cloudProfile(p)
    },
    async pullProgress() { return read().progress },
    async pushProgress(snapshot) { update(st => { st.progress = snapshot }) },
    async recordXp(week, gained, streak) {
      if (!Number.isInteger(gained) || gained < 1 || gained > MAX_GAIN) throw new CloudError('unknown', 'invalid_gained')
      update(st => { st.xp[week] = Math.min((st.xp[week] ?? 0) + gained, MAX_WEEK_XP); st.streak = streak })
    },
    async leaderboard(week) {
      const s = read()
      const mine = requireProfile(s)
      const hasDemo = s.friends.includes(DEMO.userId)
      const demoXp = (w: string) => (w === currentWeek() ? DEMO.weekXp : 0)
      const build = (w: string) => {
        const rows: Omit<LeaderboardRow, 'crown'>[] = [{
          userId: 'fake-me', nickname: mine.nickname, avatarId: mine.avatarId,
          totalXp: Object.values(s.xp).reduce((x, y) => x + y, 0), weekXp: s.xp[w] ?? 0, streak: s.streak, isMe: true,
        }]
        if (hasDemo) {
          rows.push({
            userId: DEMO.userId, nickname: DEMO.nickname, avatarId: DEMO.avatarId, totalXp: DEMO.totalXp,
            weekXp: demoXp(w), streak: DEMO.streak, isMe: false,
          })
        }
        return rows.sort(byRank)
      }
      // Crown: #1 of the previous ISO week, only if they earned XP then.
      const last = build(previousWeek(week))[0]
      const crownId = last.weekXp > 0 ? last.userId : null
      return build(week).map(r => ({ ...r, crown: r.userId === crownId }))
    },
    async profileByCode(code) {
      const c = code.trim().toUpperCase()
      if (c === MY_CODE) {
        const p = requireProfile(read())
        return { userId: 'fake-me', nickname: p.nickname, avatarId: p.avatarId, isMe: true }
      }
      if (c === DEMO.code) return { userId: DEMO.userId, nickname: DEMO.nickname, avatarId: DEMO.avatarId, isMe: false }
      return null
    },
    async addFriend(code): Promise<FriendSummary> {
      const found = await this.profileByCode(code)
      if (!found) throw new CloudError('not_found')
      if (found.isMe) throw new CloudError('self')
      if (read().friends.includes(found.userId)) throw new CloudError('already')
      update(st => { st.friends.push(found.userId) })
      return { userId: found.userId, nickname: found.nickname, avatarId: found.avatarId }
    },
    async removeFriend(userId) { update(st => { st.friends = st.friends.filter(id => id !== userId) }) },
    async connectKakao() { update(st => { st.isGuest = false }) },
    async continueKakaoLogin() { update(st => { st.isGuest = false }) },
    async finishAuth() { return { absorbed: false } },
    async signOut() { update(st => { st.signedIn = false }) },
    async deleteAccount() { storage.removeItem(KEY) },
  }
}
