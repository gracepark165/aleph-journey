'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCloud } from '@/lib/cloud/CloudProvider'
import { CloudError, type FriendSummary } from '@/lib/cloud/types'
import { avatarById } from '@/lib/profile'
import { Illustration } from './Illustration'
import { InviteButton } from './InviteButton'

type Lookup = 'loading' | 'missing' | 'failed' | { friend: FriendSummary; isMe: boolean }
type Added = 'idle' | 'busy' | 'done' | 'already' | 'failed'

const Home = () => <Link href="/" className="btn secondary block">홈으로</Link>

export function InviteLanding({ code, redirectMs = 2000 }: { code: string; redirectMs?: number }) {
  const { status, profile, lookupCode, addFriend, refreshLeaderboard } = useCloud()
  const router = useRouter()
  const normalised = code.trim().toUpperCase()
  const [lookup, setLookup] = useState<Lookup>('loading')
  const [added, setAdded] = useState<Added>('idle')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (status !== 'ready') return
    let live = true
    setLookup('loading')
    lookupCode(normalised).then(
      r => { if (live) setLookup(r ? { friend: r, isMe: r.isMe } : 'missing') },
      () => { if (live) setLookup('failed') },
    )
    return () => { live = false }
  }, [status, normalised, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (added !== 'done') return
    const t = setTimeout(() => router.push('/'), redirectMs)
    return () => clearTimeout(t)
  }, [added, redirectMs, router])

  async function join() {
    setAdded('busy')
    try {
      await addFriend(normalised)
      setAdded('done')
    } catch (e) {
      setAdded(e instanceof CloudError && e.code === 'already' ? 'already' : 'failed')
    }
  }

  const retry = () => { if (status === 'error') void refreshLeaderboard(); else setAttempt(n => n + 1) }
  let body
  if (status === 'off') {
    body = <><p>친구 기능은 준비 중이에요</p><Home /></>
  } else if (status === 'error' || lookup === 'failed') {
    body = (
      <p className="muted">
        친구 정보를 불러오지 못했어요 · <button type="button" className="link-btn" onClick={retry}>다시 시도</button>
      </p>
    )
  } else if (status === 'connecting' || lookup === 'loading') {
    body = <p className="muted" aria-busy="true">불러오는 중…</p>
  } else if (lookup === 'missing') {
    body = <><p>초대 코드를 찾을 수 없어요</p><Home /></>
  } else if (lookup.isMe) {
    body = (
      <>
        <p>내 코드예요</p>
        {profile && <InviteButton code={profile.friendCode} nickname={profile.nickname} prominent />}
        <Home />
      </>
    )
  } else {
    const { friend } = lookup
    const avatar = avatarById(friend.avatarId)
    body = added === 'already' ? (
      <><p>이미 친구예요</p><Home /></>
    ) : (
      <>
        <Illustration src={avatar.src} alt={avatar.nameKo} className="invite-avatar" />
        <h2 className="invite-name">{friend.nickname}</h2>
        <p>함께 히브리어 여정을 떠나요</p>
        {added === 'done' ? (
          <p role="status">{friend.nickname} 님과 친구가 되었어요!</p>
        ) : (
          <>
            <button type="button" className="btn block" disabled={added === 'busy'} onClick={() => void join()}>친구 되기</button>
            {added === 'failed' && <p className="muted" role="alert">친구 추가에 실패했어요. 다시 시도해 주세요</p>}
          </>
        )}
      </>
    )
  }
  return <section className="card invite-landing">{body}</section>
}
