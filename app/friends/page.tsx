import Link from 'next/link'
import { FriendsManager } from '@/components/FriendsManager'

export default function FriendsPage() {
  return (
    <>
      <Link href="/" className="back">← 홈으로</Link>
      <h1 className="page-title">친구</h1>
      <FriendsManager />
    </>
  )
}
