import { describe, expect, test } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuizView } from '@/components/QuizView'
import { readLesson } from '@/lib/content/read-files'
import type { QuizLesson } from '@/lib/content/schema'
import { renderWithProgress } from '../utils/progress'

const lesson = readLesson('rebekah-quiz') as QuizLesson
const next = () => userEvent.click(screen.getByRole('button', { name: '다음' }))

describe('QuizView', () => {
  test('correct choice locks the question', async () => {
    renderWithProgress(<QuizView lesson={lesson} unitId="u" />)
    await userEvent.click(screen.getByRole('button', { name: '물' }))
    expect(screen.getByText('정답!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '손' })).toBeDisabled()
  })
  test('wrong choice highlights the right answer', async () => {
    renderWithProgress(<QuizView lesson={lesson} unitId="u" />)
    await userEvent.click(screen.getByRole('button', { name: '손' }))
    expect(screen.getByText(/아쉬워요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '물' })).toHaveClass('correct')
  })
  test('word order question graded by tapping tokens', async () => {
    renderWithProgress(<QuizView lesson={lesson} unitId="u" />)
    for (const ans of ['물', '부디, 제발', '마시라', '나의 주여']) { await userEvent.click(screen.getByRole('button', { name: ans })); await next() }
    const bank = screen.getByRole('group', { name: '단어 블록' })
    await userEvent.click(within(bank).getByRole('button', { name: 'מַיִם' }))
    const line = screen.getByRole('group', { name: '내 답' })
    await userEvent.click(within(line).getByRole('button', { name: 'מַיִם' })) // put it back
    await userEvent.click(within(bank).getByRole('button', { name: 'מְעַט' }))
    await userEvent.click(within(bank).getByRole('button', { name: 'מַיִם' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(screen.getByText('정답!')).toBeInTheDocument()
  })
  test('4 of 5 correct completes with score 80 and records reviews', async () => {
    const { store } = renderWithProgress(<QuizView lesson={lesson} unitId="u" />)
    for (const ans of ['물', '~위에', '마시라', '나의 주여']) { await userEvent.click(screen.getByRole('button', { name: ans })); await next() }
    const bank = screen.getByRole('group', { name: '단어 블록' })
    await userEvent.click(within(bank).getByRole('button', { name: 'מְעַט' }))
    await userEvent.click(within(bank).getByRole('button', { name: 'מַיִם' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))
    await next()
    expect(store.current().completed['rebekah-quiz']).toMatchObject({ score: 80, perfect: false })
    expect(screen.getByText('+10 XP')).toBeInTheDocument()
    expect(store.current().reviews.H4994).toMatchObject({ wrongCount: 1, intervalDays: 1 })
    expect(store.current().reviews.H4325.correctCount).toBe(2)
  })
})
