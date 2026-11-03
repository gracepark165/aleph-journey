import { describe, expect, test } from 'vitest'
import { emptySnapshot } from '@/lib/progress/snapshot'
import { addLearned, buildReviewQuestion, dueReviews, recordReview, REVIEW_INTERVALS } from '@/lib/progress/review'
import type { Lexicon } from '@/lib/content/schema'

const T = '2026-11-03'
const lex = (n: number): Lexicon => Object.fromEntries(Array.from({ length: n }, (_, i) => {
  const id = `H${i + 1}`
  return [id, { id, lemma: `ל${i}`, translit: '', glossKo: `뜻${i + 1}`, posKo: '' }]
}))
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length] }

describe('review queue', () => {
  test('intervals advance 1→3→7→14 and cap at 14', () => {
    expect(REVIEW_INTERVALS).toEqual([1, 3, 7, 14])
    let s = addLearned(emptySnapshot(T), ['H1'], T)
    expect(s.reviews.H1).toMatchObject({ intervalDays: 1, nextReviewDate: '2026-11-04' })
    const seen: number[] = []
    for (let i = 0; i < 4; i++) { s = recordReview(s, 'H1', true, T); seen.push(s.reviews.H1.intervalDays) }
    expect(seen).toEqual([3, 7, 14, 14])
    expect(s.reviews.H1.nextReviewDate).toBe('2026-11-17')
    expect(s.reviews.H1.correctCount).toBe(4)
  })
  test('wrong answer resets to 1 day', () => {
    let s = addLearned(emptySnapshot(T), ['H1'], T)
    s = recordReview(recordReview(s, 'H1', true, T), 'H1', true, T)
    expect(s.reviews.H1.intervalDays).toBe(7)
    s = recordReview(s, 'H1', false, T)
    expect(s.reviews.H1).toMatchObject({ intervalDays: 1, nextReviewDate: '2026-11-04', wrongCount: 1 })
  })
  test('recordReview creates missing items', () => {
    const s = recordReview(emptySnapshot(T), 'H9', false, T)
    expect(s.reviews.H9).toMatchObject({ intervalDays: 1, wrongCount: 1, correctCount: 0 })
  })
  test('addLearned ignores duplicates and existing items', () => {
    let s = recordReview(emptySnapshot(T), 'H1', true, T)
    const before = s.reviews.H1
    s = addLearned(s, ['H1', 'H2', 'H2'], T)
    expect(s.reviews.H1).toEqual(before)
    expect(Object.keys(s.reviews)).toEqual(['H1', 'H2'])
  })
  test('dueReviews returns items due today or earlier, oldest first', () => {
    let s = addLearned(emptySnapshot(T), ['H1'], '2026-11-01')
    s = addLearned(s, ['H2'], '2026-11-02')
    s = addLearned(s, ['H3'], T)
    expect(dueReviews(s, T).map(r => r.lemmaId)).toEqual(['H1', 'H2'])
  })
  test('buildReviewQuestion is deterministic with injected rng and has unique choices', () => {
    const q1 = buildReviewQuestion('H2', lex(6), seq(0.1, 0.7, 0.3, 0.9))
    const q2 = buildReviewQuestion('H2', lex(6), seq(0.1, 0.7, 0.3, 0.9))
    expect(q1).toEqual(q2)
    expect(q1.choices).toHaveLength(4)
    expect(new Set(q1.choices).size).toBe(4)
    expect(q1.choices[q1.answerIndex]).toBe('뜻2')
    expect(q1).toMatchObject({ kind: 'choice', lemmaId: 'H2', prompt: { he: 'ל1' } })
  })
  test('small lexicon gives two choices', () => {
    const q = buildReviewQuestion('H1', lex(2), seq(0.5))
    expect(q.choices.sort()).toEqual(['뜻1', '뜻2'])
  })
  test('distractors with duplicate glosses are skipped', () => {
    const l = lex(3); l.H3.glossKo = '뜻1'
    const q = buildReviewQuestion('H1', l, seq(0.5))
    expect(q.choices.sort()).toEqual(['뜻1', '뜻2'])
  })
})
