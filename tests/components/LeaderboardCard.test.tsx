import { afterEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeaderboardCard } from '@/components/LeaderboardCard'
import { ProfileCard } from '@/components/ProfileCard'
import type { LeaderboardRow } from '@/lib/cloud/types'
import { fakeCloud } from '../utils/fake-cloud'
import { renderWithCloud, renderWithProgress } from '../utils/progress'

const row = (o: Partial<LeaderboardRow>): LeaderboardRow => ({ userId: 'x', nickname: 'x', avatarId: 'naomi', totalXp: 0, weekXp: 0, streak: 0, isMe: false, crown: false, ...o })
const ROWS = [
  row({ userId: 'f1', nickname: '룻', weekXp: 90, streak: 5, totalXp: 80, crown: true }),
  row({ userId: 'me', nickname: '순례자', weekXp: 50, streak: 2, totalXp: 10, isMe: true }),
]

afterEach(() => { vi.restoreAllMocks() })

describe('LeaderboardCard', () => {
  test('renders nothing when cloud is off', () => {
    const { container } = renderWithProgress(<LeaderboardCard />)
    expect(container).toBeEmptyDOMElement()
  })
  test('rows in order with me highlighted, crown, rank letter, XP and streak', async () => {
    renderWithCloud(<LeaderboardCard />, fakeCloud({ leaderboard: async () => ROWS }))
    expect(await screen.findByText('🏆 이번 주 친구 순위')).toBeInTheDocument()
    expect(screen.getByText('11월 2일 ~ 8일')).toBeInTheDocument()
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('1')
    expect(items[0]).toHaveTextContent('룻')
    expect(items[0]).toHaveTextContent('👑')
    expect(items[0]).toHaveTextContent('90 XP')
    expect(items[0]).toHaveTextContent('🔥 5')
    expect(items[0]).toHaveTextContent('ג')
    expect(items[1]).toHaveTextContent('2')
    expect(items[1]).toHaveTextContent('순례자 (나)')
    expect(items[1]).toHaveClass('me')
    expect(items[1]).not.toHaveTextContent('👑')
    expect(items[1]).toHaveTextContent('א')
    expect(screen.getByRole('button', { name: /친구 초대하기/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '코드로 추가' })).toHaveAttribute('href', '/friends')
  })
  test('no friends: invite prompt', async () => {
    renderWithCloud(<LeaderboardCard />, fakeCloud({ leaderboard: async () => [row({ userId: 'me', nickname: '순례자', isMe: true })] }))
    expect(await screen.findByText('친구를 초대해 함께 경쟁해 보세요')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /친구 초대하기/ }).length).toBeGreaterThanOrEqual(1)
  })
  test('loading shows 불러오는 중, not the empty message', async () => {
    renderWithCloud(<LeaderboardCard />, fakeCloud({ leaderboard: () => new Promise(() => {}) }))
    expect(await screen.findByText('불러오는 중…')).toBeInTheDocument()
    expect(screen.queryByText('친구를 초대해 함께 경쟁해 보세요')).toBeNull()
  })
  test('error: message and retry refreshes', async () => {
    let fail = true
    const api = fakeCloud({ leaderboard: async () => { if (fail) throw new Error('x'); return ROWS } })
    renderWithCloud(<LeaderboardCard />, api)
    expect(await screen.findByText(/순위를 불러오지 못했어요/)).toBeInTheDocument()
    const calls = api.leaderboard.mock.calls.length
    fail = false
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(api.leaderboard.mock.calls.length).toBeGreaterThan(calls)
    expect(await screen.findByText('룻')).toBeInTheDocument()
  })
  test('offline message', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderWithCloud(<LeaderboardCard />, fakeCloud({ leaderboard: async () => { throw new TypeError('Failed to fetch') } }))
    expect(await screen.findByText('인터넷에 연결되면 순위가 보여요')).toBeInTheDocument()
  })
})

describe('ProfileCard crown', () => {
  test('shows 👑 when my row has crown', async () => {
    const api = fakeCloud({ leaderboard: async () => [row({ userId: 'me', nickname: '순례자', isMe: true, crown: true })] })
    renderWithCloud(<ProfileCard />, api)
    expect(await screen.findByLabelText('지난주 1위')).toHaveTextContent('👑')
  })
  test('no crown by default', async () => {
    renderWithProgress(<ProfileCard />)
    await screen.findByText('순례자')
    expect(screen.queryByLabelText('지난주 1위')).toBeNull()
  })
})
