import { STARTING_LAMPS } from '@/lib/script-engine/engine'
import { Icon } from './Icon'

export function LampMeter({ lamps }: { lamps: number }) {
  return (
    <div className="lamps" role="img" aria-label={`남은 등불 ${lamps}개`} title="성막 등불">
      {Array.from({ length: STARTING_LAMPS }, (_, i) => (
        <span key={i} className={`lamp ${i < lamps ? '' : 'off'}`} aria-hidden="true"><Icon name="lamp" size={28} /></span>
      ))}
    </div>
  )
}
