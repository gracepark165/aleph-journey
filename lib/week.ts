import { addDays } from './progress/dates'

const md = (date: string) => {
  const [, m, d] = date.split('-').map(Number)
  return { m, d }
}

/** Monday–Sunday range of the week containing `today` (YYYY-MM-DD), e.g. '11월 10일 ~ 16일'. */
export function weekRangeLabel(today: string): string {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() || 7
  const mon = md(addDays(today, 1 - weekday))
  const sun = md(addDays(today, 7 - weekday))
  return mon.m === sun.m ? `${mon.m}월 ${mon.d}일 ~ ${sun.d}일` : `${mon.m}월 ${mon.d}일 ~ ${sun.m}월 ${sun.d}일`
}
