import { describe, expect, test, vi } from 'vitest'
import path from 'node:path'
vi.mock('server-only', () => ({}))
import { loadCourse, loadLesson, loadLexicon } from '@/lib/content/load'

const dir = path.join(__dirname, '../../fixtures/content')

describe('content loader', () => {
  test('loads course, lexicon, lesson', () => {
    expect(loadCourse(dir).id).toBe('c')
    expect(loadLexicon(dir).H4994.lemma).toBe('נָא')
    expect(loadLesson('r1', dir)?.type).toBe('reading')
  })
  test('missing lesson returns null', () => {
    expect(loadLesson('missing', dir)).toBeNull()
  })
  test('broken lesson throws with id in message', () => {
    expect(() => loadLesson('broken', dir)).toThrow(/broken/)
  })
  test('rejects path traversal ids', () => {
    expect(loadLesson('../course', dir)).toBeNull()
  })
})
