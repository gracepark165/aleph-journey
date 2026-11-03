import type { Course } from '@/lib/content/schema'
import type { ProgressSnapshot } from './snapshot'

const flatten = (course: Course) => course.units.flatMap(u => u.lessonIds)

export function isLessonUnlocked(course: Course, lessonId: string, completed: ProgressSnapshot['completed']): boolean {
  const order = flatten(course)
  const i = order.indexOf(lessonId)
  if (i < 0) return false
  return i === 0 || completed[order[i - 1]] !== undefined
}

export function isUnitUnlocked(course: Course, unitId: string, completed: ProgressSnapshot['completed']): boolean {
  const unit = course.units.find(u => u.id === unitId)
  return unit !== undefined && isLessonUnlocked(course, unit.lessonIds[0], completed)
}
