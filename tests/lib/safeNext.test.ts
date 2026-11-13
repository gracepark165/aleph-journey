import { describe, expect, test } from 'vitest'
import { safeNextPath } from '@/lib/safeNext'

describe('safeNextPath', () => {
  test('keeps same-origin paths', () => {
    expect(safeNextPath('/profile')).toBe('/profile')
    expect(safeNextPath('/invite/ALEF-AB23?x=1')).toBe('/invite/ALEF-AB23?x=1')
  })
  test('falls back to / for anything else', () => {
    for (const v of [null, '', 'profile', '//evil.com', '/\\evil.com', 'https://evil.com', '/\\/evil.com']) {
      expect(safeNextPath(v)).toBe('/')
    }
  })
})
