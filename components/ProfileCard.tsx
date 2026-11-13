'use client'

import Link from 'next/link'
import { isoWeek } from '@/lib/progress/dates'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { avatarById } from '@/lib/profile'
import { rankFor } from '@/lib/rank'
import { Illustration } from './Illustration'

export function ProfileCard() {
  const { snapshot, profile, today, ready } = useProgress()
  if (!ready) return <div className="profile-card placeholder" aria-hidden="true" />
  const avatar = avatarById(profile.avatarId)
  const { rank, next, xpToNext, progress } = rankFor(snapshot.xp)
  const weekXp = snapshot.weekXp?.week === isoWeek(today) ? snapshot.weekXp.xp : 0

  return (
    <section className="profile-card" aria-label="내 프로필">
      <div className="profile-top">
        <Illustration src={avatar.src} alt={avatar.nameKo} className="profile-avatar" />
        <div className="profile-id">
          <strong className="profile-name">{profile.nickname}</strong>
          <span className="profile-rank">
            <span className="rank-badge" aria-label={`랭크 ${rank.nameKo}`}>{rank.letter}</span>
            {rank.nameKo} 랭크 · {snapshot.xp} XP
          </span>
        </div>
        <Link href="/profile" className="profile-edit" aria-label="프로필 편집">✏️</Link>
      </div>
      <div className="rank-progress" aria-hidden="true"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      <p className="rank-next">
        {next ? `다음 랭크 ${next.letter} ${next.nameKo}까지 ${xpToNext} XP` : '마지막 글자 타브에 이르렀어요!'}
      </p>
      <div className="profile-stats">
        <span className="chip" aria-label={`이번 주 XP ${weekXp}`}>📅 이번 주 {weekXp} XP</span>
        <span className="chip" aria-label={`연속 학습 ${snapshot.streak.current}일`}>🔥 {snapshot.streak.current}일 연속</span>
        <span className="chip" aria-label={`안식일 쉼표 ${snapshot.restTokens}개`}>🕯️ 쉼표 {snapshot.restTokens}</span>
      </div>
    </section>
  )
}
