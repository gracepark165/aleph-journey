'use client'

import Link from 'next/link'
import type { Course } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { isUnitUnlocked } from '@/lib/progress/unlock'
import { Illustration } from './Illustration'
import { Icon } from './Icon'

export function JourneyMap({ course }: { course: Course }) {
  const { snapshot, unlockAll } = useProgress()
  return (
    <ol className="journey">
      {course.units.map((unit, i) => {
        const done = unit.lessonIds.filter(id => snapshot.completed[id]).length
        const total = unit.lessonIds.length
        const open = isUnitUnlocked(course, unit.id, snapshot.completed, { all: unlockAll })
        const body = (
          <>
            <span className="journey-step" aria-hidden="true">{done === total ? <Icon name="check" size={18} /> : !open ? <Icon name="lock" size={16} /> : i}</span>
            <span className="journey-text">
              <strong>{unit.titleKo}</strong>
              <span className="journey-meta">
                <span className="journey-label"><Icon name="pin" size={14} />{unit.mapLabelKo}</span>
                {unit.refKo && <span className="journey-ref">{unit.refKo}</span>}
              </span>
            </span>
            {unit.imageSrc && <Illustration src={unit.imageSrc} alt={unit.imageAltKo ?? unit.titleKo} className="journey-thumb" />}
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
