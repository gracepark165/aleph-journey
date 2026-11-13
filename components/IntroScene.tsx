'use client'

import { useEffect, useRef, useState } from 'react'
import { fadeVolume, INTRO_MUSIC_SRC, MUSIC_VOLUME, playSparkle } from '@/lib/intro-audio'
import { APP_NAME } from '@/lib/version'
import { Illustration } from './Illustration'

/** Twinkling stars over the sky part of the picture (percent of the scene box). */
const STARS: [number, number, number][] = [
  [12, 6, 0], [28, 4, 0.8], [44, 10, 1.6], [58, 5, 0.4], [70, 14, 1.2], [92, 18, 2],
  [8, 20, 1.4], [36, 22, 0.2], [52, 26, 1.8], [82, 28, 0.6], [20, 32, 1], [64, 34, 2.2],
]
/** Matches the shooting star's CSS animation-delay. */
const METEOR_AT_MS = 2600

export const INTRO_IMAGE = '/illustrations/zoe-night.webp'
export const GENESIS_15_5 = 'הַבֶּט־נָא הַשָּׁמַיְמָה וּסְפֹר הַכּוֹכָבִים'

/**
 * Zoe watches the night sky; a shooting star falls and the journey begins.
 * Browsers only allow sound after a tap, so the scene waits for one ("tap to start"),
 * then the CSS timeline and the music start together.
 */
export function IntroScene({ onDone }: { onDone(): void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [withSound, setWithSound] = useState(false)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      if (!audio) return
      fadeVolume(audio, 0, 600).then(() => audio.pause())
    }
  }, [])

  useEffect(() => {
    if (!playing || !withSound) return
    const t = setTimeout(() => { if (!mutedRef.current) playSparkle() }, METEOR_AT_MS)
    return () => clearTimeout(t)
  }, [playing, withSound])

  const start = (sound: boolean) => {
    setWithSound(sound)
    setPlaying(true)
    const audio = audioRef.current
    if (!sound || !audio) return
    audio.volume = 0
    audio.play()?.then(() => fadeVolume(audio, MUSIC_VOLUME, 1500)).catch(() => setWithSound(false))
  }

  const toggleMute = () => {
    const next = !muted
    mutedRef.current = next
    setMuted(next)
    if (audioRef.current) audioRef.current.muted = next
  }

  return (
    <div className={`intro ${playing ? 'is-playing' : ''}`} role="dialog" aria-modal="true" aria-label="인트로">
      <audio ref={audioRef} src={INTRO_MUSIC_SRC} preload="auto" loop />
      <div className="intro-controls">
        {playing && withSound && (
          <button type="button" className="intro-pill" aria-pressed={muted} aria-label={muted ? '음악 켜기' : '음악 끄기'} onClick={toggleMute}>
            {muted ? '🔇' : '🔊'}
          </button>
        )}
        <button type="button" className="intro-pill" onClick={onDone}>건너뛰기</button>
      </div>

      <div className="intro-stack">
        <div className="intro-scene">
          <Illustration src={INTRO_IMAGE} alt="밤하늘을 올려다보는 조에" className="intro-img" />
          <span className="intro-lantern" aria-hidden="true" />
          {STARS.map(([x, y, d], i) => (
            <span key={i} className="intro-star" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />
          ))}
          <span className="intro-meteor" data-testid="shooting-star" aria-hidden="true"><span /></span>
        </div>

        <div className="intro-text">
          <p className="intro-line l1">어느 밤, 조에는 하늘을 올려다보았어요.</p>
          <p className="intro-line l2">별이 떨어진 곳에, 오래된 이야기들이 기다리고 있대요.</p>
          <p className="intro-verse l3"><span lang="he" dir="rtl" className="hebrew">{GENESIS_15_5}</span></p>
          <p className="intro-ref l4">하늘을 우러러 별들을 세어 보라 (창세기 15:5)</p>
          <p className="intro-title l5">{APP_NAME}</p>
          <button type="button" className="btn intro-start l6" onClick={onDone} tabIndex={playing ? 0 : -1}>여정 시작하기</button>
        </div>
      </div>

      {!playing && (
        <div className="intro-gate">
          <button type="button" className="intro-tap" onClick={() => start(true)}>
            <span className="intro-tap-label">화면을 눌러 시작하세요 🔊</span>
          </button>
          <button type="button" className="intro-silent" onClick={() => start(false)}>소리 없이 보기</button>
        </div>
      )}
    </div>
  )
}
