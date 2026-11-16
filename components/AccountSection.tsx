'use client'

import { useState } from 'react'
import { useCloud } from '@/lib/cloud/CloudProvider'

export function AccountSection() {
  const { status, user, connectKakao, signOut, deleteAccount } = useCloud()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'off') return null

  async function run(action: () => Promise<void>, failure: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await action()
      setConfirming(false)
    } catch {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  const isGuest = user?.isGuest ?? true

  return (
    <section className="account-section">
      <h2 className="field-label">계정</h2>
      {isGuest ? (
        <>
          <p className="muted">카카오 계정을 연결하면 기록이 안전하게 보관돼요</p>
          <button type="button" className="btn block kakao-btn" disabled={busy || !user}
            onClick={() => void run(connectKakao, '카카오 연결을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.')}>
            카카오로 연결
          </button>
        </>
      ) : (
        <>
          <p className="muted">카카오 계정 연결됨</p>
          <button type="button" className="btn secondary block" disabled={busy}
            onClick={() => void run(signOut, '로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.')}>
            로그아웃
          </button>
        </>
      )}

      {confirming ? (
        <div className="account-confirm" role="group" aria-label="계정 삭제 확인">
          <p>서버의 기록과 친구가 모두 삭제돼요. 이 기기의 진도는 남아요.</p>
          <div className="account-confirm-actions">
            <button type="button" className="btn danger" disabled={busy}
              onClick={() => void run(deleteAccount, '계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.')}>
              삭제
            </button>
            <button type="button" className="btn secondary" disabled={busy} onClick={() => setConfirming(false)}>취소</button>
          </div>
        </div>
      ) : (
        <button type="button" className="link-btn account-delete" disabled={busy || !user}
          onClick={() => { setConfirming(true); setError(null) }}>
          계정 삭제
        </button>
      )}
      {error && <p className="feedback bad" role="alert">{error}</p>}
    </section>
  )
}
