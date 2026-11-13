import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntroScene } from '@/components/IntroScene'

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
  test('skip and start both finish the intro', async () => {
    const onDone = vi.fn()
    render(<IntroScene onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: '건너뛰기' }))
    await userEvent.click(screen.getByRole('button', { name: '여정 시작하기' }))
    expect(onDone).toHaveBeenCalledTimes(2)
  })
})
