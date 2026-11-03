'use client'

import { useState } from 'react'
import type { HebrewLine } from '@/lib/content/schema'
import { HebrewText } from './HebrewText'

export function ChatBubble({ line, speaker, side }: { line: HebrewLine; speaker: string; side: 'npc' | 'me' }) {
  const [showTranslit, setShowTranslit] = useState(true)
  const [showKo, setShowKo] = useState(false)
  return (
    <article className={`bubble ${side}`} aria-label={`${speaker}의 말`}>
      <span className="speaker">{speaker}</span>
      <HebrewText text={line.he} />
      {showTranslit && line.translit && <span className="sub">{line.translit}</span>}
      {showKo && line.ko && <span className="sub">{line.ko}</span>}
      <span className="bubble-tools">
        <button type="button" className="link-btn" aria-pressed={showTranslit} onClick={() => setShowTranslit(v => !v)}>음역</button>
        <button type="button" className="link-btn" aria-pressed={showKo} onClick={() => setShowKo(v => !v)}>해석</button>
      </span>
    </article>
  )
}
