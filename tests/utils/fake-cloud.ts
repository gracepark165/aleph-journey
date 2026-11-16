import { vi, type Mock } from 'vitest'
import { CloudError, type CloudApi } from '@/lib/cloud/types'

export type FakeCloud = { [K in keyof CloudApi]: Mock<CloudApi[K]> }

/** Every method is a vi.fn with a harmless default (code ALEF-ME22, no friends). */
export function fakeCloud(overrides: Partial<CloudApi> = {}): FakeCloud {
  const profile = { nickname: '순례자', avatarId: 'zoe', friendCode: 'ALEF-ME22' }
  const api: CloudApi = {
    ensureSession: async () => ({ id: 'me', isGuest: true }),
    ensureProfile: async () => profile,
    updateProfile: async p => ({ ...p, friendCode: profile.friendCode }),
    pullProgress: async () => null,
    pushProgress: async () => {},
    recordXp: async () => {},
    leaderboard: async () => [],
    profileByCode: async () => null,
    addFriend: async () => { throw new CloudError('not_found') },
    removeFriend: async () => {},
    connectKakao: async () => {},
    continueKakaoLogin: async () => {},
    finishAuth: async () => ({ absorbed: false }),
    signOut: async () => {},
    deleteAccount: async () => {},
    ...overrides,
  }
  return Object.fromEntries(Object.entries(api).map(([k, fn]) => [k, vi.fn(fn)])) as unknown as FakeCloud
}
