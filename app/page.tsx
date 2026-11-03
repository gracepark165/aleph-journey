import { TodayHome } from '@/components/TodayHome'
import { loadAllLessons, loadCourse } from '@/lib/content/load'

export default function Home() {
  const lessons = loadAllLessons().map(l => ({ id: l.id, type: l.type, titleKo: l.titleKo }))
  return <TodayHome course={loadCourse()} lessons={lessons} />
}
