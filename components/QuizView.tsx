'use client'

import { useState } from 'react'
import type { QuizLesson } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { useLessonFinish } from '@/lib/progress/useLessonFinish'
import { ChoiceQuestionCard } from './ChoiceQuestionCard'
import { LessonComplete } from './LessonComplete'
import { OrderQuestionCard } from './OrderQuestionCard'

export function QuizView({ lesson, unitId, nextLessonId }: { lesson: QuizLesson; unitId: string; nextLessonId?: string }) {
  const { reviewAnswered } = useProgress()
  const { finish, xpGained } = useLessonFinish(lesson)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])

  if (xpGained !== null) return <LessonComplete xpGained={xpGained} unitId={unitId} nextLessonId={nextLessonId} />

  const question = lesson.questions[index]
  const answered = results.length > index
  const total = lesson.questions.length

  const onAnswered = (correct: boolean) => {
    if (answered) return
    const ids = question.kind === 'choice' ? (question.lemmaId ? [question.lemmaId] : []) : question.lemmaIds
    for (const id of ids) reviewAnswered(id, correct)
    setResults(r => [...r, correct])
  }

  const next = () => {
    if (index + 1 < total) return setIndex(index + 1)
    const right = results.filter(Boolean).length
    finish({ score: Math.round((right / total) * 100), perfect: right === total })
  }

  return (
    <article>
      <h1 className="page-title">{lesson.titleKo}</h1>
      <div className="progress-bar" aria-label={`${index + 1} / ${total}`}><span style={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }} /></div>
      {question.kind === 'choice'
        ? <ChoiceQuestionCard key={index} question={question} onAnswered={onAnswered} />
        : <OrderQuestionCard key={index} question={question} onAnswered={onAnswered} />}
      {answered && <button type="button" className="btn block" style={{ marginTop: 12 }} onClick={next}>다음</button>}
    </article>
  )
}
