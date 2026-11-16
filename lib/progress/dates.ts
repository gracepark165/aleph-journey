const seoulFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
const DAY_MS = 86_400_000

const toUtc = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Calendar date (YYYY-MM-DD) in Asia/Seoul for the given instant. */
export function seoulDate(now: Date): string {
  return seoulFormatter.format(now)
}

export function addDays(date: string, n: number): string {
  return fromUtc(toUtc(date) + n * DAY_MS)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

/** ISO-8601 week label, e.g. '2026-W45'. */
export function isoWeek(date: string): string {
  const d = new Date(toUtc(date))
  const weekday = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - weekday) // Thursday of this week decides the year
  const year = d.getUTCFullYear()
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / DAY_MS + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** ISO week label before the given one, e.g. '2026-W01' -> '2025-W52'. */
export function previousIsoWeek(week: string): string {
  const [y, w] = week.split('-W').map(Number)
  const jan4 = `${y}-01-04`
  const weekday = new Date(`${jan4}T00:00:00Z`).getUTCDay() || 7
  return isoWeek(addDays(jan4, 1 - weekday + (w - 1) * 7 - 7))
}
