import { afterEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteLanding } from '@/components/InviteLanding'
import { CloudError } from '@/lib/cloud/types'
import { fakeCloud } from '../utils/fake-cloud'
import { renderWithCloud, renderWithProgress } from '../utils/progress'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }))

const FRIEND = { userId: 'f1', nickname: '룻', avatarId: 'naomi', isMe: false }

afterEach(() => { push.mockClear(); vi.restoreAllMocks() })

describe('InviteLanding', () => {
  test('cloud off: coming soon + home link', () => {
    renderWithProgress(<InviteLanding code="ALEF-DEMO" />)
    expect(screen.getByText('친구 기능은 준비 중이에요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /홈으로/ })).toHaveAttribute('href', '/')
  })
  test('loading state while connecting', () => {
    renderWithCloud(<InviteLanding code="ALEF-DEMO" />, fakeCloud({ ensureSession: () => new Promise(() => {}) }))
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })
  test('unknown code', async () => {
    renderWithCloud(<InviteLanding code="ALEF-NOPE" />, fakeCloud({ profileByCode: async () => null }))
    expect(await screen.findByText('초대 코드를 찾을 수 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /홈으로/ })).toHaveAttribute('href', '/')
  })
  test('my own code', async () => {
    renderWithCloud(<InviteLanding code="ALEF-ME22" />, fakeCloud({ profileByCode: async () => ({ ...FRIEND, isMe: true }) }))
    expect(await screen.findByText('내 코드예요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /친구 초대하기/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '친구 되기' })).toBeNull()
  })
  test('valid: shows inviter, normalises code, adds friend, success then redirects', async () => {
    const api = fakeCloud({ profileByCode: async () => FRIEND, addFriend: async () => FRIEND })
    renderWithCloud(<InviteLanding code="alef-demo" redirectMs={30} />, api)
    expect(await screen.findByText('룻')).toBeInTheDocument()
    expect(api.profileByCode).toHaveBeenCalledWith('ALEF-DEMO')
    expect(screen.getByText('함께 히브리어 여정을 떠나요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '친구 되기' }))
    expect(api.addFriend).toHaveBeenCalledWith('ALEF-DEMO')
    expect(await screen.findByText('룻 님과 친구가 되었어요!')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  })
  test('already friends', async () => {
    const api = fakeCloud({ profileByCode: async () => FRIEND, addFriend: async () => { throw new CloudError('already') } })
    renderWithCloud(<InviteLanding code="ALEF-DEMO" />, api)
    await userEvent.click(await screen.findByRole('button', { name: '친구 되기' }))
    expect(await screen.findByText('이미 친구예요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /홈으로/ })).toHaveAttribute('href', '/')
    expect(push).not.toHaveBeenCalled()
  })
  test('rate limited lookup: try again later, no add button', async () => {
    renderWithCloud(<InviteLanding code="ALEF-DEMO" />, fakeCloud({ profileByCode: async () => { throw new CloudError('rate_limited') } }))
    expect(await screen.findByText('잠시 후 다시 시도해 주세요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '친구 되기' })).toBeNull()
    expect(screen.getByRole('link', { name: /홈으로/ })).toHaveAttribute('href', '/')
  })
  test('rate limited add: try again later', async () => {
    const api = fakeCloud({ profileByCode: async () => FRIEND, addFriend: async () => { throw new CloudError('rate_limited') } })
    renderWithCloud(<InviteLanding code="ALEF-DEMO" />, api)
    await userEvent.click(await screen.findByRole('button', { name: '친구 되기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요')
  })
  test('connection error offers retry', async () => {
    const api = fakeCloud({ ensureSession: async () => { throw new Error('x') } })
    renderWithCloud(<InviteLanding code="ALEF-DEMO" />, api)
    expect(await screen.findByText(/불러오지 못했어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
