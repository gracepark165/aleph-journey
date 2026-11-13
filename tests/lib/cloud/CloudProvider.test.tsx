import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { useCloud } from '@/lib/cloud/CloudProvider'
import { enqueue, flush, pending } from '@/lib/cloud/outbox'
import type { LeaderboardRow } from '@/lib/cloud/types'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { emptySnapshot } from '@/lib/progress/snapshot'
import { fakeCloud } from '../../utils/fake-cloud'
import { FIXED_NOW, memoryStore, renderWithCloud, TODAY } from '../../utils/progress'
import { ProgressProvider } from '@/lib/progress/ProgressProvider'
import { CloudProvider } from '@/lib/cloud/CloudProvider'

const ROW: LeaderboardRow = { userId: 'f1', nickname: '룻', avatarId: 'naomi', totalXp: 80, weekXp: 40, streak: 3, isMe: false, crown: false }

function Probe() {
  const c = useCloud()
  const p = useProgress()
  return (
    <div>
      <span>status:{c.status}</span>
      <span>board:{c.leaderboard.state}</span>
      <span>rows:{c.leaderboard.rows.map(r => r.nickname).join(',')}</span>
      <span>code:{c.profile?.friendCode ?? '-'}</span>
      <span>xp:{p.snapshot.xp}</span>
      <span>nick:{p.profile.nickname}</span>
      <button onClick={() => p.completeLesson({ id: 'r1', type: 'reading' }, { score: 100, perfect: true })}>done</button>
      <button onClick={() => p.reviewAnswered('H1', true)}>review</button>
      <button onClick={() => p.setProfile({ nickname: '요나', avatarId: 'sailor' })}>rename</button>
    </div>
  )
}

// The outbox keeps an in-memory copy, so drain it between tests.
beforeEach(async () => { await flush(async () => {}) })
afterEach(() => { vi.restoreAllMocks() })

