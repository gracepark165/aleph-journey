/** The journey map illustration and its stops, in route order, in the image's own pixels. */
export const MAP = { src: '/illustrations/journey-map.webp', width: 941, height: 1672 } as const

export const STOPS: readonly { nameKo: string; x: number; y: number }[] = [
  { nameKo: '라암셋', x: 382, y: 1589 },
  { nameKo: '숙곳', x: 302, y: 1404 },
  { nameKo: '홍해', x: 264, y: 1284 },
  { nameKo: '마라', x: 150, y: 1062 },
  { nameKo: '엘림', x: 144, y: 888 },
  { nameKo: '신 광야', x: 469, y: 890 },
  { nameKo: '르비딤', x: 687, y: 960 },
  { nameKo: '시내산', x: 646, y: 1255 },
  { nameKo: '가데스 바네아', x: 392, y: 718 },
  { nameKo: '에돔', x: 706, y: 705 },
  { nameKo: '모압 평지', x: 738, y: 562 },
  { nameKo: '느보산', x: 759, y: 425 },
  { nameKo: '요단강', x: 550, y: 460 },
  { nameKo: '길갈', x: 642, y: 275 },
  { nameKo: '여리고', x: 455, y: 287 },
  { nameKo: '가나안', x: 673, y: 175 },
]

/** Unit n (0-based course order) stands on stop n; units past the last stop share it. */
export const stopFor = (unitIndex: number) => STOPS[Math.min(Math.max(unitIndex, 0), STOPS.length - 1)]

/**
 * A gently curved arrow from one stop toward another, ending short of the target so the
 * circle around it stays clear. Returns an SVG path in map pixels.
 */
export function arrowPath(from: { x: number; y: number }, to: { x: number; y: number }, gap = 52): string {
  const dx = to.x - from.x, dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  const sx = from.x + ux * 20, sy = from.y + uy * 20
  const ex = to.x - ux * gap, ey = to.y - uy * gap
  // Bow to the left of travel; short hops bow more so the arrow still reads as one.
  const bow = len < 220 ? 0.3 : 0.18
  const cx = (sx + ex) / 2 - uy * len * bow, cy = (sy + ey) / 2 + ux * len * bow
  const r = (n: number) => Math.round(n * 10) / 10
  return `M ${r(sx)} ${r(sy)} Q ${r(cx)} ${r(cy)} ${r(ex)} ${r(ey)}`
}

/** The part of the map to show: both stops in view, zoomed so marks stay legible on a phone. */
export function viewFor(a: { x: number; y: number }, b?: { x: number; y: number }) {
  const span = b ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : 0
  const w = Math.round(Math.min(Math.max(span + 300, 440), MAP.width))
  const h = Math.round(Math.min(w * 1.15, MAP.height))
  const mx = b ? (a.x + b.x) / 2 : a.x, my = b ? (a.y + b.y) / 2 : a.y
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), max))
  return { x: clamp(mx - w / 2, MAP.width - w), y: clamp(my - h / 2, MAP.height - h), w, h }
}
