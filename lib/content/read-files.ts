import fs from 'node:fs'
import path from 'node:path'
import { CourseSchema, LessonSchema, LexiconSchema, type Course, type Lesson, type Lexicon } from './schema'

export const DEFAULT_CONTENT_DIR = path.join(process.cwd(), 'content')
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/

function readJson(file: string, label: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`[${label}] 파일을 읽을 수 없습니다: ${(e as Error).message}`)
  }
}

function parse<T>(schema: { safeParse(x: unknown): { success: true; data: T } | { success: false; error: { message: string } } }, data: unknown, label: string): T {
  const r = schema.safeParse(data)
  if (!r.success) throw new Error(`[${label}] 스키마 오류: ${r.error.message}`)
  return r.data
}

export function readCourse(dir = DEFAULT_CONTENT_DIR): Course {
  return parse(CourseSchema, readJson(path.join(dir, 'course.json'), 'course'), 'course')
}

export function readLexicon(dir = DEFAULT_CONTENT_DIR): Lexicon {
  return parse(LexiconSchema, readJson(path.join(dir, 'lexicon.json'), 'lexicon'), 'lexicon')
}

export function readLesson(id: string, dir = DEFAULT_CONTENT_DIR): Lesson | null {
  if (!SAFE_ID.test(id)) return null
  const file = path.join(dir, 'lessons', `${id}.json`)
  if (!fs.existsSync(file)) return null
  return parse(LessonSchema, readJson(file, id), id)
}

export function readAllLessons(dir = DEFAULT_CONTENT_DIR): Lesson[] {
  return fs.readdirSync(path.join(dir, 'lessons'))
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => readLesson(f.slice(0, -5), dir))
    .filter((l): l is Lesson => l !== null)
}
