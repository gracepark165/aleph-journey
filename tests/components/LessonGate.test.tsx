import { beforeEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }))
import { LessonGate } from '@/components/LessonGate'
import { readCourse } from '@/lib/content/read-files'
import { renderWithProgress } from '../utils/progress'

const course = readCourse()

describe('LessonGate', () => {
  beforeEach(() => replace.mockClear())
  test('locked lesson redirects to its unit', async () => {
    renderWithProgress(<LessonGate course={course} lessonId="rebekah-quiz" unitId="unit-1-rebekah"><p>secret</p></LessonGate>)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/unit/unit-1-rebekah'))
    expect(screen.queryByText('secret')).toBeNull()
  })
  test('open lesson renders children', async () => {
    renderWithProgress(<LessonGate course={course} lessonId="alef-bet-1" unitId="unit-0-alefbet"><p>secret</p></LessonGate>)
    expect(await screen.findByText('secret')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })
})
