'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCloudApi } from '@/lib/cloud/config'
import { hardNavigate } from '@/lib/navigate'
import { TICKET_KEY } from '@/lib/prefs'
import { safeNextPath } from '@/lib/safeNext'

/** Kakao OAuth comes back here: finish the session (absorbing the guest if needed), then reload `next`. */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const query = new URLSearchParams(window.location.search)
    // PKCE puts errors in the query; read the hash too in case the provider used it.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const param = (name: string) => query.get(name) ?? hash.get(name)
    const next = safeNextPath(query.get('next'))
    // Shared with CloudProvider: one Supabase auth client per page.
    const api = createCloudApi()

    const cancel = () => {
      if (!alive) return
      setCancelled(true)
      try { window.localStorage.removeItem(TICKET_KEY) } catch { /* storage blocked */ }
      timer = setTimeout(() => router.replace('/profile'), 3000)
    }

    if (param('error') || param('error_code') || param('error_description')) {
      if (api && param('error_code') === 'identity_already_exists') {
        // The Kakao account belongs to another user: log in as it (ticket kept); the next callback absorbs the guest.
        api.continueKakaoLogin(next).catch(e => {
          console.warn('kakao login failed', e)
          cancel()
        })
      } else {
        cancel()
      }
      return () => { alive = false; clearTimeout(timer) }
    }

    const finish = api ? api.finishAuth() : Promise.resolve({ absorbed: false })
    finish
      .catch(e => { console.warn('auth callback failed', e) })
      // Full reload so CloudProvider starts again on the linked session (pull → merge → push, absorbed friends).
      .finally(() => { if (alive) hardNavigate(next) })
    return () => { alive = false; clearTimeout(timer) }
  }, [router])

  return <p className="muted" role="status">{cancelled ? '카카오 연결이 취소되었어요' : '연결하는 중…'}</p>
}
