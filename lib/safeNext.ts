/** A same-origin path to continue to after auth; anything else (absolute or protocol-relative URL) becomes '/'. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/'
  return next
}
