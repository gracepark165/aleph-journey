import type { ReactNode } from 'react'
import { ZOE_NAME } from '@/lib/zoe'
import { Illustration } from './Illustration'

export const ZOE_SRC = '/illustrations/zoe.webp'

/** Zoe with a speech bubble. */
export function ZoeSays({ children, size = 'md' }: { children: ReactNode; size?: 'md' | 'lg' }) {
  return (
    <div className={`zoe-says ${size}`}>
      <Illustration src={ZOE_SRC} alt={ZOE_NAME} className="zoe-img" />
      <p className="zoe-bubble">{children}</p>
    </div>
  )
}

/** Answer feedback with a small Zoe; she hops when the answer is right. */
export function ZoeFeedback({ good, children }: { good: boolean; children: ReactNode }) {
  return (
    <div className={`zoe-feedback ${good ? 'good' : 'bad'}`} data-testid="zoe-feedback">
      <Illustration src={ZOE_SRC} alt="" className="zoe-mini" />
      <p className={`feedback ${good ? 'good' : 'bad'}`} role="status">{children}</p>
    </div>
  )
}
