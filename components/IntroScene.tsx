'use client'

import { APP_NAME } from '@/lib/version'
import { Illustration } from './Illustration'

/** Twinkling stars over the sky part of the picture (percent of the scene box). */
const STARS: [number, number, number][] = [
  [12, 6, 0], [28, 4, 0.8], [44, 10, 1.6], [58, 5, 0.4], [70, 14, 1.2], [92, 18, 2],
  [8, 20, 1.4], [36, 22, 0.2], [52, 26, 1.8], [82, 28, 0.6], [20, 32, 1], [64, 34, 2.2],
]

export const INTRO_IMAGE = '/illustrations/zoe-night.webp'
export const GENESIS_15_5 = 'הַבֶּט־נָא הַשָּׁמַיְמָה וּסְפֹר הַכּוֹכָבִים'

/**
 * Zoe watches the night sky; a shooting star falls and the journey begins.
 * Timeline (CSS delays): scene fades in → line 1 → shooting star → line 2 → Gen 15:5 → title and start.
 */
export function IntroScene({ onDone }: { onDone(): void }) {
  return (
    <div className="intro" role="dialog" aria-modal="true" aria-label="인트로">
      <button type="button" className="intro-skip" onClick={onDone}>건너뛰기</button>
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
          <button type="button" className="btn intro-start l6" onClick={onDone}>여정 시작하기</button>
        </div>
      </div>
    </div>
  )
}
