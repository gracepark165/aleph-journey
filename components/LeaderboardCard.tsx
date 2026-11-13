'use client'

import Link from 'next/link'
import { useCloud } from '@/lib/cloud/CloudProvider'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { avatarById } from '@/lib/profile'
import { rankFor } from '@/lib/rank'
import { weekRangeLabel } from '@/lib/week'
import { Illustration } from './Illustration'
import { InviteButton } from './InviteButton'

export function LeaderboardCard() {
  const { status, profile, leaderboard, refreshLeaderboard } = useCloud()
  const { today } = useProgress()
  if (status === 'off') return null
  const { rows, state } = leaderboard
  const invite = profile ? <InviteButton code={profile.friendCode} nickname={profile.nickname} prominent={rows.length <= 1} /> : null

  let body
  if (rows.length === 0 && (state === 'idle' || state === 'loading')) {
    body = <p className="muted lb-loading" aria-busy="true">불러오는 중…</p>
  } else if (state === 'offline' && rows.length === 0) {
    body = <p className="muted">인터넷에 연결되면 순위가 보여요</p>
  } else if (state === 'error' && rows.length === 0) {
    body = (
      <p className="muted">
        순위를 불러오지 못했어요 · <button type="button" className="link-btn" onClick={() => void refreshLeaderboard()}>다시 시도</button>
      </p>
    )
  } else {
    body = (
      <>
        <ol className="lb-list">
          {rows.map((r, i) => {
            const avatar = avatarById(r.avatarId)
            return (
              <li key={r.userId} className={`lb-row${r.isMe ? ' me' : ''}`}>
                <span className="lb-pos">{i + 1}</span>
                <Illustration src={avatar.src} alt={avatar.nameKo} className="lb-avatar" />
                <span className="lb-name">{r.nickname}{r.isMe ? ' (나)' : ''}{r.crown && <span aria-label="지난주 1위"> 👑</span>}</span>
                <span className="rank-badge" aria-label={`랭크 ${rankFor(r.totalXp).rank.nameKo}`}>{rankFor(r.totalXp).rank.letter}</span>
                <span className="lb-xp">{r.weekXp} XP</span>
                <span className="lb-streak">🔥 {r.streak}</span>
              </li>
            )
          })}
        </ol>
        {rows.length <= 1 && <p className="muted lb-empty">친구를 초대해 함께 경쟁해 보세요</p>}
      </>
    )
  }

  return (
    <section className="lb-card" aria-label="친구 순위">
      <div className="lb-head">
        <h2>🏆 이번 주 친구 순위</h2>
        <span className="muted">{weekRangeLabel(today)}</span>
      </div>
      {body}
      <div className="lb-actions">
        {invite}
        <Link href="/friends" className="btn secondary">코드로 추가</Link>
      </div>
    </section>
  )
}
