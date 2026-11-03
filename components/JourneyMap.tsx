'use client'

import Link from 'next/link'
import type { Course } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { isUnitUnlocked } from '@/lib/progress/unlock'

export function JourneyMap({ course }: { course: Course }) {
  const { snapshot } = useProgress()
  return (
    <ol className="journey">
      {course.units.map((unit, i) => {
        const done = unit.lessonIds.filter(id => snapshot.completed[id]).length
        const total = unit.lessonIds.length
        const open = isUnitUnlocked(course, unit.id, snapshot.completed)
        const body = (
          <>
            <span className="journey-step" aria-hidden="true">{done === total ? '✓' : i}</span>
            <span className="journey-text">
              <span className="journey-label">{unit.mapLabelKo}</span>
              <strong>{unit.titleKo}</strong>
              {unit.refKo && <span className="muted">{unit.refKo}</span>}
            </span>
            <span className="journey-count">{done}/{total}</span>
          </>
        )
        return (
          <li key={unit.id} className={`journey-stop ${open ? '' : 'locked'} ${done === total ? 'done' : ''}`}>
            {open ? (
              <Link href={`/unit/${unit.id}`} className="journey-card">{body}</Link>
            ) : (
              <div className="journey-card" aria-disabled="true">{body}<span className="sr-only">잠김</span></div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
