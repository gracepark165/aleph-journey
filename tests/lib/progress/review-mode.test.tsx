import { describe, expect, test } from 'vitest'
import { act, screen } from '@testing-library/react'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { REVIEW_MODE_KEY } from '@/lib/prefs'
import { renderWithProgress } from '../../utils/progress'

function Probe() {
  const p = useProgress()
  return (
    <div>
      <span>ready:{String(p.ready)}</span>
      <span>unlockAll:{String(p.unlockAll)}</span>
      <button onClick={() => p.setUnlockAll(false)}>off</button>
    </div>
  )
}

describe('review mode', () => {
  test('?unlock=all turns it on and remembers it', async () => {
    window.history.replaceState({}, '', '/journey?unlock=all')
    renderWithProgress(<Probe />)
    expect(await screen.findByText('unlockAll:true')).toBeInTheDocument()
    expect(localStorage.getItem(REVIEW_MODE_KEY)).toBe('1')
  })
  test('remembered flag survives without the query; turning off clears it', async () => {
    localStorage.setItem(REVIEW_MODE_KEY, '1')
    renderWithProgress(<Probe />)
    expect(await screen.findByText('unlockAll:true')).toBeInTheDocument()
    act(() => screen.getByText('off').click())
    expect(screen.getByText('unlockAll:false')).toBeInTheDocument()
    expect(localStorage.getItem(REVIEW_MODE_KEY)).toBeNull()
  })
  test('off by default', async () => {
    renderWithProgress(<Probe />)
    await screen.findByText('ready:true')
    expect(screen.getByText('unlockAll:false')).toBeInTheDocument()
  })
})
