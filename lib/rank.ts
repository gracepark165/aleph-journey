/** Ranks follow the Hebrew alphabet: every learner starts at alef. Thresholds are total XP. */
export type Rank = { letter: string; nameKo: string; minXp: number }

const LETTERS: [string, string][] = [
  ['א', '알레프'], ['ב', '베트'], ['ג', '기멜'], ['ד', '달레트'], ['ה', '헤'], ['ו', '바브'], ['ז', '자인'], ['ח', '헤트'],
  ['ט', '테트'], ['י', '요드'], ['כ', '카프'], ['ל', '라메드'], ['מ', '멤'], ['נ', '눈'], ['ס', '사메크'], ['ע', '아인'],
  ['פ', '페'], ['צ', '차디'], ['ק', '코프'], ['ר', '레시'], ['ש', '쉰'], ['ת', '타브'],
]
const THRESHOLDS = [0, 30, 70, 120, 180, 250, 330, 420, 520, 630, 750, 880, 1020, 1170, 1330, 1500, 1680, 1870, 2070, 2280, 2500, 2730]

export const RANKS: Rank[] = LETTERS.map(([letter, nameKo], i) => ({ letter, nameKo, minXp: THRESHOLDS[i] }))

export function rankFor(xp: number): { rank: Rank; next: Rank | null; xpToNext: number; progress: number } {
  let i = 0
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].minXp) i++
  const rank = RANKS[i]
  const next = RANKS[i + 1] ?? null
  if (!next) return { rank, next: null, xpToNext: 0, progress: 1 }
  return { rank, next, xpToNext: next.minXp - xp, progress: (xp - rank.minXp) / (next.minXp - rank.minXp) }
}
