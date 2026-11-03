import Link from 'next/link'
import { Illustration } from './Illustration'
import { ZOE_SRC } from './Zoe'

export function LessonComplete({ xpGained, unitId, nextLessonId, titleKo = '레슨 완료!' }: { xpGained: number; unitId: string; nextLessonId?: string; titleKo?: string }) {
  return (
    <section className="complete" aria-live="polite">
      <Illustration src={ZOE_SRC} alt="조에" className="zoe-celebrate" />
      <h2>{titleKo}</h2>
      <p className="xp">+{xpGained} XP</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        {nextLessonId && <Link className="btn" href={`/lesson/${nextLessonId}`}>다음 레슨</Link>}
        <Link className="btn secondary" href={`/unit/${unitId}`}>유닛으로</Link>
        <Link className="btn secondary" href="/">조에에게</Link>
      </div>
    </section>
  )
}
