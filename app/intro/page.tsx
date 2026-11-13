'use client'

import { useRouter } from 'next/navigation'
import { IntroScene } from '@/components/IntroScene'
import { useProgress } from '@/lib/progress/ProgressProvider'

export default function IntroPage() {
  const router = useRouter()
  const { markIntroSeen } = useProgress()
  return <IntroScene onDone={() => { markIntroSeen(); router.push('/') }} />
}
