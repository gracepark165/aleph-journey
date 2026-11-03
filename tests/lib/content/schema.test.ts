import { describe, expect, test } from 'vitest'
import { LessonSchema, CourseSchema, LexiconSchema } from '@/lib/content/schema'
import course from '../../fixtures/content/course.json'
import lexicon from '../../fixtures/content/lexicon.json'
import r1 from '../../fixtures/content/lessons/r1.json'
import rp1 from '../../fixtures/content/lessons/rp1.json'

const quiz = {
  id: 'q1', type: 'quiz', titleKo: '퀴즈', questions: [
    { kind: 'choice', prompt: { he: 'מַיִם', ko: '뜻은?' }, choices: ['물', '불', '흙'], answerIndex: 0, lemmaId: 'H4325' },
    { kind: 'order', promptKo: '순서', tokens: ['a', 'b', 'c'], answer: ['b', 'a'], lemmaIds: ['H4325'] },
  ],
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

describe('content schema', () => {
  test('valid fixtures parse', () => {
    expect(CourseSchema.parse(course).units).toHaveLength(1)
    expect(LexiconSchema.parse(lexicon).H4325.glossKo).toBe('물')
    expect(LessonSchema.parse(r1).type).toBe('reading')
    expect(LessonSchema.parse(rp1).type).toBe('roleplay')
    expect(LessonSchema.parse(quiz).type).toBe('quiz')
  })
  test('answerIndex out of range fails', () => {
    const q = clone(quiz); q.questions[0] = { ...q.questions[0], answerIndex: 5 }
    expect(LessonSchema.safeParse(q).success).toBe(false)
  })
  test('correct option without next fails', () => {
    const r = clone(rp1) as any; delete r.nodes.a.reply.options[0].next
    expect(LessonSchema.safeParse(r).success).toBe(false)
  })
  test('node with both reply and end fails', () => {
    const r = clone(rp1) as any; r.nodes.a.end = true
    expect(LessonSchema.safeParse(r).success).toBe(false)
  })
  test('node with neither reply nor end fails', () => {
    const r = clone(rp1) as any; delete r.nodes.b.end
    expect(LessonSchema.safeParse(r).success).toBe(false)
  })
  test('non-Strong lemmaId fails', () => {
    const r = clone(r1) as any; r.verses[0].words[0].lemmaId = 'water'
    expect(LessonSchema.safeParse(r).success).toBe(false)
  })
})
