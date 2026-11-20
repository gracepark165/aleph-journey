'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MAP, arrowPath, stopFor, viewFor } from '@/lib/journey-map'
import { Icon } from './Icon'
import { ZOE_SRC } from './Zoe'

export type StageRef = { index: number; titleKo: string; unitId: string }

/**
 * After a stage is cleared: the journey map, a dotted arrow drawn from the cleared stop to the
 * next one, then a circle drawn around the next stop. Cleared stops carry a check.
 */
export function StageMapReveal({ from, to }: { from: StageRef; to?: StageRef }) {
  const box = useRef<HTMLElement>(null)
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true)
  const a = stopFor(from.index)
  const b = to ? stopFor(to.index) : undefined
  const path = b ? arrowPath(a, b) : undefined
  const v = viewFor(a, b)

  useEffect(() => { box.current?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }) }, [reduced])

  return (
    <section ref={box} className={`stage-map${reduced ? ' is-still' : ''}`} aria-label="여정 지도">
      <h2 className="stage-map-title">{to ? '다음 스테이지로!' : '여정을 모두 마쳤어요!'}</h2>
      <div className="stage-map-frame">
        <svg className="stage-map-svg" viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} role="img" aria-label={b ? `${a.nameKo}에서 ${b.nameKo}로 가는 지도` : `${a.nameKo} 지도`}>
          <defs>
            <marker id="stage-arrowhead" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="stage-arrowhead" />
            </marker>
          </defs>
          <image href={MAP.src} width={MAP.width} height={MAP.height} />
          {Array.from({ length: from.index + 1 }, (_, i) => {
            const s = stopFor(i)
            return (
              <g key={i} className="stage-done" transform={`translate(${s.x} ${s.y})`}>
                <circle r="17" />
                <path d="M -7 0 L -2 5 L 8 -6" />
              </g>
            )
          })}
          {path && b && (
            <>
              <path d={path} className="stage-arrow-shadow" />
              <path d={path} className="stage-arrow" pathLength={1} markerEnd="url(#stage-arrowhead)" />
              <circle cx={b.x} cy={b.y} r="40" className="stage-ring" pathLength={1} />
            </>
          )}
          <image href={ZOE_SRC} width="84" height="84" x={a.x - 108} y={a.y - 50} className="stage-zoe" />
        </svg>
      </div>
      {to && b && (
        <div className="stage-next">
          <p className="stage-next-label">
            <strong>{to.index}단계: {to.titleKo}</strong>
            <span className="muted">{b.nameKo}에서 기다리고 있어요</span>
          </p>
          <Link className="btn" href={`/unit/${to.unitId}`}>다음 스테이지<Icon name="arrow" size={20} /></Link>
        </div>
      )}
    </section>
  )
}
