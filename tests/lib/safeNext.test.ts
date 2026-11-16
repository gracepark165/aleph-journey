import { describe, expect, test } from 'vitest'
import { safeNextPath } from '@/lib/safeNext'

const ORIGIN = 'https://aleph.example'

describe('safeNextPath', () => {
  test('keeps same-origin paths', () => {
    expect(safeNextPath('/profile', ORIGIN)).toBe('/profile')
    expect(safeNextPath('/invite/ALEF-AB23?x=1', ORIGIN)).toBe('/invite/ALEF-AB23?x=1')
    expect(safeNextPath('/friends#top', ORIGIN)).toBe('/friends#top')
  })
  test('falls back to / for anything else', () => {
    for (const v of [null, undefined, '', 'profile', '//evil.com', '/\\evil.com', 'https://evil.com', '/\\/evil.com', '/ /evil.com']) {
      expect(safeNextPath(v, ORIGIN)).toBe('/')
    }
  })
  test('control characters cannot smuggle in another origin', () => {
    // decodeURIComponent of /%09/evil.com, /%0A/evil.com, /%0D/evil.com
    for (const v of ['/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '/\u0000/evil.com']) {
      expect(safeNextPath(v, ORIGIN)).toBe('/')
    }
    expect(safeNextPath(new URLSearchParams('next=/%09/evil.com').get('next'), ORIGIN)).toBe('/')
  })
  test('defaults to the current origin', () => {
    expect(safeNextPath('/profile')).toBe('/profile')
  })
})

describe('safeNextPath dot segments', () => {
  test('normalised paths never become protocol-relative', () => {
    for (const v of ['/..//evil.com', '/.//evil.com', '/a/..//evil.com', '/%2e%2e//evil.com', '/%2e//evil.com', '/.%2e//evil.com']) {
      const out = safeNextPath(v, ORIGIN)
      expect(out.startsWith('//')).toBe(false)
      expect(new URL(out, ORIGIN).origin).toBe(ORIGIN)
    }
  })
})
