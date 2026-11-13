import { expect, test } from 'vitest'
import { safeDecode } from '@/lib/safeDecode'

test('malformed escapes fall back to the raw string', () => {
  expect(safeDecode('%')).toBe('%')
  expect(safeDecode('%E0%A4')).toBe('%E0%A4')
})
test('plain and encoded codes', () => {
  expect(safeDecode('alef-demo')).toBe('alef-demo')
  expect(safeDecode('ALEF%2DDEMO')).toBe('ALEF-DEMO')
})
