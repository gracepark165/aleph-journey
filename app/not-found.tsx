import Link from 'next/link'
import { ZoeSays } from '@/components/Zoe'

export default function NotFound() {
  return (
    <div className="center stack">
      <h1 className="page-title">길을 잃었어요</h1>
      <ZoeSays>찾는 페이지가 없어요. 저랑 같이 돌아가요!</ZoeSays>
      <Link href="/" className="btn">조에에게 돌아가기</Link>
    </div>
  )
}
