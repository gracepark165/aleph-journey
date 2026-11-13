'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCloud } from '@/lib/cloud/CloudProvider'
import { CloudError } from '@/lib/cloud/types'
import { avatarById } from '@/lib/profile'
import { Illustration } from './Illustration'
import { InviteButton } from './InviteButton'

// Lenient shape check only; the server is the authority on the code charset.
const CODE_RE = /^ALEF-[A-Z0-9]{4}$/

function normalise(raw: string): string {
  const s = raw.trim().toUpperCase()
  return s.length === 4 ? `ALEF-${s}` : s
}

/** Too many unknown codes in the last hour (server-side limit). */
export const RATE_LIMITED = '잠시 후 다시 시도해 주세요'

function errorMessage(e: unknown): string {
  if (e instanceof CloudError) {
    if (e.code === 'not_found') return '초대 코드를 찾을 수 없어요'
    if (e.code === 'self') return '내 코드예요'
    if (e.code === 'already') return '이미 친구예요'
    if (e.code === 'rate_limited') return RATE_LIMITED
  }
  return '친구를 추가하지 못했어요. 잠시 후 다시 시도해 주세요.'
}

export function FriendsManager() {
  const { status, profile, leaderboard, addFriend, removeFriend, refreshLeaderboard } = useCloud()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  if (status === 'off') {
    return (
      <>
        <p>친구 기능은 준비 중이에요</p>
        <Link href="/" className="btn secondary block">홈으로</Link>
      </>
    )
  }
  if (status === 'connecting' && !profile) return <p className="muted">불러오는 중…</p>
  if (status === 'error' && !profile) {
    return (
      <p className="muted">
        친구 정보를 불러오지 못했어요 · <button type="button" className="link-btn" onClick={() => void refreshLeaderboard()}>다시 시도</button>
      </p>
    )
  }

  const friends = leaderboard.rows.filter(r => !r.isMe)

  async function copy() {
    if (!profile) return
    try {
      await navigator.clipboard.writeText(profile.friendCode)
      setCopied('ok')
    } catch {
      setCopied('failed')
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setAdded(null)
    const code = normalise(value)
    if (!CODE_RE.test(code)) { setError('초대 코드를 찾을 수 없어요'); return }
    setError(null)
    setBusy(true)
    try {
      const f = await addFriend(code)
      setValue('')
      setAdded(`${f.nickname} 님과 친구가 되었어요!`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(userId: string) {
    setRemoving(userId)
    setRemoveError(null)
    try {
      await removeFriend(userId)
      setConfirming(null)
    } catch {
      setRemoveError('친구를 끊지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="friends-manager">
      {profile && (
        <section>
          <p className="field-label">내 코드</p>
          <p className="friend-code">{profile.friendCode}</p>
          <button type="button" className="btn secondary" onClick={() => void copy()}>복사</button>
          {copied === 'ok' && <p className="invite-note" role="status">복사했어요</p>}
          {copied === 'failed' && <p className="invite-note" role="status">복사하지 못했어요. 코드를 길게 눌러 선택해 주세요</p>}
          <InviteButton code={profile.friendCode} nickname={profile.nickname} />
        </section>
      )}

      <form onSubmit={add} noValidate>
        <label htmlFor="friend-code" className="field-label">친구 코드</label>
        <input id="friend-code" className="text-input" value={value} autoComplete="off" autoCapitalize="characters"
          onChange={e => { setValue(e.target.value.toUpperCase()); setError(null); setAdded(null) }} />
        {error && <p className="feedback bad" role="alert">{error}</p>}
        {added && <p className="feedback good" role="status">{added}</p>}
        <button type="submit" className="btn block" disabled={busy}>추가</button>
      </form>

      {leaderboard.state === 'error' && (
        <p className="muted">
          순위를 불러오지 못했어요 · <button type="button" className="link-btn" onClick={() => void refreshLeaderboard()}>다시 시도</button>
        </p>
      )}
      {leaderboard.state === 'offline' && <p className="muted">인터넷에 연결되면 순위가 보여요</p>}
      {removeError && <p className="feedback bad" role="alert">{removeError}</p>}
      <ul className="friend-list">
        {friends.map(r => {
          const avatar = avatarById(r.avatarId)
          return (
            <li key={r.userId} className="friend-row">
              <Illustration src={avatar.src} alt={avatar.nameKo} className="lb-avatar" />
              <span className="lb-who"><span className="lb-name">{r.nickname}</span></span>
              {confirming === r.userId ? (
                <span className="friend-confirm">
                  <span>정말 끊을까요?</span>{' '}
                  <button type="button" className="link-btn" disabled={removing === r.userId} onClick={() => void remove(r.userId)}>예</button>{' '}
                  <button type="button" className="link-btn" onClick={() => setConfirming(null)}>아니오</button>
                </span>
              ) : (
                <button type="button" className="link-btn" onClick={() => { setConfirming(r.userId); setRemoveError(null) }}>친구 끊기</button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
