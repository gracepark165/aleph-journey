'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Course } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { isLessonUnlocked } from '@/lib/progress/unlock'

export function LessonGate({ course, lessonId, unitId, children }: { course: Course; lessonId: string; unitId: string; children: ReactNode }) {
  const { ready, snapshot, unlockAll } = useProgress()
  const router = useRouter()
  const open = ready && isLessonUnlocked(course, lessonId, snapshot.completed, { all: unlockAll })

  useEffect(() => {
    if (ready && !open) router.replace(`/unit/${unitId}`)
  }, [ready, open, router, unitId])

  if (!ready) return <p className="muted center">불러오는 중…</p>
  if (!open) return <p className="muted center">아직 잠긴 레슨이에요. 이전 레슨을 먼저 끝내 주세요.</p>
  return <>{children}</>
}
