import { afterEach, describe, expect, test, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FriendsManager } from '@/components/FriendsManager'
import { CloudError, type LeaderboardRow } from '@/lib/cloud/types'
import { fakeCloud } from '../utils/fake-cloud'
import { renderWithCloud, renderWithProgress } from '../utils/progress'

const row = (o: Partial<LeaderboardRow>): LeaderboardRow => ({ userId: 'x', nickname: 'x', avatarId: 'naomi', totalXp: 0, weekXp: 0, streak: 0, isMe: false, crown: false, ...o })
const ROWS = [
  row({ userId: 'f1', nickname: '룻', weekXp: 90 }),
  row({ userId: 'f2', nickname: '나오미', weekXp: 20 }),
  row({ userId: 'me', nickname: '순례자', isMe: true }),
]

afterEach(() => { vi.restoreAllMocks() })

const input = () => screen.getByLabelText('친구 코드')

describe('FriendsManager', () => {
  test('off: shows preparing message', () => {
    renderWithProgress(<FriendsManager />)
    expect(screen.getByText('친구 기능은 준비 중이에요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/')
  })

  test('shows my code and lists friends without me', async () => {
    renderWithCloud(<FriendsManager />, fakeCloud({ leaderboard: async () => ROWS }))
    expect(await screen.findByText('룻')).toBeInTheDocument()
    expect(screen.getByText('ALEF-ME22')).toBeInTheDocument()
    expect(screen.getByText('나오미')).toBeInTheDocument()
    expect(screen.queryByText('순례자')).toBeNull()
  })

  test('copy button writes my code to the clipboard', async () => {
    const user = userEvent.setup()
    renderWithCloud(<FriendsManager />, fakeCloud({ leaderboard: async () => ROWS }))
    await screen.findByText('룻')
    const spy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await user.click(screen.getByRole('button', { name: '복사' }))
    expect(spy).toHaveBeenCalledWith('ALEF-ME22')
    expect(await screen.findByText('복사했어요')).toBeInTheDocument()
  })

  test('normalises input and adds friend, then clears and confirms', async () => {
    const user = userEvent.setup()
    const api = fakeCloud({ leaderboard: async () => ROWS, addFriend: async () => ({ userId: 'f3', nickname: '다윗', avatarId: 'naomi' }) })
    renderWithCloud(<FriendsManager />, api)
    await screen.findByText('룻')
    await user.type(input(), ' k7q2 ')
    await user.click(screen.getByRole('button', { name: '추가' }))
    expect(api.addFriend).toHaveBeenCalledWith('ALEF-K7Q2')
    expect(await screen.findByText('다윗 님과 친구가 되었어요!')).toBeInTheDocument()
    expect(input()).toHaveValue('')
  })

  test('full code with prefix is passed as is (lowercase normalised)', async () => {
    const user = userEvent.setup()
    const api = fakeCloud({ leaderboard: async () => ROWS, addFriend: async () => ({ userId: 'f3', nickname: '다윗', avatarId: 'naomi' }) })
    renderWithCloud(<FriendsManager />, api)
    await screen.findByText('룻')
    await user.type(input(), 'alef-k7q2')
    await user.click(screen.getByRole('button', { name: '추가' }))
    expect(api.addFriend).toHaveBeenCalledWith('ALEF-K7Q2')
  })

  test.each([
    ['not_found', '초대 코드를 찾을 수 없어요'],
    ['self', '내 코드예요'],
    ['already', '이미 친구예요'],
    ['network', '친구를 추가하지 못했어요. 잠시 후 다시 시도해 주세요.'],
  ] as const)('error %s -> message', async (code, msg) => {
    const user = userEvent.setup()
    const api = fakeCloud({ leaderboard: async () => ROWS, addFriend: async () => { throw new CloudError(code) } })
    renderWithCloud(<FriendsManager />, api)
    await screen.findByText('룻')
    await user.type(input(), 'K7Q2')
    await user.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(msg)
  })

  test('invalid input is rejected locally without calling the server', async () => {
    const user = userEvent.setup()
    const api = fakeCloud({ leaderboard: async () => ROWS })
    renderWithCloud(<FriendsManager />, api)
    await screen.findByText('룻')
    await user.type(input(), 'K0O1')
    await user.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('초대 코드를 찾을 수 없어요')
    expect(api.addFriend).not.toHaveBeenCalled()
  })

  test('add button is disabled while a request is in flight', async () => {
    const user = userEvent.setup()
    const api = fakeCloud({ leaderboard: async () => ROWS, addFriend: () => new Promise(() => {}) })
    renderWithCloud(<FriendsManager />, api)
    await screen.findByText('룻')
    await user.type(input(), 'K7Q2')
    await user.click(screen.getByRole('button', { name: '추가' }))
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })

  test('remove requires in-page confirmation; 아니오 cancels', async () => {
    const user = userEvent.setup()
    const api = fakeCloud({ leaderboard: async () => ROWS })
    renderWithCloud(<FriendsManager />, api)
    await screen.findByText('룻')
    await user.click(screen.getAllByRole('button', { name: '친구 끊기' })[0])
    expect(api.removeFriend).not.toHaveBeenCalled()
    expect(screen.getByText('정말 끊을까요?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '아니오' }))
    expect(screen.queryByText('정말 끊을까요?')).toBeNull()
    expect(api.removeFriend).not.toHaveBeenCalled()
  })

  test('only one row in confirm state; 예 removes that friend', async () => {
    const user = userEvent.setup()
    const api = fakeCloud({ leaderboard: async () => ROWS })
    renderWithCloud(<FriendsManager />, api)
    await screen.findByText('룻')
    await user.click(screen.getAllByRole('button', { name: '친구 끊기' })[0])
    await user.click(screen.getAllByRole('button', { name: '친구 끊기' })[0])
    expect(screen.getAllByText('정말 끊을까요?')).toHaveLength(1)
    const items = screen.getAllByRole('listitem')
    await user.click(within(items[1]).getByRole('button', { name: '예' }))
    expect(api.removeFriend).toHaveBeenCalledWith('f2')
  })

  test('connecting status shows loading', async () => {
    renderWithCloud(<FriendsManager />, fakeCloud({ ensureSession: () => new Promise(() => {}) }))
    expect(await screen.findByText('불러오는 중…')).toBeInTheDocument()
  })

  test('startup error status: message and retry restarts startup', async () => {
    let fail = true
    const api = fakeCloud({ ensureSession: async () => { if (fail) throw new Error('x'); return { id: 'me', isGuest: true } } })
    renderWithCloud(<FriendsManager />, api)
    expect(await screen.findByText(/순위를 불러오지 못했어요/)).toBeInTheDocument()
    expect(screen.queryByLabelText('친구 코드')).toBeNull()
    const calls = api.ensureSession.mock.calls.length
    fail = false
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(api.ensureSession.mock.calls.length).toBeGreaterThan(calls)
    expect(await screen.findByText('ALEF-ME22')).toBeInTheDocument()
  })

  test('offline leaderboard shows the offline line', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderWithCloud(<FriendsManager />, fakeCloud({ leaderboard: async () => { throw new TypeError('Failed to fetch') } }))
    expect(await screen.findByText('인터넷에 연결되면 순위가 보여요')).toBeInTheDocument()
  })

  test('leaderboard error after startup: inline retry', async () => {
    const api = fakeCloud({ leaderboard: async () => { throw new Error('x') } })
    renderWithCloud(<FriendsManager />, api)
    expect(await screen.findByText(/순위를 불러오지 못했어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
