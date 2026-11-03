import { describe, expect, test } from 'vitest'
import { act, screen } from '@testing-library/react'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { memoryStore, renderWithProgress, TODAY } from '../../utils/progress'
import { emptySnapshot } from '@/lib/progress/snapshot'

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
})
