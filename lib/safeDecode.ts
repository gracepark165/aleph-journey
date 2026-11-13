/** decodeURIComponent that returns the raw string for malformed escapes instead of throwing. */
export function safeDecode(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}
