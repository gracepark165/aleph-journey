'use client'

import { useProgress } from '@/lib/progress/ProgressProvider'
import { Icon } from './Icon'

export function HeaderStats() {
  const { snapshot, ready } = useProgress()
  if (!ready) return <div className="stats" aria-hidden="true" />
  return (
    <div className="stats">
      <span className="stat stat-xp" aria-label={`경험치 ${snapshot.xp}`} title="경험치"><Icon name="star" size={18} />{snapshot.xp}</span>
      <span className="stat stat-streak" aria-label={`연속 학습 ${snapshot.streak.current}일`} title="연속 학습일"><Icon name="flame" size={18} />{snapshot.streak.current}</span>
      <span className="stat stat-rest" aria-label={`안식일 쉼표 ${snapshot.restTokens}개`} title="안식일 쉼표"><Icon name="candle" size={18} />{snapshot.restTokens}</span>
    </div>
  )
}
