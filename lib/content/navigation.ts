import type { Course } from './schema'

export function unitOfLesson(course: Course, lessonId: string) {
  return course.units.find(u => u.lessonIds.includes(lessonId))
}

export function nextLessonId(course: Course, lessonId: string): string | undefined {
  const order = course.units.flatMap(u => u.lessonIds)
  const i = order.indexOf(lessonId)
  return i >= 0 ? order[i + 1] : undefined
}
