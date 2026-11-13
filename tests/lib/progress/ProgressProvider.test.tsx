import { describe, expect, test, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { memoryStore, renderWithProgress, TODAY } from '../../utils/progress'
import { emptySnapshot } from '@/lib/progress/snapshot'

const listener = vi.fn()
const unsub: { current: (() => void) | null } = { current: null }

function Probe() {
  const p = useProgress()
  return (
    <div>
      <span>ready:{String(p.ready)}</span>
      <span>today:{p.today}</span>
      <span>xp:{p.snapshot.xp}</span>
      <span>streak:{p.snapshot.streak.current}</span>
      <span>reviews:{Object.keys(p.snapshot.reviews).join(',')}</span>
      <button onClick={() => p.completeLesson({ id: 'r', type: 'reading' }, { score: 100, perfect: false }, ['H1'])}>done</button>
      <button onClick={() => p.reviewAnswered('H2', false)}>review</button>
      <button onClick={() => p.replaceSnapshot({ ...emptySnapshot(TODAY), xp: 500 })}>replace</button>
      <button onClick={() => { unsub.current = p.subscribe(listener) }}>sub</button>
      <button onClick={() => unsub.current?.()}>unsub</button>
    </div>
  )
}

describe('ProgressProvider', () => {
  test('loads, applies start of day, and saves', async () => {
    const store = memoryStore()
    renderWithProgress(<Probe />, store)
    expect(await screen.findByText('ready:true')).toBeInTheDocument()
    expect(screen.getByText(`today:${TODAY}`)).toBeInTheDocument()
    expect(store.current().restTokens).toBe(1)
  })
  test('completeLesson updates xp, learned words, and persists', async () => {
    const store = memoryStore()
    renderWithProgress(<Probe />, store)
    await screen.findByText('ready:true')
    act(() => screen.getByText('done').click())
    expect(screen.getByText('xp:10')).toBeInTheDocument()
    expect(screen.getByText('streak:1')).toBeInTheDocument()
    expect(screen.getByText('reviews:H1')).toBeInTheDocument()
    expect(store.current().xp).toBe(10)
  })
  test('reviewAnswered records a review', async () => {
    const store = memoryStore(emptySnapshot(TODAY))
    renderWithProgress(<Probe />, store)
    await screen.findByText('ready:true')
    act(() => screen.getByText('review').click())
    expect(store.current().reviews.H2.wrongCount).toBe(1)
  })
  describe('subscribe / replaceSnapshot', () => {
    test('listener gets the XP event on completeLesson, not on review; unsubscribe stops it', async () => {
      listener.mockClear()
      renderWithProgress(<Probe />)
      await screen.findByText('ready:true')
      act(() => screen.getByText('sub').click())
      act(() => screen.getByText('done').click())
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].xp).toBe(10)
      expect(listener.mock.calls[0][1]).toEqual({ week: '2026-W45', gained: 10, streak: 1 })
      act(() => screen.getByText('review').click())
      expect(listener).toHaveBeenCalledTimes(2)
      expect(listener.mock.calls[1][1]).toBeNull()
      act(() => screen.getByText('unsub').click())
      act(() => screen.getByText('done').click())
      expect(listener).toHaveBeenCalledTimes(2)
    })
    test('replaceSnapshot updates the screen, saves, and does not notify', async () => {
      listener.mockClear()
      const { store } = renderWithProgress(<Probe />)
      await screen.findByText('ready:true')
      act(() => screen.getByText('sub').click())
      act(() => screen.getByText('replace').click())
      expect(screen.getByText('xp:500')).toBeInTheDocument()
      expect(store.current().xp).toBe(500)
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
