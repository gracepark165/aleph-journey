'use client'

import { useState } from 'react'
import type { Lexicon } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { buildReviewQuestion } from '@/lib/progress/review'
import { ChoiceQuestionCard } from './ChoiceQuestionCard'

export function ReviewSession({ lemmaIds, lexicon, rng = Math.random, onDone }: { lemmaIds: string[]; lexicon: Lexicon; rng?: () => number; onDone(): void }) {
  const { reviewAnswered } = useProgress()
  const [questions] = useState(() => lemmaIds.filter(id => lexicon[id]).map(id => buildReviewQuestion(id, lexicon, rng)))
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])

  if (index >= questions.length) {
    return (
      <section className="card center">
        <h2>복습 완료! 정답 {results.filter(Boolean).length}/{questions.length}</h2>
        <button type="button" className="btn" onClick={onDone}>단어장으로</button>
      </section>
    )
  }

  const q = questions[index]
  const answered = results.length > index
  return (
    <section>
      <div className="progress-bar" aria-label={`${index + 1} / ${questions.length}`}><span style={{ width: `${(results.length / questions.length) * 100}%` }} /></div>
      <ChoiceQuestionCard key={index} question={q} onAnswered={correct => {
        if (answered) return
        reviewAnswered(q.lemmaId!, correct)
        setResults(r => [...r, correct])
      }} />
      {answered && <button type="button" className="btn block" style={{ marginTop: 12 }} onClick={() => setIndex(i => i + 1)}>다음</button>}
    </section>
  )
}
