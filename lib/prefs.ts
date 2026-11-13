/** Small per-browser flags kept outside the progress snapshot. All storage access is guarded. */
export const INTRO_SEEN_KEY = 'aleph-journey:intro-seen'
export const REVIEW_MODE_KEY = 'aleph-journey:unlock-all'

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
