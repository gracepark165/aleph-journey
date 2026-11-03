'use client'

import { useProgress } from '@/lib/progress/ProgressProvider'

export function HeaderStats() {
  const { snapshot, ready } = useProgress()
  if (!ready) return <div className="stats" aria-hidden="true" />
  return (
    <div className="stats">
      <span className="stat" aria-label={`경험치 ${snapshot.xp}`} title="경험치">⭐ {snapshot.xp}</span>
      <span className="stat" aria-label={`연속 학습 ${snapshot.streak.current}일`} title="연속 학습일">🔥 {snapshot.streak.current}</span>
      <span className="stat" aria-label={`안식일 쉼표 ${snapshot.restTokens}개`} title="안식일 쉼표">🕯️ {snapshot.restTokens}</span>
    </div>
  )
}
