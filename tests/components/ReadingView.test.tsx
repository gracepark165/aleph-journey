import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReadingView } from '@/components/ReadingView'
import { readLesson, readLexicon } from '@/lib/content/read-files'
import type { ReadingLesson } from '@/lib/content/schema'
import { renderWithProgress } from '../utils/progress'

const lesson = readLesson('rebekah-reading') as ReadingLesson
const lexicon = readLexicon()

describe('ReadingView', () => {
  test('shows one button per word of the first verse', () => {
    renderWithProgress(<ReadingView lesson={lesson} lexicon={lexicon} unitId="unit-1-rebekah" />)
    expect(screen.getAllByRole('button', { name: /^단어 / })).toHaveLength(lesson.verses[0].words.length)
  })
  test('tapping a word shows its card', async () => {
    renderWithProgress(<ReadingView lesson={lesson} lexicon={lexicon} unitId="unit-1-rebekah" />)
    await userEvent.click(screen.getByRole('button', { name: '단어 מַיִם' }))
    const card = screen.getByRole('region', { name: '단어 정보' })
    expect(card).toHaveTextContent('물')
    expect(card).toHaveTextContent('마임')
    expect(card).toHaveTextContent('명사 남성 복수')
  })
  test('translation toggle', async () => {
    renderWithProgress(<ReadingView lesson={lesson} lexicon={lexicon} unitId="unit-1-rebekah" />)
    expect(screen.queryByText(lesson.verses[0].translationKo)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: '해석 보기' }))
    expect(screen.getByText(lesson.verses[0].translationKo)).toBeInTheDocument()
  })
  test('finishing completes the lesson with all lemma ids and shows xp', async () => {
    const { store } = renderWithProgress(<ReadingView lesson={lesson} lexicon={lexicon} unitId="unit-1-rebekah" nextLessonId="rebekah-quiz" />)
    await screen.findByRole('button', { name: '다음 구절' })
    await userEvent.click(screen.getByRole('button', { name: '다음 구절' }))
    await userEvent.click(screen.getByRole('button', { name: '완료' }))
    expect(screen.getByText('+10 XP')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '다음 레슨' })).toHaveAttribute('href', '/lesson/rebekah-quiz')
    const ids = new Set(lesson.verses.flatMap(v => v.words.map(w => w.lemmaId)))
    expect(Object.keys(store.current().reviews).sort()).toEqual([...ids].sort())
    expect(store.current().completed['rebekah-reading']).toMatchObject({ score: 100, perfect: false })
  })
})
