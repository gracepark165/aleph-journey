import { describe, expect, test } from 'vitest'
import { parseUnlockParam } from '@/lib/prefs'

describe('parseUnlockParam', () => {
  test('reads ?unlock=all and ?unlock=off', () => {
    expect(parseUnlockParam('?unlock=all')).toBe('on')
    expect(parseUnlockParam('?foo=1&unlock=off')).toBe('off')
    expect(parseUnlockParam('?unlock=maybe')).toBeNull()
    expect(parseUnlockParam('')).toBeNull()
  })
})
