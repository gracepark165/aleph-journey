'use client'

import Link from 'next/link'
import type { Course, LessonType } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { dueReviews } from '@/lib/progress/review'
import { nextLesson, zoeMessage } from '@/lib/zoe'
import { Illustration } from './Illustration'
import { ZoeSays } from './Zoe'
import { IntroScene } from './IntroScene'
import { ProfileCard } from './ProfileCard'
import { LeaderboardCard } from './LeaderboardCard'
import { Icon } from './Icon'

const TYPE_LABEL: Record<LessonType, string> = { reading: '본문 읽기', quiz: '연습 퀴즈', roleplay: '롤플레이 미션' }

export function TodayHome({ course, lessons }: { course: Course; lessons: { id: string; type: LessonType; titleKo: string }[] }) {
  const { snapshot, today, ready, introSeen, markIntroSeen, profile } = useProgress()
  const titles = Object.fromEntries(lessons.map(l => [l.id, l.titleKo]))
  const next = nextLesson(course, snapshot.completed)
  const unit = next ? course.units.find(u => u.id === next.unitId) : undefined
  const lesson = next ? lessons.find(l => l.id === next.lessonId) : undefined
  const due = dueReviews(snapshot, today).length
  const started = Object.keys(snapshot.completed).length > 0

  return (
    <div className="today">
      {ready && !introSeen && <IntroScene onDone={markIntroSeen} />}
      <h1 className="hello">샬롬{ready ? `, ${profile.nickname}` : ''}!</h1>
      <ProfileCard />
      <LeaderboardCard />
      {ready ? <ZoeSays>{zoeMessage(course, snapshot, today, titles)}</ZoeSays> : <div className="zoe-placeholder" />}

      {ready && next && unit && lesson && (
        <section className={`next-card ${unit.imageSrc ? 'has-image' : ''}`}>
          {unit.imageSrc && <Illustration src={unit.imageSrc} alt={unit.imageAltKo ?? unit.titleKo} className="next-card-img" />}
          <div className="next-card-body">
            <h2>{lesson.titleKo}</h2>
            <p className="next-card-meta">
              <span>{TYPE_LABEL[lesson.type]}</span>
              <span className="muted">{unit.titleKo}{unit.refKo ? `, ${unit.refKo}` : ''}</span>
            </p>
            <Link className="btn block" href={`/lesson/${lesson.id}`}>{started ? '이어서 하기' : '시작하기'}<Icon name="arrow" size={20} /></Link>
          </div>
        </section>
      )}

      {ready && due > 0 && (
        <Link href="/vocab" className="card review-card">
          <span className="review-card-label"><Icon name="scroll" size={22} />복습할 단어 {due}개</span>
          <span className="review-card-go">복습하기<Icon name="arrow" size={18} /></span>
        </Link>
      )}

      {ready && <Link href="/intro" className="replay-intro"><Icon name="sparkle" size={16} />인트로 다시 보기</Link>}
    </div>
  )
}
