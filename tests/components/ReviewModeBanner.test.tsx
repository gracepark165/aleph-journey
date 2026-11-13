import { expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewModeBanner } from '@/components/ReviewModeBanner'
import { REVIEW_MODE_KEY } from '@/lib/prefs'
import { renderWithProgress } from '../utils/progress'

test('banner shows in review mode and turns it off', async () => {
  localStorage.setItem(REVIEW_MODE_KEY, '1')
  renderWithProgress(<ReviewModeBanner />)
  expect(await screen.findByText(/검토 모드/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '끄기' }))
  expect(screen.queryByText(/검토 모드/)).toBeNull()
})

test('no banner normally', async () => {
  renderWithProgress(<ReviewModeBanner />)
  await new Promise(r => setTimeout(r, 0))
  expect(screen.queryByText(/검토 모드/)).toBeNull()
})
