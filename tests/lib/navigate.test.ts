import { describe, expect, test, vi } from 'vitest'
import { hardNavigate } from '@/lib/navigate'

describe('hardNavigate', () => {
  test('same-origin paths are passed through', () => {
    const replace = vi.fn()
    hardNavigate('/friends?x=1', replace)
    expect(replace).toHaveBeenCalledWith('/friends?x=1')
  })
  test('external-looking input never reaches location.replace', () => {
    for (const v of ['//evil.com', '/..//evil.com', 'https://evil.com', '/\t/evil.com', '/%2e//evil.com']) {
      const replace = vi.fn()
      hardNavigate(v, replace)
      const target = replace.mock.calls[0][0] as string
      expect(target.startsWith('//')).toBe(false)
      expect(new URL(target, location.origin).origin).toBe(location.origin)
    }
  })
})
