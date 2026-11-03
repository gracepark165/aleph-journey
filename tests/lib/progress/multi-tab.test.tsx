import { describe, expect, test } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { ProgressProvider, useProgress } from '@/lib/progress/ProgressProvider'
import { STORAGE_KEY } from '@/lib/progress/store'
import { recordLessonComplete } from '@/lib/progress/streak'
import { FIXED_NOW, memoryStore, TODAY } from '../../utils/progress'

function Tab({ name, lesson }: { name: string; lesson: string }) {
  const p = useProgress()
  return (
    <div>
      <span>{name}-xp:{p.snapshot.xp}</span>
      <span>{name}-ready:{String(p.ready)}</span>
      <button onClick={() => p.completeLesson({ id: lesson, type: 'quiz' }, { score: 50, perfect: false })}>{name}-done</button>
    </div>
  )
}

describe('progress shared across tabs', () => {
  test('a second tab does not overwrite progress saved by the first', async () => {
    const store = memoryStore()
    render(
      <>
        <ProgressProvider store={store} now={() => FIXED_NOW}><Tab name="a" lesson="q1" /></ProgressProvider>
        <ProgressProvider store={store} now={() => FIXED_NOW}><Tab name="b" lesson="q2" /></ProgressProvider>
      </>,
    )
    await screen.findByText('b-ready:true')
    act(() => screen.getByText('b-done').click())
    act(() => screen.getByText('a-done').click())
    expect(Object.keys(store.current().completed).sort()).toEqual(['q1', 'q2'])
    expect(store.current().xp).toBe(20)
  })
  test('storage event from another tab refreshes the view', async () => {
    const store = memoryStore()
    render(<ProgressProvider store={store} now={() => FIXED_NOW}><Tab name="a" lesson="q1" /></ProgressProvider>)
    await screen.findByText('a-ready:true')
    store.save(recordLessonComplete(store.current(), { id: 'x', type: 'roleplay' }, { score: 100, perfect: false }, TODAY, 'x'))
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY })) })
    expect(screen.getByText('a-xp:20')).toBeInTheDocument()
  })
})
