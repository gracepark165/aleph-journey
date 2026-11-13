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
  test('has the alphabet unit and ten scripture units, each reading → quiz → roleplay', () => {
    expect(course.units.map(u => u.id)).toEqual([
      'unit-0-alefbet', 'unit-1-rebekah', 'unit-2-jacob', 'unit-3-joseph', 'unit-4-ruth', 'unit-5-boaz',
      'unit-6-samuel', 'unit-7-david', 'unit-8-elijah', 'unit-9-hosea', 'unit-10-jonah',
    ])
    for (const u of course.units.slice(1)) {
      const types = u.lessonIds.map(id => lessons.find(l => l.id === id)?.type)
      expect(types, u.id).toEqual(['reading', 'quiz', 'roleplay'])
    }
  })
  test('every roleplay character with an avatar and every illustrated unit has its picture', () => {
    const withImage = course.units.filter(u => u.imageSrc).map(u => u.id)
    expect(withImage).toEqual(['unit-1-rebekah', 'unit-2-jacob', 'unit-4-ruth', 'unit-5-boaz', 'unit-6-samuel', 'unit-7-david'])
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
