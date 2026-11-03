import { describe, expect, test } from 'vitest'
import { applyGrade, currentNode, startMission, STARTING_LAMPS, type MissionState } from '@/lib/script-engine/engine'
import type { RoleplayLesson } from '@/lib/content/schema'

const line = { he: 'א', translit: '', ko: '', lemmaIds: [] }
const lesson: RoleplayLesson = {
  id: 'rp', type: 'roleplay', titleKo: '', setupKo: '', character: { nameKo: '', nameHe: '' }, startNodeId: 'a',
  nodes: {
    a: { id: 'a', reply: { mode: 'choice', options: [
      { id: 'x', line, correct: true, next: 'b' },
      { id: 'y', line, correct: true, next: 'c' },
      { id: 'z', line, correct: false }] } },
    b: { id: 'b', reply: { mode: 'blocks', promptKo: '', tokens: ['a', 'b'], accepted: ['a'], next: 'end', lemmaIds: [] } },
    c: { id: 'c', reply: { mode: 'blocks', promptKo: '', tokens: ['a', 'b'], accepted: ['a'], next: 'end', lemmaIds: [] } },
    end: { id: 'end', end: true },
  },
}
const freeze = (s: MissionState) => Object.freeze({ ...s, history: Object.freeze([...s.history]) as string[] })

describe('script engine', () => {
  test('starts at start node with full lamps', () => {
    expect(STARTING_LAMPS).toBe(3)
    expect(startMission(lesson)).toEqual({ nodeId: 'a', lamps: 3, mistakes: 0, status: 'playing', history: [] })
  })
  test('two correct answers reach end and win', () => {
    let s = startMission(lesson)
    s = applyGrade(lesson, s, { correct: true, next: 'b' })
    expect(currentNode(lesson, s).id).toBe('b')
    s = applyGrade(lesson, s, { correct: true, next: 'end' })
    expect(s).toMatchObject({ status: 'won', nodeId: 'end', history: ['a', 'b'] })
  })
  test('three wrong answers lose', () => {
    let s = startMission(lesson)
    for (let i = 0; i < 3; i++) s = applyGrade(lesson, s, { correct: false })
    expect(s).toMatchObject({ status: 'lost', lamps: 0, mistakes: 3, nodeId: 'a' })
  })
  test('finished missions ignore further grades', () => {
    let s = startMission(lesson)
    for (let i = 0; i < 3; i++) s = applyGrade(lesson, s, { correct: false })
    expect(applyGrade(lesson, s, { correct: true, next: 'b' })).toEqual(s)
    expect(applyGrade(lesson, s, { correct: false })).toEqual(s)
  })
  test('different correct options branch to different nodes', () => {
    const s = startMission(lesson)
    expect(applyGrade(lesson, s, { correct: true, next: 'b' }).nodeId).toBe('b')
    expect(applyGrade(lesson, s, { correct: true, next: 'c' }).nodeId).toBe('c')
  })
  test('does not mutate input state', () => {
    const s = freeze(startMission(lesson))
    expect(() => applyGrade(lesson, s, { correct: true, next: 'b' })).not.toThrow()
    expect(() => applyGrade(lesson, s, { correct: false })).not.toThrow()
    expect(s.nodeId).toBe('a')
  })
  test('correct grade without valid next throws', () => {
    const s = startMission(lesson)
    expect(() => applyGrade(lesson, s, { correct: true })).toThrow()
    expect(() => applyGrade(lesson, s, { correct: true, next: 'ghost' })).toThrow()
  })
})
