import { describe, expect, test } from 'vitest'
import { gradeBlocks, gradeChoice, gradeChoiceQuestion, gradeOrder } from '@/lib/grader/rules'
import type { BlocksReply, ChoiceQuestion, ChoiceReply, OrderQuestion } from '@/lib/content/schema'

const line = { he: 'א', translit: '', ko: '', lemmaIds: [] }
const choice: ChoiceReply = { mode: 'choice', options: [
  { id: 'good', line, correct: true, next: 'n2' },
  { id: 'bad', line, correct: false, feedbackKo: '다시' }] }
const blocks: BlocksReply = { mode: 'blocks', promptKo: '', tokens: ['מַיִם', 'מְעַט', 'כַּד'], accepted: ['כַּד מַיִם', 'מְעַט־מַיִם'], next: 'end', lemmaIds: [] }

describe('rule grading', () => {
  test('correct choice returns next', () => {
    expect(gradeChoice(choice, 'good')).toEqual({ correct: true, next: 'n2' })
  })
  test('wrong choice returns feedback', () => {
    expect(gradeChoice(choice, 'bad')).toEqual({ correct: false, feedbackKo: '다시' })
  })
  test('unknown option throws', () => {
    expect(() => gradeChoice(choice, 'nope')).toThrow()
  })
  test('blocks match any accepted answer after normalization', () => {
    expect(gradeBlocks(blocks, ['מְעַט', 'מַיִם'])).toEqual({ correct: true, next: 'end' })
  })
  test('blocks in wrong order are wrong', () => {
    expect(gradeBlocks(blocks, ['מַיִם', 'מְעַט']).correct).toBe(false)
  })
  test('empty blocks are wrong', () => {
    expect(gradeBlocks(blocks, []).correct).toBe(false)
  })
  test('order question', () => {
    const q: OrderQuestion = { kind: 'order', promptKo: '', tokens: ['a', 'b', 'c'], answer: ['b', 'a'], lemmaIds: [] }
    expect(gradeOrder(q, ['b', 'a'])).toBe(true)
    expect(gradeOrder(q, ['a', 'b'])).toBe(false)
    expect(gradeOrder(q, ['b', 'a', 'c'])).toBe(false)
  })
  test('choice question', () => {
    const q: ChoiceQuestion = { kind: 'choice', prompt: { ko: '' }, choices: ['x', 'y'], answerIndex: 1 }
    expect(gradeChoiceQuestion(q, 1)).toBe(true)
    expect(gradeChoiceQuestion(q, 0)).toBe(false)
  })
})
