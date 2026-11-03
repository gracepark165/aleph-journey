import { JourneyMap } from '@/components/JourneyMap'
import { loadCourse } from '@/lib/content/load'

export default function Journey() {
  const course = loadCourse()
  return (
    <>
      <h1 className="page-title">{course.titleKo}</h1>
      <p className="muted">장면을 하나씩 지나며 히브리어 성경을 읽어 보세요.</p>
      <JourneyMap course={course} />
    </>
  )
}
