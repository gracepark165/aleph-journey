import type { ChoiceQuestion, Lexicon } from '@/lib/content/schema'
import { addDays } from './dates'
import type { ProgressSnapshot, ReviewItem } from './snapshot'

export const REVIEW_INTERVALS = [1, 3, 7, 14] as const
const MAX_CHOICES = 4

function nextInterval(current: number): number {
  return REVIEW_INTERVALS.find(i => i > current) ?? REVIEW_INTERVALS[REVIEW_INTERVALS.length - 1]
}

export function addLearned(s: ProgressSnapshot, lemmaIds: string[], today: string): ProgressSnapshot {
  const reviews = { ...s.reviews }
  for (const id of lemmaIds) {
    if (reviews[id]) continue
    reviews[id] = { lemmaId: id, intervalDays: 1, nextReviewDate: addDays(today, 1), correctCount: 0, wrongCount: 0 }
  }
  return { ...s, reviews }
}

export function recordReview(s: ProgressSnapshot, lemmaId: string, correct: boolean, today: string): ProgressSnapshot {
  const prev: ReviewItem | undefined = s.reviews[lemmaId]
  const intervalDays = correct && prev ? nextInterval(prev.intervalDays) : 1
  const item: ReviewItem = {
    lemmaId,
    intervalDays,
    nextReviewDate: addDays(today, intervalDays),
    correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
    wrongCount: (prev?.wrongCount ?? 0) + (correct ? 0 : 1),
  }
  return { ...s, reviews: { ...s.reviews, [lemmaId]: item } }
}

export function dueReviews(s: ProgressSnapshot, today: string): ReviewItem[] {
  return Object.values(s.reviews)
    .filter(r => r.nextReviewDate <= today)
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate) || a.lemmaId.localeCompare(b.lemmaId))
}

function shuffle<T>(xs: T[], rng: () => number): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function buildReviewQuestion(lemmaId: string, lexicon: Lexicon, rng: () => number): ChoiceQuestion {
  const target = lexicon[lemmaId]
  if (!target) throw new Error(`unknown lemma: ${lemmaId}`)
  const glosses = new Set([target.glossKo])
  for (const e of shuffle(Object.values(lexicon), rng)) {
    if (glosses.size >= MAX_CHOICES) break
    glosses.add(e.glossKo)
  }
  if (glosses.size < 2) throw new Error('lexicon too small for a review question')
  const choices = shuffle([...glosses], rng)
  return {
    kind: 'choice',
    prompt: { he: target.lemma, ko: '이 단어의 뜻은?' },
    choices,
    answerIndex: choices.indexOf(target.glossKo),
    lemmaId,
  }
}
