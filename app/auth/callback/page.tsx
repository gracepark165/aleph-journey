'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCloudApi } from '@/lib/cloud/config'
import { TICKET_KEY } from '@/lib/prefs'
import { safeNextPath } from '@/lib/safeNext'

/** Kakao OAuth comes back here: finish the session (absorbing the guest if needed), then continue to `next`. */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const params = new URLSearchParams(window.location.search)
    // Implicit-flow errors arrive in the hash fragment.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const next = safeNextPath(params.get('next'))
    if (params.has('error') || params.has('error_description') || hash.has('error') || hash.has('error_description')) {
      setCancelled(true)
      try { window.sessionStorage.removeItem(TICKET_KEY) } catch { /* storage blocked */ }
      timer = setTimeout(() => router.replace('/profile'), 3000)
      return () => { alive = false; clearTimeout(timer) }
    }
    const api = createCloudApi()
    const finish = api ? api.finishAuth() : Promise.resolve({ absorbed: false })
    finish
      .catch(e => { console.warn('auth callback failed', e) })
      .finally(() => { if (alive) router.replace(next) })
    return () => { alive = false }
  }, [router])

  return <p className="muted" role="status">{cancelled ? '카카오 연결이 취소되었어요' : '연결하는 중…'}</p>
}
