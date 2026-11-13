import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntroScene } from '@/components/IntroScene'
import { INTRO_MUSIC_SRC } from '@/lib/intro-audio'

let play: ReturnType<typeof vi.fn>
let pause: ReturnType<typeof vi.fn>
beforeEach(() => {
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) { return play(this.src) })
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(pause)
})
afterEach(() => vi.restoreAllMocks())

const tapToStart = () => userEvent.click(screen.getByRole('button', { name: /화면을 눌러 시작하세요/ }))

describe('IntroScene', () => {
  test('tells the story with the Genesis 15:5 line', () => {
    render(<IntroScene onDone={() => {}} />)
    expect(screen.getByRole('dialog', { name: '인트로' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /밤하늘을 올려다보는 조에/ })).toBeInTheDocument()
    expect(screen.getByText('어느 밤, 조에는 하늘을 올려다보았어요.')).toBeInTheDocument()
    expect(screen.getByText('별이 떨어진 곳에, 오래된 이야기들이 기다리고 있대요.')).toBeInTheDocument()
    expect(screen.getByText('הַבֶּט־נָא הַשָּׁמַיְמָה וּסְפֹר הַכּוֹכָבִים')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText(/창세기 15:5/)).toBeInTheDocument()
    expect(screen.getByTestId('shooting-star')).toBeInTheDocument()
  })
  test('waits for a tap, then plays the scene with music', async () => {
    render(<IntroScene onDone={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: '인트로' })
    expect(dialog).not.toHaveClass('is-playing')
    expect(play).not.toHaveBeenCalled()
    await tapToStart()
    expect(dialog).toHaveClass('is-playing')
    expect(play).toHaveBeenCalledWith(expect.stringContaining(INTRO_MUSIC_SRC))
  })
  test('can start without sound', async () => {
    render(<IntroScene onDone={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '소리 없이 보기' }))
    expect(screen.getByRole('dialog', { name: '인트로' })).toHaveClass('is-playing')
    expect(play).not.toHaveBeenCalled()
  })
  test('mute button toggles the music', async () => {
    render(<IntroScene onDone={() => {}} />)
    await tapToStart()
    const mute = screen.getByRole('button', { name: '음악 끄기' })
    await userEvent.click(mute)
    expect(screen.getByRole('button', { name: '음악 켜기' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('audio')?.muted).toBe(true)
  })
  test('skip and start both finish the intro, and leaving stops the music', async () => {
    const onDone = vi.fn()
    const { unmount } = render(<IntroScene onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
    await tapToStart()
    await userEvent.click(screen.getByRole('button', { name: '여정 시작하기' }))
    expect(onDone).toHaveBeenCalledTimes(2)
    unmount()
    await vi.waitFor(() => expect(pause).toHaveBeenCalled())
  })
  test('no synthesized sound effect plays with the shooting star', async () => {
    const ctor = vi.fn()
    ;(window as unknown as { AudioContext: unknown }).AudioContext = ctor
    render(<IntroScene onDone={() => {}} />)
    await tapToStart()
    await new Promise(r => setTimeout(r, 2800))
    expect(ctor).not.toHaveBeenCalled()
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
  }, 10000)
})
