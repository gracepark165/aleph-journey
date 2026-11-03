import type { BlocksReply, ChoiceQuestion, ChoiceReply, OrderQuestion } from '@/lib/content/schema'
import { normalizeHebrew } from '@/lib/hebrew/normalize'

export type GradeResult = { correct: boolean; next?: string; feedbackKo?: string }

const joined = (tokens: string[]) => normalizeHebrew(tokens.join(' '))

export function gradeChoice(reply: ChoiceReply, optionId: string): GradeResult {
  const option = reply.options.find(o => o.id === optionId)
  if (!option) throw new Error(`unknown option: ${optionId}`)
  if (option.correct) return { correct: true, next: option.next }
  return option.feedbackKo !== undefined ? { correct: false, feedbackKo: option.feedbackKo } : { correct: false }
}

export function gradeBlocks(reply: BlocksReply, picked: string[]): GradeResult {
  if (picked.length === 0) return { correct: false }
  const answer = joined(picked)
  return reply.accepted.some(a => normalizeHebrew(a) === answer) ? { correct: true, next: reply.next } : { correct: false }
}

export function gradeOrder(q: OrderQuestion, picked: string[]): boolean {
  return picked.length > 0 && joined(picked) === joined(q.answer)
}

export function gradeChoiceQuestion(q: ChoiceQuestion, index: number): boolean {
  return index === q.answerIndex
}
