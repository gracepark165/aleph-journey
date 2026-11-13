import Link from 'next/link'
import { ProfileEditor } from '@/components/ProfileEditor'

export default function ProfilePage() {
  return (
    <>
      <Link href="/" className="back">← 홈으로</Link>
      <h1 className="page-title">프로필</h1>
      <ProfileEditor />
    </>
  )
}
