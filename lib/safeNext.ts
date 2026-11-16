/**
 * A same-origin path to continue to after auth. The value is parsed as a URL (not string-matched), so
 * tricks like "/\t/evil.com" (the URL parser drops tabs/newlines), "//evil.com" or "/..//evil.com"
 * (dot segments normalise to "//evil.com") fall back to '/'.
 */
export function safeNextPath(next: string | null | undefined, origin: string = window.location.origin): string {
  if (!next || !next.startsWith('/') || /[\x00-\x20\\]/.test(next)) return '/'
  try {
    const u = new URL(next, origin)
    if (u.origin !== origin) return '/'
    // After normalisation the path may start with '//', which a browser reads as protocol-relative.
    if (u.pathname.startsWith('//')) return '/'
    const result = u.pathname + u.search + u.hash
    return new URL(result, origin).origin === origin ? result : '/'
  } catch {
    return '/'
  }
}
