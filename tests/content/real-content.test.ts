import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { checkContent } from '@/lib/content/check'
import { readAllLessons, readCourse, readLexicon } from '@/lib/content/read-files'

describe('shipped content', () => {
  const course = readCourse()
  const lessons = readAllLessons()
  const lexicon = readLexicon()

  test('passes integrity checks', () => {
    expect(checkContent(course, lessons, lexicon)).toEqual([])
  })
  test('has the planned units and lesson order', () => {
    expect(course.id).toBe('genesis-intro')
    expect(course.units.map(u => [u.id, u.lessonIds])).toEqual([
      ['unit-0-alefbet', ['alef-bet-1']],
      ['unit-1-rebekah', ['rebekah-reading', 'rebekah-quiz', 'rebekah-roleplay']],
    ])
  })
  test('roleplay has a choice node that branches on two correct options', () => {
    const rp = lessons.find(l => l.id === 'rebekah-roleplay')
    if (rp?.type !== 'roleplay') throw new Error('missing roleplay')
    const branching = Object.values(rp.nodes).filter(n => {
      if (n.reply?.mode !== 'choice') return false
      const nexts = new Set(n.reply.options.filter(o => o.correct).map(o => o.next))
      return nexts.size >= 2
    })
    expect(branching.length).toBeGreaterThanOrEqual(1)
  })
  test('every referenced illustration exists in public/', () => {
    const srcs = [
      ...course.units.flatMap(u => (u.imageSrc ? [u.imageSrc] : [])),
      ...lessons.flatMap(l => (l.type === 'roleplay' && l.character.avatarSrc ? [l.character.avatarSrc] : [])),
    ]
    expect(srcs).toContain('/illustrations/rebekah-well.webp')
    expect(srcs).toContain('/illustrations/rebekah-face.webp')
    for (const s of srcs) expect(fs.existsSync(`public${s}`), s).toBe(true)
  })
})
