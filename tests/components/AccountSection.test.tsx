import { describe, expect, test } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountSection } from '@/components/AccountSection'
import { fakeCloud } from '../utils/fake-cloud'
import { renderWithCloud, renderWithProgress } from '../utils/progress'

describe('AccountSection', () => {
  test('renders nothing when the cloud is off', () => {
    const { container } = renderWithProgress(<AccountSection />)
    expect(container).toBeEmptyDOMElement()
  })

  test('guest: shows the Kakao connect button', async () => {
    const user = userEvent.setup()
    const api = fakeCloud()
    renderWithCloud(<AccountSection />, api)
    expect(await screen.findByText('카카오 계정을 연결하면 기록이 안전하게 보관돼요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull()
    await user.click(screen.getByRole('button', { name: '카카오로 연결' }))
    expect(api.connectKakao).toHaveBeenCalledTimes(1)
  })

  test('Kakao user: shows linked state and sign-out', async () => {
    const user = userEvent.setup()
    const api = fakeCloud({ ensureSession: async () => ({ id: 'k', isGuest: false }) })
    renderWithCloud(<AccountSection />, api)
    expect(await screen.findByText('카카오 계정 연결됨')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '카카오로 연결' })).toBeNull()
    await user.click(screen.getByRole('button', { name: '로그아웃' }))
    await waitFor(() => expect(api.signOut).toHaveBeenCalledTimes(1))
  })

  test('account deletion needs the in-page confirmation', async () => {
    const user = userEvent.setup()
    const api = fakeCloud()
    renderWithCloud(<AccountSection />, api)
    await user.click(await screen.findByRole('button', { name: '계정 삭제' }))
    expect(api.deleteAccount).not.toHaveBeenCalled()
    expect(screen.getByText('서버의 기록과 친구가 모두 삭제돼요. 이 기기의 진도는 남아요.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByText('서버의 기록과 친구가 모두 삭제돼요. 이 기기의 진도는 남아요.')).toBeNull()
    expect(api.deleteAccount).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '계정 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledTimes(1))
  })

  test('buttons are disabled while a request is in flight', async () => {
    const user = userEvent.setup()
    let release!: () => void
    const api = fakeCloud({ connectKakao: () => new Promise<void>(r => { release = r }) })
    renderWithCloud(<AccountSection />, api)
    const btn = await screen.findByRole('button', { name: '카카오로 연결' })
    await user.click(btn)
    expect(btn).toBeDisabled()
    expect(screen.getByRole('button', { name: '계정 삭제' })).toBeDisabled()
    release()
    await waitFor(() => expect(btn).not.toBeDisabled())
  })
})
