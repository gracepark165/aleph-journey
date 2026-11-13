import { describe, expect, test } from 'vitest'
import { nextLesson, zoeMessage } from '@/lib/zoe'
import { readCourse } from '@/lib/content/read-files'
import { emptySnapshot } from '@/lib/progress/snapshot'
import { recordLessonComplete } from '@/lib/progress/streak'
import { addLearned } from '@/lib/progress/review'

const course = readCourse()
const T = '2026-11-03'
const titles = { 'alef-bet-1': '첫 다섯 글자', 'rebekah-reading': '본문 읽기: 물을 청하다', 'rebekah-quiz': '단어 연습', 'rebekah-roleplay': '미션: 우물가에서 물을 청하라' }
const ALL = course.units.flatMap(u => u.lessonIds)
const done = (s = emptySnapshot(T), ids: string[], day = T) =>
  ids.reduce((acc, id) => recordLessonComplete(acc, { id, type: 'quiz' }, { score: 100, perfect: true }, day, 'x'), s)

describe('nextLesson', () => {
  test('first lesson for a new learner', () => {
    expect(nextLesson(course, {})).toEqual({ lessonId: 'alef-bet-1', unitId: 'unit-0-alefbet' })
  })
  test('first incomplete lesson in course order', () => {
    expect(nextLesson(course, done(undefined, ['alef-bet-1']).completed)).toEqual({ lessonId: 'rebekah-reading', unitId: 'unit-1-rebekah' })
  })
  test('null when everything is done', () => {
    expect(nextLesson(course, done(undefined, ALL).completed)).toBeNull()
  })
})

describe('zoeMessage', () => {
  test('welcomes a new learner', () => {
    expect(zoeMessage(course, emptySnapshot(T), T, titles)).toBe('처음 오셨군요! 저는 조에예요. 알파벳부터 함께 시작해 볼까요?')
  })
  test('points to the next lesson', () => {
    const s = done(undefined, ['alef-bet-1'], '2026-11-02')
    expect(zoeMessage(course, s, T, titles)).toBe("오늘은 '본문 읽기: 물을 청하다' 차례예요. 같이 가 봐요!")
  })
  test('celebrates the daily goal with the streak count', () => {
    const s = done(done(undefined, ['alef-bet-1'], '2026-11-02'), ['rebekah-reading'], T)
    expect(zoeMessage(course, s, T, titles)).toBe('오늘 목표 완료! 🔥 2일째예요.')
  })
  test('mentions due reviews after the goal is met', () => {
    let s = done(undefined, ['alef-bet-1'], T)
    s = addLearned(s, ['H4325', 'H4994'], '2026-11-01')
    expect(zoeMessage(course, s, T, titles)).toBe('오늘 목표 완료! 🔥 1일째예요. 복습할 단어도 2개 있어요.')
  })
  test('all lessons done', () => {
    const s = done(undefined, ALL, '2026-11-02')
    expect(zoeMessage(course, s, T, titles)).toBe('준비된 레슨을 모두 마쳤어요! 단어 복습으로 실력을 지켜요.')
  })
})
