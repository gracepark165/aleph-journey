import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import { ProfileCard } from '@/components/ProfileCard'
import { emptySnapshot } from '@/lib/progress/snapshot'
import { recordLessonComplete } from '@/lib/progress/streak'
import { PROFILE_KEY } from '@/lib/prefs'
import { memoryStore, renderWithProgress, TODAY } from '../utils/progress'

describe('ProfileCard', () => {
  test('new learner: default name, alef rank, progress to bet, links to profile', async () => {
    renderWithProgress(<ProfileCard />)
    expect(await screen.findByText('순례자')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '조에' })).toBeInTheDocument()
    expect(screen.getByLabelText('랭크 알레프')).toHaveTextContent('א')
    expect(screen.getByText('다음 랭크 ב 베트까지 30 XP')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /프로필 편집/ })).toHaveAttribute('href', '/profile')
  })
  test('shows saved profile, weekly XP and streak', async () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ nickname: '다윗', avatarId: 'saul' }))
    const s = recordLessonComplete(emptySnapshot(TODAY), { id: 'q', type: 'roleplay' }, { score: 100, perfect: true }, TODAY, 'x')
    renderWithProgress(<ProfileCard />, memoryStore(s))
    expect(await screen.findByText('다윗')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '사울' })).toBeInTheDocument()
    expect(screen.getByLabelText('이번 주 XP 25')).toBeInTheDocument()
    expect(screen.getByLabelText('연속 학습 1일')).toBeInTheDocument()
  })
})
