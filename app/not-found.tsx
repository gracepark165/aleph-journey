import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="center">
      <h1 className="page-title">길을 잃었어요</h1>
      <p className="muted">찾는 페이지가 없습니다.</p>
      <Link href="/" className="btn">진도 지도로 돌아가기</Link>
    </div>
  )
}
