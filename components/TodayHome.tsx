'use client'

import Link from 'next/link'
import type { Course, LessonType } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { dueReviews } from '@/lib/progress/review'
import { nextLesson, zoeMessage } from '@/lib/zoe'
import { Illustration } from './Illustration'
import { ZoeSays } from './Zoe'

const TYPE_LABEL: Record<LessonType, string> = { reading: '본문 읽기', quiz: '연습 퀴즈', roleplay: '롤플레이 미션' }

export function TodayHome({ course, lessons }: { course: Course; lessons: { id: string; type: LessonType; titleKo: string }[] }) {
  const { snapshot, today, ready } = useProgress()
  const titles = Object.fromEntries(lessons.map(l => [l.id, l.titleKo]))
  const next = nextLesson(course, snapshot.completed)
  const unit = next ? course.units.find(u => u.id === next.unitId) : undefined
  const lesson = next ? lessons.find(l => l.id === next.lessonId) : undefined
  const due = dueReviews(snapshot, today).length
  const started = Object.keys(snapshot.completed).length > 0

  return (
    <div className="today">
      <h1 className="hello">샬롬! <span aria-hidden="true">👋</span></h1>
      {ready ? <ZoeSays size="lg">{zoeMessage(course, snapshot, today, titles)}</ZoeSays> : <div className="zoe-placeholder" />}

      {ready && (
        <div className="chips" aria-label="오늘의 기록">
          <span className="chip">🔥 {snapshot.streak.current}일 연속</span>
          <span className="chip">⭐ {snapshot.xp} XP</span>
          <span className="chip">🕯️ 쉼표 {snapshot.restTokens}</span>
        </div>
      )}

      {ready && next && unit && lesson && (
        <section className={`next-card ${unit.imageSrc ? 'has-image' : ''}`}>
          {unit.imageSrc && <Illustration src={unit.imageSrc} alt={unit.imageAltKo ?? unit.titleKo} className="next-card-img" />}
          <div className="next-card-body">
            <span className="eyebrow">{unit.titleKo}{unit.refKo ? ` · ${unit.refKo}` : ''}</span>
            <h2>{lesson.titleKo}</h2>
            <span className="next-card-type">{TYPE_LABEL[lesson.type]}</span>
            <Link className="btn block" href={`/lesson/${lesson.id}`}>{started ? '이어서 하기' : '시작하기'} →</Link>
          </div>
        </section>
      )}

      {ready && due > 0 && (
        <Link href="/vocab" className="card review-card">
          <span>📜 복습할 단어 {due}개</span>
          <span className="muted">지금 복습하기 →</span>
        </Link>
      )}
    </div>
  )
}