describe('CloudProvider', () => {
  test('api null: status off and no calls', async () => {
    renderWithCloud(<Probe />, null)
    expect(await screen.findByText('status:off')).toBeInTheDocument()
    expect(screen.getByText('board:idle')).toBeInTheDocument()
  })

  test('useCloud outside a provider is a safe off value', async () => {
    function Bare() {
      const c = useCloud()
      return <span>bare:{c.status}</span>
    }
    render(<Bare />)
    expect(screen.getByText('bare:off')).toBeInTheDocument()
  })

  test('runs the startup sequence in order and shows the leaderboard', async () => {
    const order: string[] = []
    const api = fakeCloud({
      ensureSession: async () => { order.push('ensureSession'); return { id: 'me', isGuest: true } },
      ensureProfile: async () => { order.push('ensureProfile'); return { nickname: '순례자', avatarId: 'zoe', friendCode: 'ALEF-ME22' } },
      pullProgress: async () => { order.push('pullProgress'); return null },
      pushProgress: async () => { order.push('pushProgress') },
      leaderboard: async () => { order.push('leaderboard'); return [ROW] },
    })
    renderWithCloud(<Probe />, api)
    expect(await screen.findByText('status:ready')).toBeInTheDocument()
    expect(screen.getByText('board:ready')).toBeInTheDocument()
    expect(screen.getByText('rows:룻')).toBeInTheDocument()
    expect(screen.getByText('code:ALEF-ME22')).toBeInTheDocument()
    expect(order).toEqual(['ensureSession', 'ensureProfile', 'pullProgress', 'pushProgress', 'leaderboard'])
    expect(api.leaderboard).toHaveBeenCalledWith('2026-W45')
    expect(api.updateProfile).not.toHaveBeenCalled()
  })

  test('server profile overwrites the local one without bouncing back as updateProfile', async () => {
    const api = fakeCloud({ ensureProfile: async () => ({ nickname: '다윗', avatarId: 'saul', friendCode: 'ALEF-ME22' }) })
    renderWithCloud(<Probe />, api)
    expect(await screen.findByText('nick:다윗')).toBeInTheDocument()
    await screen.findByText('status:ready')
    expect(api.ensureProfile).toHaveBeenCalledWith({ nickname: '순례자', avatarId: 'zoe' })
    expect(api.updateProfile).not.toHaveBeenCalled()
  })

  test('a local profile edit calls updateProfile once', async () => {
    const api = fakeCloud()
    renderWithCloud(<Probe />, api)
    await screen.findByText('status:ready')
    act(() => screen.getByText('rename').click())
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledWith({ nickname: '요나', avatarId: 'sailor' }))
    await new Promise(r => setTimeout(r, 20))
    expect(api.updateProfile).toHaveBeenCalledTimes(1)
  })

  test('merges server progress (xp 50) with local (xp 15) and pushes the result', async () => {
    const store = memoryStore({ ...emptySnapshot(TODAY), xp: 15 })
    const api = fakeCloud({ pullProgress: async () => ({ ...emptySnapshot(TODAY), xp: 50 }) })
    renderWithCloud(<Probe />, api, { store })
    expect(await screen.findByText('xp:50')).toBeInTheDocument()
    await screen.findByText('status:ready')
    expect(api.pushProgress).toHaveBeenCalledWith(expect.objectContaining({ xp: 50 }))
    expect(store.current().xp).toBe(50)
  })

  test('malformed server progress is ignored and local progress is pushed', async () => {
    const store = memoryStore({ ...emptySnapshot(TODAY), xp: 15 })
    const api = fakeCloud({ pullProgress: async () => ({ version: 1, xp: 'lots' }) as never })
    renderWithCloud(<Probe />, api, { store })
    await screen.findByText('status:ready')
    expect(screen.getByText('xp:15')).toBeInTheDocument()
    expect(api.pushProgress).toHaveBeenCalledWith(expect.objectContaining({ xp: 15 }))
  })

  test('ensureSession failure: status error, leaderboard error, app still renders', async () => {
    const api = fakeCloud({ ensureSession: async () => { throw new Error('down') } })
    renderWithCloud(<Probe />, api)
    expect(await screen.findByText('status:error')).toBeInTheDocument()
    expect(screen.getByText('board:error')).toBeInTheDocument()
    expect(screen.getByText('xp:0')).toBeInTheDocument()
    expect(api.leaderboard).not.toHaveBeenCalled()
  })

  test('failure while offline shows the leaderboard as offline, and the online event retries', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    let fail = true
    const api = fakeCloud({ ensureSession: async () => { if (fail) throw new Error('offline'); return { id: 'me', isGuest: true } } })
    renderWithCloud(<Probe />, api)
    expect(await screen.findByText('board:offline')).toBeInTheDocument()
    fail = false
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(await screen.findByText('status:ready')).toBeInTheDocument()
    expect(api.ensureSession).toHaveBeenCalledTimes(2)
  })

  test('does not run the startup sequence twice concurrently (StrictMode + online)', async () => {
    let release!: () => void
    const api = fakeCloud({ ensureSession: () => new Promise(res => { release = () => res({ id: 'me', isGuest: true }) }) })
    render(
      <StrictMode>
        <ProgressProvider store={memoryStore()} now={() => FIXED_NOW}>
          <CloudProvider api={api} pushDelayMs={0}><Probe /></CloudProvider>
        </ProgressProvider>
      </StrictMode>,
    )
    await screen.findByText('status:connecting')
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(api.ensureSession).toHaveBeenCalledTimes(1)
    await act(async () => { release() })
    expect(await screen.findByText('status:ready')).toBeInTheDocument()
    expect(api.ensureSession).toHaveBeenCalledTimes(1)
  })

  test('lesson completion records XP, pushes progress and refreshes the leaderboard', async () => {
    const api = fakeCloud()
    renderWithCloud(<Probe />, api)
    await screen.findByText('status:ready')
    api.pushProgress.mockClear(); api.leaderboard.mockClear()
    act(() => screen.getByText('done').click())
    await waitFor(() => expect(api.recordXp).toHaveBeenCalledWith('2026-W45', 15, 1))
    await waitFor(() => expect(api.pushProgress).toHaveBeenCalledWith(expect.objectContaining({ xp: 15 })))
    await waitFor(() => expect(api.leaderboard).toHaveBeenCalled())
    expect(pending()).toEqual([])
  })

  test('recordXp failure keeps the event in the outbox', async () => {
    const api = fakeCloud({ recordXp: async () => { throw new Error('offline') } })
    renderWithCloud(<Probe />, api)
    await screen.findByText('status:ready')
    act(() => screen.getByText('done').click())
    await waitFor(() => expect(api.recordXp).toHaveBeenCalled())
    expect(pending()).toEqual([{ week: '2026-W45', gained: 15, streak: 1 }])
  })

  test('a review sends no recordXp but still pushes progress', async () => {
    const api = fakeCloud()
    renderWithCloud(<Probe />, api)
    await screen.findByText('status:ready')
    api.pushProgress.mockClear()
    act(() => screen.getByText('review').click())
    await waitFor(() => expect(api.pushProgress).toHaveBeenCalledTimes(1))
    expect(api.recordXp).not.toHaveBeenCalled()
  })

  test('queued events with gained < 1 are dropped, not sent', async () => {
    enqueue({ week: '2026-W45', gained: 0, streak: 1 })
    enqueue({ week: '2026-W45', gained: 5, streak: 1 })
    const api = fakeCloud()
    renderWithCloud(<Probe />, api)
    await screen.findByText('status:ready')
    expect(api.recordXp).toHaveBeenCalledTimes(1)
    expect(api.recordXp).toHaveBeenCalledWith('2026-W45', 5, 1)
    expect(pending()).toEqual([])
  })

  test('progress pushes are debounced', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const api = fakeCloud()
      renderWithCloud(<Probe />, api, { pushDelayMs: 1000 })
      await screen.findByText('status:ready')
      api.pushProgress.mockClear()
      act(() => screen.getByText('review').click())
      act(() => screen.getByText('review').click())
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(api.pushProgress).not.toHaveBeenCalled()
      await act(async () => { await vi.advanceTimersByTimeAsync(600) })
      expect(api.pushProgress).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('lookupCode wraps profileByCode', async () => {
    const hit = { userId: 'f1', nickname: '룻', avatarId: 'naomi', isMe: false }
    const api = fakeCloud({ profileByCode: async () => hit })
    let lookup!: ReturnType<typeof useCloud>['lookupCode']
    function Grab() { lookup = useCloud().lookupCode; return null }
    renderWithCloud(<><Probe /><Grab /></>, api)
    await screen.findByText('status:ready')
    await expect(lookup('ALEF-AB23')).resolves.toEqual(hit)
    expect(api.profileByCode).toHaveBeenCalledWith('ALEF-AB23')
  })
})
