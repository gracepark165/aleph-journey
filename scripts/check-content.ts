import { checkContent } from '../lib/content/check'
import { readAllLessons, readCourse, readLexicon } from '../lib/content/read-files'

function main() {
  let errors: string[]
  let lessonCount = 0
  let wordCount = 0
  try {
    const course = readCourse()
    const lexicon = readLexicon()
    const lessons = readAllLessons()
    lessonCount = lessons.length
    wordCount = Object.keys(lexicon).length
    errors = checkContent(course, lessons, lexicon)
  } catch (e) {
    errors = [(e as Error).message]
  }
  if (errors.length) {
    console.error(`콘텐츠 검사 실패 (${errors.length}건)`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`콘텐츠 검사 통과 (레슨 ${lessonCount}개, 단어 ${wordCount}개)`)
}

main()
