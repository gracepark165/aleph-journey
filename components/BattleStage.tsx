import type { Monster } from '@/lib/content/schema'
import { ZOE_NAME } from '@/lib/zoe'
import { Illustration } from './Illustration'
import { ZOE_SRC } from './Zoe'

export const ZOE_WORRIED_SRC = '/illustrations/zoe-worried.webp'

/** What just happened; `n` changes on every event so the same animation can replay. */
export type BattleEvent = { kind: 'idle' | 'hit' | 'miss' | 'defeat' | 'lost'; n: number }

const BURST = Array.from({ length: 8 }, (_, i) => i)
const DROPS = Array.from({ length: 12 }, (_, i) => i)

export function BattleStage({ monster, hp, maxHp, event, sceneImageSrc, settled = false }: {
  monster: Monster
  hp: number
  maxHp: number
  event: BattleEvent
  sceneImageSrc?: string
  /** The mission is over: stop pinning the stage so the result card can scroll into view. */
  settled?: boolean
}) {
  const worried = event.kind === 'miss' || event.kind === 'lost'
  const defeated = hp <= 0
  return (
    <section
      className={`battle on-${event.kind}${defeated ? ' is-defeated' : ''}${settled ? ' is-settled' : ''}${monster.stageSrc ? ' has-stage' : ''}`}
      aria-label={`${monster.nameKo}와의 대결`}
      style={monster.stageSrc ? { ['--stage' as string]: `url(${monster.stageSrc})` } : sceneImageSrc ? { ['--scene' as string]: `url(${sceneImageSrc})` } : undefined}
    >
      <div className="battle-hud">
        <span className="battle-name">{monster.nameKo}</span>
        <span className="battle-hp" role="meter" aria-label={`${monster.nameKo} 체력`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={Math.max(hp, 0)}>
          <span style={{ width: `${(100 * Math.max(hp, 0)) / maxHp}%` }} />
        </span>
      </div>

      <div className="battle-field" key={event.n}>
        <div className="battle-zoe">
          <Illustration src={worried ? ZOE_WORRIED_SRC : ZOE_SRC} alt={ZOE_NAME} className="battle-zoe-img" />
        </div>
        <div className={`battle-monster defeat-${monster.defeat}`}>
          <Illustration src={monster.src} alt={monster.nameKo} className="battle-monster-img" />
          {event.kind === 'hit' || event.kind === 'defeat' ? (
            <span className="battle-burst" aria-hidden="true">
              {BURST.map(i => <i key={i} style={{ ['--a' as string]: `${i * 45}deg` }} />)}
            </span>
          ) : null}
          {event.kind === 'defeat' && (
            <span className="battle-drops" aria-hidden="true">
              {DROPS.map(i => <i key={i} style={{ ['--a' as string]: `${i * 30 + (i % 2) * 12}deg`, ['--d' as string]: `${60 + (i % 3) * 22}px` }} />)}
            </span>
          )}
          {(event.kind === 'hit' || event.kind === 'defeat') && <span className="battle-dmg" aria-hidden="true">-1</span>}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {event.kind === 'hit' ? `${monster.nameKo}에게 명중! 남은 체력 ${hp}`
          : event.kind === 'defeat' ? monster.defeatKo
          : event.kind === 'miss' ? '앗, 등불이 하나 꺼졌어요'
          : ''}
      </p>
      {defeated && <p className="battle-defeat-line">{monster.defeatKo}</p>}
    </section>
  )
}
