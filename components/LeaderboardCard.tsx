'use client'

import Link from 'next/link'
import { useCloud } from '@/lib/cloud/CloudProvider'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { avatarById } from '@/lib/profile'
import { rankFor } from '@/lib/rank'
import { weekRangeLabel } from '@/lib/week'
import { Illustration } from './Illustration'
import { InviteButton } from './InviteButton'
import { Icon } from './Icon'

export function LeaderboardCard() {
  const { status, profile, leaderboard, refreshLeaderboard } = useCloud()
  const { today } = useProgress()
  if (status === 'off') return null
  const { rows, state } = leaderboard
  const invite = profile ? <InviteButton code={profile.friendCode} nickname={profile.nickname} prominent={rows.length <= 1} /> : null

  const loading = rows.length === 0 && (state === 'idle' || state === 'loading')
  const notice =
    state === 'offline' ? <p className="muted">인터넷에 연결되면 순위가 보여요</p>
    : state === 'error' ? (
      <p className="muted">
        순위를 불러오지 못했어요. <button type="button" className="link-btn" onClick={() => void refreshLeaderboard()}>다시 시도</button>
      </p>
    ) : null

  const body = (
    <>
      {loading && <p className="muted lb-loading" aria-busy="true">불러오는 중…</p>}
      {rows.length > 0 && (
        <ol className="lb-list">
          {rows.map((r, i) => {
            const avatar = avatarById(r.avatarId)
            return (
              <li key={r.userId} className={`lb-row${r.isMe ? ' me' : ''}`}>
                <span className="lb-pos">{i + 1}</span>
                <Illustration src={avatar.src} alt={avatar.nameKo} className="lb-avatar" />
                <span className="lb-who">
                  <span className="lb-name">{r.nickname}</span>
                  {r.isMe && <span className="lb-tag">(나)</span>}
                  {r.crown && <span className="lb-tag crown" role="img" aria-label="지난주 1위"><Icon name="crown" size={16} /></span>}
                </span>
                <span className="rank-badge" aria-label={`랭크 ${rankFor(r.totalXp).rank.nameKo}`}>{rankFor(r.totalXp).rank.letter}</span>
                <span className="lb-xp">{r.weekXp} XP</span>
                <span className="lb-streak" aria-label={`연속 ${r.streak}일`}><Icon name="flame" size={14} />{r.streak}</span>
              </li>
            )
          })}
        </ol>
      )}
      {notice}
      {rows.length === 1 && !notice && <p className="muted lb-empty">친구를 초대해 함께 경쟁해 보세요</p>}
    </>
  )

  return (
    <section className="lb-card" aria-label="친구 순위">
      <div className="lb-head">
        <h2><Icon name="trophy" size={22} />이번 주 친구 순위</h2>
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
