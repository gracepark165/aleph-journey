import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import { TodayHome } from '@/components/TodayHome'
import { readAllLessons, readCourse } from '@/lib/content/read-files'
import { emptySnapshot } from '@/lib/progress/snapshot'
import { recordLessonComplete } from '@/lib/progress/streak'
import { addLearned } from '@/lib/progress/review'
import { memoryStore, renderWithProgress, TODAY } from '../utils/progress'

const course = readCourse()
const lessons = readAllLessons().map(l => ({ id: l.id, type: l.type, titleKo: l.titleKo }))

describe('TodayHome', () => {
  test('new learner: greeting, Zoe welcome, start first lesson', async () => {
    renderWithProgress(<TodayHome course={course} lessons={lessons} />)
    expect(await screen.findByRole('heading', { name: /샬롬/ })).toBeInTheDocument()
    expect(screen.getByText(/저는 조에예요/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '조에' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /시작하기/ })).toHaveAttribute('href', '/lesson/alef-bet-1')
  })
  test('next lesson card shows the unit illustration and continues', async () => {
    const s = recordLessonComplete(emptySnapshot(TODAY), { id: 'alef-bet-1', type: 'quiz' }, { score: 100, perfect: true }, '2026-11-02', 'x')
    renderWithProgress(<TodayHome course={course} lessons={lessons} />, memoryStore(s))
    expect(await screen.findByRole('img', { name: '우물에서 항아리에 물을 긷는 리브가' })).toHaveAttribute('src', '/illustrations/rebekah-well.webp')
    expect(screen.getByRole('link', { name: /이어서 하기/ })).toHaveAttribute('href', '/lesson/rebekah-reading')
  })
  test('due reviews get their own card', async () => {
    const s = addLearned(emptySnapshot(TODAY), ['H4325'], '2026-11-01')
    renderWithProgress(<TodayHome course={course} lessons={lessons} />, memoryStore(s))
    expect(await screen.findByRole('link', { name: /복습할 단어 1개/ })).toHaveAttribute('href', '/vocab')
  })
})
