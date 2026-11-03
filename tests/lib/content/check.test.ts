import { describe, expect, test } from 'vitest'
import { checkContent } from '@/lib/content/check'
import type { Course, Lesson, Lexicon, RoleplayLesson } from '@/lib/content/schema'

const lexicon: Lexicon = {
  H1: { id: 'H1', lemma: 'א', translit: 'a', glossKo: '가', posKo: '명사' },
  H2: { id: 'H2', lemma: 'ב', translit: 'b', glossKo: '나', posKo: '명사' },
}
const line = (lemmaIds = ['H1']) => ({ he: 'א', translit: 'a', ko: '가', lemmaIds })

function roleplay(nodes: RoleplayLesson['nodes'], start = 'a'): RoleplayLesson {
  return { id: 'rp', type: 'roleplay', titleKo: '', setupKo: '', character: { nameKo: '', nameHe: '' }, startNodeId: start, nodes }
}
const okRoleplay = () => roleplay({
  a: { id: 'a', reply: { mode: 'choice', options: [
    { id: 'o1', correct: true, next: 'b', line: line() },
    { id: 'o2', correct: false, line: line(['H2']) }] } },
  b: { id: 'b', npc: line(), reply: { mode: 'blocks', promptKo: '', tokens: ['א', 'ב', 'ג'], accepted: ['ב א'], next: 'z', lemmaIds: ['H1'] } },
  z: { id: 'z', end: true },
})
const reading: Lesson = { id: 'r', type: 'reading', titleKo: '', verses: [{ refKo: '', translationKo: '', words: [{ surface: 'א', lemmaId: 'H1', translit: '', glossKo: '' }] }] }
const quiz: Lesson = { id: 'q', type: 'quiz', titleKo: '', questions: [
  { kind: 'choice', prompt: { ko: '' }, choices: ['a', 'b'], answerIndex: 0, lemmaId: 'H2' },
  { kind: 'order', promptKo: '', tokens: ['x', 'y', 'z'], answer: ['y', 'x'], lemmaIds: ['H1'] }] }
const course = (ids: string[]): Course => ({ id: 'c', titleKo: '', units: [{ id: 'u', titleKo: '', mapLabelKo: '', lessonIds: ids }] })

const run = (lessons: Lesson[], ids = lessons.map(l => l.id)) => checkContent(course(ids), lessons, lexicon)

describe('checkContent', () => {
  test('valid content passes', () => {
    expect(run([reading, quiz, okRoleplay()])).toEqual([])
  })
  test('course references missing lesson', () => {
    expect(run([reading], ['r', 'ghost'])).toEqual([expect.stringMatching(/\[ghost\]/)])
  })
  test('lesson not in any unit', () => {
    expect(run([reading, quiz], ['r'])).toEqual([expect.stringMatching(/\[q\].*유닛/)])
  })
  test('duplicate lesson id in course', () => {
    expect(run([reading], ['r', 'r'])).toEqual([expect.stringMatching(/\[r\].*중복/)])
  })
  test('unknown lemma ids anywhere', () => {
    const r = structuredClone(reading) as any; r.verses[0].words[0].lemmaId = 'H99'
    const rp = okRoleplay() as any; rp.nodes.b.npc.lemmaIds = ['H77']
    const errs = run([r, rp])
    expect(errs).toEqual(expect.arrayContaining([expect.stringMatching(/\[r\].*H99/), expect.stringMatching(/\[rp\].*H77/)]))
  })
  test('missing start and next targets', () => {
    const rp = okRoleplay() as any; rp.nodes.a.reply.options[0].next = 'nowhere'
    expect(run([rp])).toEqual(expect.arrayContaining([expect.stringMatching(/\[rp\].*nowhere/)]))
    expect(run([roleplay(okRoleplay().nodes, 'x')])).toEqual(expect.arrayContaining([expect.stringMatching(/\[rp\].*x/)]))
  })
  test('orphan node', () => {
    const rp = okRoleplay(); rp.nodes.orphan = { id: 'orphan', end: true }
    expect(run([rp])).toEqual([expect.stringMatching(/\[rp\].*orphan/)])
  })
  test('cycle that can still reach end passes', () => {
    const rp = okRoleplay() as any
    rp.nodes.a.reply.options[1] = { id: 'o2', correct: true, next: 'a', line: line() }
    expect(run([rp])).toEqual([])
  })
  test('cycle with no way to end fails', () => {
    const rp = roleplay({
      a: { id: 'a', reply: { mode: 'choice', options: [{ id: 'o', correct: true, next: 'b', line: line() }, { id: 'p', correct: false, line: line() }] } },
      b: { id: 'b', reply: { mode: 'choice', options: [{ id: 'o', correct: true, next: 'a', line: line() }, { id: 'p', correct: false, line: line() }] } },
    })
    expect(run([rp])).toEqual(expect.arrayContaining([expect.stringMatching(/\[rp\].*끝/)]))
  })
  test('choice node without correct option', () => {
    const rp = okRoleplay() as any; rp.nodes.a.reply.options[0].correct = false
    expect(run([rp])).toEqual(expect.arrayContaining([expect.stringMatching(/\[rp\] 노드 a.*정답/)]))
  })
  test('accepted block answer uses token not in bank', () => {
    const rp = okRoleplay() as any; rp.nodes.b.reply.accepted = ['ד א']
    expect(run([rp])).toEqual([expect.stringMatching(/\[rp\].*ד/)])
  })
  test('order answer not drawn from tokens', () => {
    const q = structuredClone(quiz) as any; q.questions[1].answer = ['y', 'w']
    expect(run([q])).toEqual([expect.stringMatching(/\[q\].*w/)])
  })
})
