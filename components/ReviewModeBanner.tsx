'use client'

import { useProgress } from '@/lib/progress/ProgressProvider'

export function ReviewModeBanner() {
  const { unlockAll, setUnlockAll } = useProgress()
  if (!unlockAll) return null
  return (
    <div className="review-banner" role="status">
      <span>검토 모드 · 모든 레슨 열림</span>
      <button type="button" onClick={() => setUnlockAll(false)}>끄기</button>
    </div>
  )
}
