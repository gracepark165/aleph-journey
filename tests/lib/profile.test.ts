import { describe, expect, test } from 'vitest'
import { AVATARS, DEFAULT_PROFILE, avatarById, cleanNickname } from '@/lib/profile'

describe('profile', () => {
  test('default profile is the pilgrim with Zoe', () => {
    expect(DEFAULT_PROFILE).toEqual({ nickname: '순례자', avatarId: 'zoe' })
    expect(avatarById('zoe')).toMatchObject({ nameKo: '조에', src: '/illustrations/zoe.webp' })
  })
  test('avatars are the app characters and unknown ids fall back to Zoe', () => {
    expect(AVATARS.map(a => a.id)).toEqual(expect.arrayContaining(['zoe', 'rebekah', 'naomi', 'eli', 'saul', 'sailor']))
    expect(avatarById('nope').id).toBe('zoe')
  })
  test('nickname is trimmed, collapsed, and limited to 12 characters', () => {
    expect(cleanNickname('  다윗   왕  ')).toBe('다윗 왕')
    expect(cleanNickname('가나다라마바사아자차카타파하')).toBe('가나다라마바사아자차카타')
    expect(cleanNickname('   ')).toBe('')
  })
})
