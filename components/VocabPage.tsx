'use client'

import { useState } from 'react'
import type { Lexicon } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { dueReviews } from '@/lib/progress/review'
import { HebrewText } from './HebrewText'
import { ReviewSession } from './ReviewSession'
import { ZoeSays } from './Zoe'

export function VocabPage({ lexicon }: { lexicon: Lexicon }) {
  const { snapshot, today, ready } = useProgress()
  const [session, setSession] = useState<string[] | null>(null)

  if (!ready) return <p className="muted center">불러오는 중…</p>
  if (session) return <ReviewSession lemmaIds={session} lexicon={lexicon} onDone={() => setSession(null)} />

  const due = dueReviews(snapshot, today).filter(r => lexicon[r.lemmaId])
  const learned = Object.values(snapshot.reviews).filter(r => lexicon[r.lemmaId]).sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))

  return (
    <>
      <section className="card center">
        <p>{due.length > 0 ? `오늘 복습할 단어 ${due.length}개` : '오늘은 복습할 단어가 없어요'}</p>
        <button type="button" className="btn" disabled={due.length === 0} onClick={() => setSession(due.map(r => r.lemmaId))}>복습 시작</button>
      </section>
      {learned.length === 0 ? (
        <div style={{ marginTop: 20 }}><ZoeSays>아직 배운 단어가 없어요. 첫 레슨을 시작해 보세요!</ZoeSays></div>
      ) : (
        <ul className="vocab-list" style={{ marginTop: 16 }}>
          {learned.map(r => {
            const lx = lexicon[r.lemmaId]
            return (
              <li key={r.lemmaId} className="card vocab-item">
                <span>
                  <strong>{lx.glossKo}</strong>
                  <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>{lx.translit} · 다음 복습 {r.nextReviewDate <= today ? '오늘' : r.nextReviewDate}</span>
                </span>
                <HebrewText text={lx.lemma} />
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
