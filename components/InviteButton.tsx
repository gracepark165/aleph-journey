'use client'

import { useState } from 'react'

type Props = { code: string; nickname: string; prominent?: boolean }

export function InviteButton({ code, nickname, prominent = false }: Props) {
  const [note, setNote] = useState<'copied' | 'manual' | null>(null)
  const url = () => `${window.location.origin}/invite/${code}`

  async function invite() {
    setNote(null)
    const link = url()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: '알레프 여정', text: `${nickname} 님이 히브리어 여정에 초대했어요`, url: link })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(link)
      setNote('copied')
    } catch {
      setNote('manual')
    }
  }

  return (
    <div className="invite">
      <button type="button" className={`btn ${prominent ? 'block' : 'secondary'}`} onClick={invite}>🤝 친구 초대하기</button>
      {note === 'copied' && <p className="invite-note" role="status">초대 링크를 복사했어요</p>}
      {note === 'manual' && <p className="invite-note invite-link" role="status">{url()}</p>}
    </div>
  )
}
