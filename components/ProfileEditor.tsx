'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProgress } from '@/lib/progress/ProgressProvider'
import { AVATARS, cleanNickname, NICKNAME_MAX } from '@/lib/profile'
import { Illustration } from './Illustration'

export function ProfileEditor() {
  const { profile, setProfile, ready } = useProgress()
  const router = useRouter()
  const [nickname, setNickname] = useState(profile.nickname)
  const [avatarId, setAvatarId] = useState(profile.avatarId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    setNickname(profile.nickname)
    setAvatarId(profile.avatarId)
  }, [ready, profile])

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const name = cleanNickname(nickname)
    if (!name) return setError('닉네임을 입력해 주세요.')
    setProfile({ nickname: name, avatarId })
    router.push('/')
  }

  return (
    <form className="profile-editor" onSubmit={save} noValidate>
      <label htmlFor="nickname" className="field-label">닉네임</label>
      <input id="nickname" className="text-input" value={nickname} maxLength={NICKNAME_MAX + 4}
        onChange={e => { setNickname(e.target.value); setError(null) }} autoComplete="nickname" />
      <p className="muted field-hint">{NICKNAME_MAX}자까지 쓸 수 있어요. 친구 순위에 이 이름이 보여요.</p>
      {error && <p className="feedback bad" role="alert">{error}</p>}

      <fieldset className="avatar-grid">
        <legend className="field-label">프로필 사진</legend>
        {AVATARS.map(a => (
          <label key={a.id} className={`avatar-option ${avatarId === a.id ? 'selected' : ''}`}>
            <input type="radio" name="avatar" value={a.id} checked={avatarId === a.id} onChange={() => setAvatarId(a.id)} aria-label={a.nameKo} />
            <Illustration src={a.src} alt="" className="avatar-option-img" />
            <span>{a.nameKo}</span>
          </label>
        ))}
      </fieldset>

      <button type="submit" className="btn block">저장</button>
    </form>
  )
}
