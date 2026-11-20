'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HebrewLine } from '@/lib/content/schema'
import { Illustration } from './Illustration'

/** Pause after a line without a recording: long enough to read it. */
const silentMs = (line: HebrewLine) => 1400 + 260 * line.he.split(/\s+/).length

/**
 * After the battle: the character steps in smiling and says, one by one, the lines the
 * player got right. Words pop in as she speaks; a recording plays when the line has one.
 */
export function VictoryScene({ nameKo, imageSrc, videoSrc, lines, onDone }: { nameKo: string; imageSrc: string; videoSrc?: string; lines: HebrewLine[]; onDone?: () => void }) {
  const [shown, setShown] = useState(0) // lines revealed so far
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0) // bumps on replay so the words pop again
  const audio = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true)

  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    audio.current?.pause()
    audio.current = null
  }

  const say = useCallback((i: number) => {
    stop()
    if (i >= lines.length) { setDone(true); onDoneRef.current?.(); return }
    setShown(i + 1)
    const next = () => { timer.current = setTimeout(() => say(i + 1), 450) }
    const line = lines[i]
    if (line.audioSrc) {
      const a = new Audio(line.audioSrc)
      audio.current = a
      a.onended = next
      const silent = () => { a.onended = null; timer.current = setTimeout(() => say(i + 1), silentMs(line)) }
      a.onerror = silent
      // Autoplay can be refused (or play() may not exist / return a promise); the words still
      // show and the scene moves on.
      try {
        const p = a.play() as Promise<void> | undefined
        if (p && typeof p.catch === 'function') p.catch(silent)
        else silent()
      } catch { silent() }
    } else {
      timer.current = setTimeout(() => say(i + 1), silentMs(line))
    }
  }, [lines])

  useEffect(() => {
    timer.current = setTimeout(() => say(0), 700) // after she has stepped in
    return stop
  }, [say])

  const replay = () => { setDone(false); setShown(0); setRound(r => r + 1); timer.current = setTimeout(() => say(0), 200) }

  return (
    <section className="victory" aria-label={`${nameKo}의 대답`}>
      <div className="victory-figure">
        <span className="victory-glow" aria-hidden="true" />
        {videoSrc ? (
          <video
            className="victory-img victory-video" src={videoSrc} poster={imageSrc}
            autoPlay={!reducedMotion} muted loop playsInline preload="auto"
            aria-label={`웃고 있는 ${nameKo}`} role="img"
          />
        ) : (
          <Illustration src={imageSrc} alt={`웃고 있는 ${nameKo}`} className="victory-img" />
        )}
      </div>
      <div className="victory-lines" aria-live="polite">
        {lines.slice(0, shown).map((line, i) => (
          <div key={`${round}-${i}`} className="victory-bubble">
            <span className="victory-speaker">{nameKo}</span>
            <p lang="he" dir="rtl" className="hebrew victory-he">
              {line.he.split(/\s+/).map((w, j) => (
                <span key={j} className="victory-word" style={{ ['--i' as string]: j }}>{w}</span>
              ))}
            </p>
            {line.translit && <p className="victory-sub">{line.translit}</p>}
            {line.ko && <p className="victory-ko">{line.ko}</p>}
          </div>
        ))}
      </div>
      {done && <button type="button" className="btn secondary victory-replay" onClick={replay}>다시 듣기</button>}
    </section>
  )
}
