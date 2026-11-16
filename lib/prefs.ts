/** Small per-browser flags kept outside the progress snapshot. All storage access is guarded. */
export const INTRO_SEEN_KEY = 'aleph-journey:intro-seen'
export const REVIEW_MODE_KEY = 'aleph-journey:unlock-all'
export const PROFILE_KEY = 'aleph-journey:profile'
/** Guest transfer ticket `{ticket, guestId, expiresAt}` kept in localStorage across the Kakao redirect (10-minute expiry). */
export const TICKET_KEY = 'aleph-journey:ticket'
/** Set while a user's profile edit has not reached the server; the next cloud startup pushes it instead of taking the server's. */
export const PROFILE_DIRTY_KEY = 'aleph-journey:profile-dirty'

export function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked: lasts for this visit only */
  }
}

export function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeFlag(key: string, on: boolean): void {
  try {
    if (on) window.localStorage.setItem(key, '1')
    else window.localStorage.removeItem(key)
  } catch {
    /* storage blocked: the flag lasts for this visit only */
  }
}

/** `?unlock=all` turns review mode on, `?unlock=off` turns it off. */
export function parseUnlockParam(search: string): 'on' | 'off' | null {
  const v = new URLSearchParams(search).get('unlock')
  return v === 'all' ? 'on' : v === 'off' ? 'off' : null
}

/** Call when the USER saves a profile edit (whatever the cloud status), so a later startup keeps it. */
export function markProfileEdited(): void {
  writeFlag(PROFILE_DIRTY_KEY, true)
}
