/**
 * A same-origin path to continue to after auth. The value is parsed as a URL (not string-matched), so
 * tricks like "/\t/evil.com" (the URL parser drops tabs/newlines) or "//evil.com" fall back to '/'.
 */
export function safeNextPath(next: string | null | undefined, origin: string = window.location.origin): string {
  if (!next || !next.startsWith('/') || /[\x00-\x20\\]/.test(next)) return '/'
  try {
    const u = new URL(next, origin)
    if (u.origin !== origin) return '/'
    return u.pathname + u.search + u.hash
  } catch {
    return '/'
  }
}
