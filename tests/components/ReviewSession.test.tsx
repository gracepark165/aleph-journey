import { expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewSession } from '@/components/ReviewSession'
import { readLexicon } from '@/lib/content/read-files'
import { renderWithProgress } from '../utils/progress'

test('answering records review and shows summary', async () => {
  const onDone = vi.fn()
  const { store } = renderWithProgress(<ReviewSession lemmaIds={['H4325']} lexicon={readLexicon()} rng={() => 0.3} onDone={onDone} />)
  await userEvent.click(screen.getByRole('button', { name: '물' }))
  await userEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(screen.getByText('복습 완료! 정답 1/1')).toBeInTheDocument()
  expect(store.current().reviews.H4325).toMatchObject({ correctCount: 1 })
  await userEvent.click(screen.getByRole('button', { name: '단어장으로' }))
  expect(onDone).toHaveBeenCalled()
})
