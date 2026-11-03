import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LessonGate } from '@/components/LessonGate'
import { QuizView } from '@/components/QuizView'
import { ReadingView } from '@/components/ReadingView'
import { RoleplayView } from '@/components/RoleplayView'
import { loadCourse, loadLesson, loadLexicon } from '@/lib/content/load'
import { nextLessonId, unitOfLesson } from '@/lib/content/navigation'
import type { Lexicon } from '@/lib/content/schema'

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const lesson = loadLesson(lessonId)
  const course = loadCourse()
  const unit = lesson ? unitOfLesson(course, lesson.id) : undefined
  if (!lesson || !unit) notFound()
  const next = nextLessonId(course, lesson.id)
  const common = { unitId: unit.id, nextLessonId: next }

  let view: React.ReactNode
  if (lesson.type === 'reading') {
    const all = loadLexicon()
    const lexicon: Lexicon = {}
    for (const v of lesson.verses) for (const w of v.words) if (all[w.lemmaId]) lexicon[w.lemmaId] = all[w.lemmaId]
    view = <ReadingView lesson={lesson} lexicon={lexicon} {...common} />
  } else if (lesson.type === 'quiz') {
    view = <QuizView lesson={lesson} {...common} />
  } else {
    view = <RoleplayView lesson={lesson} sceneImageSrc={unit.imageSrc} {...common} />
  }

  return (
    <>
      <Link href={`/unit/${unit.id}`} className="back">← {unit.titleKo}</Link>
      <LessonGate course={course} lessonId={lesson.id} unitId={unit.id}>{view}</LessonGate>
    </>
  )
}
