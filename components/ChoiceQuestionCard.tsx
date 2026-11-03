'use client'

import { useState } from 'react'
import type { ChoiceQuestion } from '@/lib/content/schema'
import { gradeChoiceQuestion } from '@/lib/grader/rules'
import { HebrewText } from './HebrewText'
import { ZoeFeedback } from './Zoe'

export function ChoiceQuestionCard({ question, onAnswered }: { question: ChoiceQuestion; onAnswered(correct: boolean): void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  const correct = answered && gradeChoiceQuestion(question, picked)

  const pick = (i: number) => {
    if (answered) return
    setPicked(i)
    onAnswered(gradeChoiceQuestion(question, i))
  }

  return (
    <section className="card">
      {question.prompt.he && <HebrewText text={question.prompt.he} className="prompt-he" />}
      <p className="center">{question.prompt.ko}</p>
      <div className="choices">
        {question.choices.map((c, i) => {
          const state = !answered ? '' : i === question.answerIndex ? 'correct' : i === picked ? 'wrong' : ''
          return (
            <button key={i} type="button" className={`choice ${state}`} disabled={answered} onClick={() => pick(i)}>{c}</button>
          )
        })}
      </div>
      {answered && (
        <ZoeFeedback good={correct}>
          {correct ? '정답!' : `아쉬워요. 정답은 "${question.choices[question.answerIndex]}"예요.`}
        </ZoeFeedback>
      )}
    </section>
  )
}
