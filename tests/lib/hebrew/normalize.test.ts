import { describe, expect, test } from 'vitest'
import { normalizeHebrew } from '@/lib/hebrew/normalize'

describe('normalizeHebrew', () => {
  test('maqaf becomes a space', () => {
    expect(normalizeHebrew('מְעַט־מַיִם')).toBe('מְעַט מַיִם')
  })
  test('cantillation accents are removed, vowels kept', () => {
    expect(normalizeHebrew('בְּרֵאשִׁ֖ית')).toBe('בְּרֵאשִׁית')
  })
  test('sof pasuq and paseq are removed', () => {
    expect(normalizeHebrew('מַיִם׃')).toBe('מַיִם')
    expect(normalizeHebrew('מַיִם ׀ מַיִם')).toBe('מַיִם מַיִם')
  })
  test('stripNiqqud removes vowel points', () => {
    expect(normalizeHebrew('מַיִם', { stripNiqqud: true })).toBe('מים')
    expect(normalizeHebrew('שְׁתֵה', { stripNiqqud: true })).toBe('שתה')
  })
  test('different mark orderings normalize to the same string', () => {
    const a = 'שְׁ' // shin + shin dot + sheva
    const b = 'שְׁ' // shin + sheva + shin dot
    expect(normalizeHebrew(a)).toBe(normalizeHebrew(b))
  })
  test('whitespace is trimmed and collapsed', () => {
    expect(normalizeHebrew('  מְעַט   מַיִם \n')).toBe('מְעַט מַיִם')
  })
})
