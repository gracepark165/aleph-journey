import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { fakeCloud, type FakeCloud } from '../utils/fake-cloud'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace }) }))
const hardNavigate = vi.fn()
vi.mock('@/lib/navigate', () => ({ hardNavigate: (url: string) => hardNavigate(url) }))
let api: FakeCloud | null
vi.mock('@/lib/cloud/config', () => ({ createCloudApi: () => api }))

import AuthCallbackPage from '@/app/auth/callback/page'

const TICKET_KEY = 'aleph-journey:ticket'
const visit = (url: string) => window.history.replaceState(null, '', url)

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  api = fakeCloud()
})
afterEach(() => {
  vi.useRealTimers()
  visit('/')
})

describe('/auth/callback', () => {
  test('finishes auth, then reloads the safe next path', async () => {
    visit('/auth/callback?next=%2Ffriends&code=abc')
    render(<AuthCallbackPage />)
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/friends'))
    expect(api!.finishAuth).toHaveBeenCalledTimes(1)
    expect(replace).not.toHaveBeenCalled()
  })

  test('an unsafe next falls back to /', async () => {
    visit('/auth/callback?next=%2F%09%2Fevil.com&code=abc')
    render(<AuthCallbackPage />)
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/'))
  })

  test('still continues when finishAuth fails', async () => {
    api = fakeCloud({ finishAuth: async () => { throw new Error('x') } })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    visit('/auth/callback?next=%2Fprofile')
    render(<AuthCallbackPage />)
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/profile'))
  })

  test('cancelled: shows the message, drops the ticket and goes to /profile after 3 s', async () => {
    vi.useFakeTimers()
    sessionStorage.setItem(TICKET_KEY, '{"ticket":"t","guestId":"g"}')
    visit('/auth/callback?next=%2F&error=access_denied&error_description=cancelled')
    render(<AuthCallbackPage />)
    expect(screen.getByText('카카오 연결이 취소되었어요')).toBeInTheDocument()
    expect(sessionStorage.getItem(TICKET_KEY)).toBeNull()
    expect(api!.finishAuth).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(3000) })
    expect(replace).toHaveBeenCalledWith('/profile')
  })

  test('errors in the hash are handled too', () => {
    visit('/auth/callback?next=%2F#error=server_error&error_description=x')
    render(<AuthCallbackPage />)
    expect(screen.getByText('카카오 연결이 취소되었어요')).toBeInTheDocument()
  })

  test('identity already linked elsewhere: continues with Kakao login and keeps the ticket', async () => {
    sessionStorage.setItem(TICKET_KEY, '{"ticket":"t","guestId":"g"}')
    visit('/auth/callback?next=%2Ffriends&error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked')
    render(<AuthCallbackPage />)
    await waitFor(() => expect(api!.continueKakaoLogin).toHaveBeenCalledWith('/friends'))
    expect(screen.queryByText('카카오 연결이 취소되었어요')).toBeNull()
    expect(sessionStorage.getItem(TICKET_KEY)).not.toBeNull()
    expect(api!.finishAuth).not.toHaveBeenCalled()
  })

  test('identity already linked, but continuing fails: falls back to the cancelled flow', async () => {
    api = fakeCloud({ continueKakaoLogin: async () => { throw new Error('x') } })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    visit('/auth/callback?next=%2F&error_code=identity_already_exists')
    render(<AuthCallbackPage />)
    expect(await screen.findByText('카카오 연결이 취소되었어요')).toBeInTheDocument()
  })
})
