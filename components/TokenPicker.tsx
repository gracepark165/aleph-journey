'use client'

import { HebrewText } from './HebrewText'

/** Tap tokens from the bank into the answer line (RTL); tap a placed token to return it. */
export function TokenPicker({ tokens, picked, onChange, disabled }: { tokens: string[]; picked: number[]; onChange(next: number[]): void; disabled?: boolean }) {
  return (
    <>
      <div className="token-line" role="group" aria-label="내 답" dir="rtl">
        {picked.map((ti, pos) => (
          <button key={`${ti}-${pos}`} type="button" className="token" aria-label={tokens[ti]} disabled={disabled}
            onClick={() => onChange(picked.filter((_, p) => p !== pos))}>
            <HebrewText text={tokens[ti]} />
          </button>
        ))}
      </div>
      <div className="token-bank" role="group" aria-label="단어 블록" dir="rtl">
        {tokens.map((t, ti) => picked.includes(ti) ? null : (
          <button key={ti} type="button" className="token" aria-label={t} disabled={disabled} onClick={() => onChange([...picked, ti])}>
            <HebrewText text={t} />
          </button>
        ))}
      </div>
    </>
  )
}
