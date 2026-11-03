'use client'

import { useState } from 'react'
import type { OrderQuestion } from '@/lib/content/schema'
import { gradeOrder } from '@/lib/grader/rules'
import { TokenPicker } from './TokenPicker'
import { HebrewText } from './HebrewText'

export function OrderQuestionCard({ question, onAnswered }: { question: OrderQuestion; onAnswered(correct: boolean): void }) {
  const [picked, setPicked] = useState<number[]>([])
  const [result, setResult] = useState<boolean | null>(null)

  const check = () => {
    if (result !== null) return
    const ok = gradeOrder(question, picked.map(i => question.tokens[i]))
    setResult(ok)
    onAnswered(ok)
  }

  return (
    <section className="card">
      <p className="center">{question.promptKo}</p>
      <TokenPicker tokens={question.tokens} picked={picked} onChange={setPicked} disabled={result !== null} />
      {result === null ? (
        <button type="button" className="btn block" disabled={picked.length === 0} onClick={check}>확인</button>
      ) : (
        <p className={`feedback ${result ? 'good' : 'bad'}`} role="status">
          {result ? '정답!' : <>아쉬워요. 정답은 <HebrewText text={question.answer.join(' ')} />예요.</>}
        </p>
      )}
    </section>
  )
}
