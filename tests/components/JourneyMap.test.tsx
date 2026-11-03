import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import { JourneyMap } from '@/components/JourneyMap'
import { readCourse } from '@/lib/content/read-files'
import { emptySnapshot } from '@/lib/progress/snapshot'
import { recordLessonComplete } from '@/lib/progress/streak'
import { memoryStore, renderWithProgress, TODAY } from '../utils/progress'

const course = readCourse()

describe('JourneyMap', () => {
  test('first unit open, second locked with no progress', async () => {
    renderWithProgress(<JourneyMap course={course} />)
    const first = await screen.findByRole('link', { name: /알파벳 첫걸음/ })
    expect(first).toHaveAttribute('href', '/unit/unit-0-alefbet')
    const locked = screen.getByText(/우물가의 리브가/).closest('[aria-disabled]')
    expect(locked).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('link', { name: /우물가의 리브가/ })).toBeNull()
  })
  test('completing alef-bet unlocks the next unit and shows counts', async () => {
    const s = recordLessonComplete(emptySnapshot(TODAY), { id: 'alef-bet-1', type: 'quiz' }, { score: 100, perfect: true }, TODAY, 'x')
    renderWithProgress(<JourneyMap course={course} />, memoryStore(s))
    expect(await screen.findByRole('link', { name: /우물가의 리브가/ })).toHaveAttribute('href', '/unit/unit-1-rebekah')
    expect(screen.getByRole('link', { name: /알파벳 첫걸음/ })).toHaveTextContent('1/1')
    expect(screen.getByRole('link', { name: /우물가의 리브가/ })).toHaveTextContent('0/3')
  })
  test('units with an illustration show it', async () => {
    renderWithProgress(<JourneyMap course={course} />)
    expect(await screen.findByRole('img', { name: '우물에서 항아리에 물을 긷는 리브가' })).toBeInTheDocument()
  })
})
