import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Illustration } from '@/components/Illustration'
import { UnitLessons } from '@/components/UnitLessons'
import { loadCourse, loadLesson } from '@/lib/content/load'
import type { Lesson } from '@/lib/content/schema'

export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params
  const course = loadCourse()
  const unit = course.units.find(u => u.id === unitId)
  if (!unit) notFound()
  const lessons = unit.lessonIds.map(id => loadLesson(id)).filter((l): l is Lesson => l !== null)
  return (
    <>
      <Link href="/journey" className="back">← 여정으로</Link>
      {unit.imageSrc && <Illustration src={unit.imageSrc} alt={unit.imageAltKo ?? unit.titleKo} className="unit-banner" />}
      <h1 className="page-title">{unit.titleKo}</h1>
      {unit.refKo && <p className="muted">{unit.refKo}</p>}
      <UnitLessons course={course} lessons={lessons.map(l => ({ id: l.id, type: l.type, titleKo: l.titleKo }))} />
    </>
  )
}
