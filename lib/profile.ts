/** Learner profile shown on home (stored per browser now; synced to the server in stage 2). */
export type Profile = { nickname: string; avatarId: string }
export type Avatar = { id: string; nameKo: string; src: string }

export const AVATARS: Avatar[] = [
  { id: 'zoe', nameKo: '조에', src: '/illustrations/zoe.webp' },
  { id: 'rebekah', nameKo: '리브가', src: '/illustrations/rebekah-face.webp' },
  { id: 'naomi', nameKo: '나오미', src: '/illustrations/naomi-face.webp' },
  { id: 'eli', nameKo: '엘리', src: '/illustrations/eli-face.webp' },
  { id: 'saul', nameKo: '사울', src: '/illustrations/saul-face.webp' },
  { id: 'shepherd', nameKo: '목자', src: '/illustrations/shepherd-face.webp' },
  { id: 'reaper', nameKo: '추수꾼', src: '/illustrations/reaper-face.webp' },
  { id: 'fieldman', nameKo: '들판의 사람', src: '/illustrations/fieldman-face.webp' },
  { id: 'widow', nameKo: '사르밧 과부', src: '/illustrations/widow-face.webp' },
  { id: 'neighbor', nameKo: '이웃', src: '/illustrations/neighbor-face.webp' },
  { id: 'sailor', nameKo: '선원', src: '/illustrations/sailor-face.webp' },
]

export const DEFAULT_PROFILE: Profile = { nickname: '순례자', avatarId: 'zoe' }
export const NICKNAME_MAX = 12

export function avatarById(id: string): Avatar {
  return AVATARS.find(a => a.id === id) ?? AVATARS[0]
}

export function cleanNickname(raw: string): string {
  return [...raw.replace(/\s+/g, ' ').trim()].slice(0, NICKNAME_MAX).join('')
}
