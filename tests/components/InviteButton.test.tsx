import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteButton } from '@/components/InviteButton'

const URL_ = `${window.location.origin}/invite/ALEF-AB23`
afterEach(() => { vi.unstubAllGlobals(); Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }) })
const setNav = (share?: unknown, writeText?: unknown) => {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
  Object.defineProperty(navigator, 'clipboard', { value: writeText ? { writeText } : undefined, configurable: true })
}

describe('InviteButton', () => {
  test('uses navigator.share with the exact payload', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    setNav(share)
    render(<InviteButton code="ALEF-AB23" nickname="다윗" />)
    await userEvent.click(screen.getByRole('button', { name: /친구 초대하기/ }))
    expect(share).toHaveBeenCalledWith({ title: '알레프 여정', text: '다윗 님이 히브리어 여정에 초대했어요', url: URL_ })
  })
  test('without share, copies to clipboard and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setNav(undefined, writeText)
    render(<InviteButton code="ALEF-AB23" nickname="다윗" />)
    await userEvent.click(screen.getByRole('button', { name: /친구 초대하기/ }))
    expect(writeText).toHaveBeenCalledWith(URL_)
    expect(await screen.findByText('초대 링크를 복사했어요')).toBeInTheDocument()
  })
  test('share cancelled (AbortError) does nothing more', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'))
    const writeText = vi.fn()
    setNav(share, writeText)
    render(<InviteButton code="ALEF-AB23" nickname="다윗" />)
    await userEvent.click(screen.getByRole('button', { name: /친구 초대하기/ }))
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('초대 링크를 복사했어요')).toBeNull()
  })
  test('share fails otherwise: falls back to clipboard', async () => {
    const share = vi.fn().mockRejectedValue(new Error('nope'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    setNav(share, writeText)
    render(<InviteButton code="ALEF-AB23" nickname="다윗" />)
    await userEvent.click(screen.getByRole('button', { name: /친구 초대하기/ }))
    expect(writeText).toHaveBeenCalledWith(URL_)
  })
  test('everything fails: shows the link as text', async () => {
    setNav(undefined, vi.fn().mockRejectedValue(new Error('no')))
    render(<InviteButton code="ALEF-AB23" nickname="다윗" />)
    await userEvent.click(screen.getByRole('button', { name: /친구 초대하기/ }))
    expect(await screen.findByText(URL_)).toBeInTheDocument()
  })
})
