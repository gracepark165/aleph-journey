/** Full page load (not a client-side transition), so providers start again from scratch. */
export function hardNavigate(url: string): void {
  window.location.replace(url)
}
