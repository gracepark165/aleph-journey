'use client'

import Link from 'next/link'
import type { Course, LessonType } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { isLessonUnlocked } from '@/lib/progress/unlock'

const TYPE_LABEL: Record<LessonType, string> = { reading: '본문 읽기', quiz: '연습 퀴즈', roleplay: '롤플레이 미션' }

export function UnitLessons({ course, lessons }: { course: Course; lessons: { id: string; type: LessonType; titleKo: string }[] }) {
  const { snapshot, unlockAll } = useProgress()
  return (
    <ol className="lesson-list">
      {lessons.map(l => {
        const done = snapshot.completed[l.id]
        const open = isLessonUnlocked(course, l.id, snapshot.completed, { all: unlockAll })
        const body = (
          <>
            <span className="lesson-type">{TYPE_LABEL[l.type]}</span>
            <strong>{l.titleKo}</strong>
            <span className="lesson-state">{done ? '완료 ✓' : open ? '시작하기 →' : '잠김 🔒'}</span>
          </>
        )
        return (
          <li key={l.id}>
            {open ? <Link className="card lesson-card" href={`/lesson/${l.id}`}>{body}</Link>
              : <div className="card lesson-card locked" aria-disabled="true">{body}</div>}
          </li>
        )
      })}
    </ol>
  )
}
