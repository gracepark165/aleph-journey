import 'server-only'
import { readAllLessons, readCourse, readLesson, readLexicon, DEFAULT_CONTENT_DIR } from './read-files'
import type { Course, Lesson, Lexicon } from './schema'

const memo = process.env.NODE_ENV === 'production'
const cache = new Map<string, unknown>()
function cached<T>(key: string, f: () => T): T {
  if (!memo) return f()
  if (!cache.has(key)) cache.set(key, f())
  return cache.get(key) as T
}

export const loadCourse = (dir = DEFAULT_CONTENT_DIR): Course => cached(`course:${dir}`, () => readCourse(dir))
export const loadLexicon = (dir = DEFAULT_CONTENT_DIR): Lexicon => cached(`lexicon:${dir}`, () => readLexicon(dir))
export const loadLesson = (id: string, dir = DEFAULT_CONTENT_DIR): Lesson | null => cached(`lesson:${dir}:${id}`, () => readLesson(id, dir))
export const loadAllLessons = (dir = DEFAULT_CONTENT_DIR): Lesson[] => cached(`all:${dir}`, () => readAllLessons(dir))
