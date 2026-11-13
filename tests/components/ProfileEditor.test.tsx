import { describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
import { ProfileEditor } from '@/components/ProfileEditor'
import { PROFILE_KEY } from '@/lib/prefs'
import { renderWithProgress } from '../utils/progress'

describe('ProfileEditor', () => {
  test('saves nickname and avatar, then returns home', async () => {
    renderWithProgress(<ProfileEditor />)
    const input = await screen.findByLabelText('닉네임')
    await userEvent.clear(input)
    await userEvent.type(input, '  룻  ')
    await userEvent.click(screen.getByRole('radio', { name: '나오미' }))
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!)).toEqual({ nickname: '룻', avatarId: 'naomi' })
    expect(push).toHaveBeenCalledWith('/')
  })
  test('empty nickname is not saved', async () => {
    renderWithProgress(<ProfileEditor />)
    const input = await screen.findByLabelText('닉네임')
    await userEvent.clear(input)
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByText('닉네임을 입력해 주세요.')).toBeInTheDocument()
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull()
  })
})
