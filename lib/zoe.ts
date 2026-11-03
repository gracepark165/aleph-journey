import type { Course } from '@/lib/content/schema'
import { dueReviews } from '@/lib/progress/review'
import type { ProgressSnapshot } from '@/lib/progress/snapshot'

export const ZOE_NAME = '조에'

/** First lesson in course order that has not been completed yet. */
export function nextLesson(course: Course, completed: ProgressSnapshot['completed']): { lessonId: string; unitId: string } | null {
  for (const unit of course.units) {
    for (const lessonId of unit.lessonIds) if (!completed[lessonId]) return { lessonId, unitId: unit.id }
  }
  return null
}

/** What Zoe says on the home screen. */
export function zoeMessage(course: Course, s: ProgressSnapshot, today: string, lessonTitles: Record<string, string>): string {
  const due = dueReviews(s, today).length
  const goalMet = s.today.date === today && s.today.lessonsCompleted >= s.dailyGoal
  if (goalMet) {
    return `오늘 목표 완료! 🔥 ${s.streak.current}일째예요.${due > 0 ? ` 복습할 단어도 ${due}개 있어요.` : ''}`
  }
  const next = nextLesson(course, s.completed)
  if (!next) return '준비된 레슨을 모두 마쳤어요! 단어 복습으로 실력을 지켜요.'
  if (Object.keys(s.completed).length === 0) return '처음 오셨군요! 저는 조에예요. 알파벳부터 함께 시작해 볼까요?'
  return `오늘은 '${lessonTitles[next.lessonId] ?? next.lessonId}' 차례예요. 같이 가 봐요!`
}
