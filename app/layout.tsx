import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: '알레프 여정', description: '성경 히브리어 대화 학습 게임' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
