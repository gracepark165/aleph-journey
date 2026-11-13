import type { Profile } from '@/lib/profile'
import type { ProgressSnapshot } from '@/lib/progress/snapshot'

export type CloudUser = { id: string; isGuest: boolean }
export type CloudProfile = { nickname: string; avatarId: string; friendCode: string }
export type FriendSummary = { userId: string; nickname: string; avatarId: string }
export type LeaderboardRow = FriendSummary & { totalXp: number; weekXp: number; streak: number; isMe: boolean; crown: boolean }

export type CloudErrorCode = 'not_found' | 'self' | 'already' | 'invalid_ticket' | 'not_guest' | 'network' | 'unknown'

export class CloudError extends Error {
  code: CloudErrorCode
  constructor(code: CloudErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'CloudError'
    this.code = code
  }
}

export interface CloudApi {
  /** Signs in anonymously when there is no session yet. */
  ensureSession(): Promise<CloudUser>
  ensureProfile(p: Profile): Promise<CloudProfile>
  updateProfile(p: Profile): Promise<CloudProfile>
  pullProgress(): Promise<ProgressSnapshot | null>
  pushProgress(s: ProgressSnapshot): Promise<void>
  recordXp(week: string, gained: number, streak: number): Promise<void>
  leaderboard(week: string): Promise<LeaderboardRow[]>
  profileByCode(code: string): Promise<(FriendSummary & { isMe: boolean }) | null>
  addFriend(code: string): Promise<FriendSummary>
  removeFriend(userId: string): Promise<void>
  /** Links Kakao to the guest (redirects). If the Kakao account already exists, issues a ticket and continues with Kakao login. */
  connectKakao(returnTo: string): Promise<void>
  /** Called from /auth/callback. */
  finishAuth(): Promise<{ absorbed: boolean }>
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
}
