'use client'

import { useState } from 'react'
import type { Lexicon, ReadingLesson } from '@/lib/content/schema'
import { useLessonFinish } from '@/lib/progress/useLessonFinish'
import { HebrewText } from './HebrewText'
import { LessonComplete } from './LessonComplete'

export function ReadingView({ lesson, lexicon, unitId, nextLessonId }: { lesson: ReadingLesson; lexicon: Lexicon; unitId: string; nextLessonId?: string }) {
  const [verseIndex, setVerseIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const { finish, xpGained } = useLessonFinish(lesson)

  if (xpGained !== null) return <LessonComplete xpGained={xpGained} unitId={unitId} nextLessonId={nextLessonId} />

  const verse = lesson.verses[verseIndex]
  const word = selected !== null ? verse.words[selected] : null
  const lexeme = word ? lexicon[word.lemmaId] : undefined
  const last = verseIndex === lesson.verses.length - 1

  const go = (i: number) => { setVerseIndex(i); setSelected(null); setShowTranslation(false) }

  return (
    <article>
      <h1 className="page-title">{lesson.titleKo}</h1>
      <div className="progress-bar" aria-hidden="true"><span style={{ width: `${((verseIndex + 1) / lesson.verses.length) * 100}%` }} /></div>
      <section className="card">
        <p className="verse-ref">{verse.refKo}</p>
        <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>단어를 눌러 뜻을 확인하세요.</p>
        <div className="verse-words" lang="he" dir="rtl">
          {verse.words.map((w, i) => (
            <button key={i} type="button" className="word-btn" aria-pressed={selected === i} aria-label={`단어 ${w.surface}`} onClick={() => setSelected(i)}>
              <HebrewText text={w.surface} />
            </button>
          ))}
        </div>
        <button type="button" className="link-btn" onClick={() => setShowTranslation(v => !v)}>{showTranslation ? '해석 숨기기' : '해석 보기'}</button>
        {showTranslation && <p>{verse.translationKo}</p>}
      </section>

      {word && (
        <section className="card word-card" role="region" aria-label="단어 정보" style={{ marginTop: 12 }}>
          <HebrewText text={word.surface} className="prompt-he" />
          <dl>
            <dt>뜻</dt><dd>{word.glossKo}</dd>
            <dt>음역</dt><dd>{word.translit}</dd>
            {lexeme && (<><dt>기본형</dt><dd><HebrewText text={lexeme.lemma} /> ({lexeme.translit}) · {lexeme.glossKo}</dd><dt>품사</dt><dd>{lexeme.posKo}</dd></>)}
            {word.grammarKo && (<><dt>문법</dt><dd>{word.grammarKo}</dd></>)}
          </dl>
        </section>
      )}

      <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        <button type="button" className="btn secondary" disabled={verseIndex === 0} onClick={() => go(verseIndex - 1)}>이전 구절</button>
        {last ? (
          <button type="button" className="btn" onClick={() => finish({ score: 100, perfect: false }, lesson.verses.flatMap(v => v.words.map(w => w.lemmaId)))}>완료</button>
        ) : (
          <button type="button" className="btn" onClick={() => go(verseIndex + 1)}>다음 구절</button>
        )}
      </div>
    </article>
  )
}
