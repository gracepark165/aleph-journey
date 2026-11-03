import Link from 'next/link'

export function LessonComplete({ xpGained, unitId, nextLessonId, titleKo = '레슨 완료!' }: { xpGained: number; unitId: string; nextLessonId?: string; titleKo?: string }) {
  return (
    <section className="complete" aria-live="polite">
      <h2>{titleKo}</h2>
      <p className="xp">+{xpGained} XP</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        {nextLessonId && <Link className="btn" href={`/lesson/${nextLessonId}`}>다음 레슨</Link>}
        <Link className="btn secondary" href={`/unit/${unitId}`}>유닛으로</Link>
        <Link className="btn secondary" href="/">지도로</Link>
      </div>
    </section>
  )
}
