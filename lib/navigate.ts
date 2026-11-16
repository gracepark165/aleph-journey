import { safeNextPath } from './safeNext'

/**
 * Full page load (not a client-side transition), so providers start again from scratch.
 * Only same-origin paths are followed; anything else goes to '/'.
 */
export function hardNavigate(url: string, replace: (url: string) => void = u => window.location.replace(u)): void {
  replace(safeNextPath(url))
}
