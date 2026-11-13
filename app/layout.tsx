import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { HeaderStats } from '@/components/HeaderStats'
import { TabBar } from '@/components/TabBar'
import { ProgressProvider } from '@/lib/progress/ProgressProvider'
import { APP_NAME } from '@/lib/version'
import './globals.css'

// Fonts load in the browser from Google Fonts, so builds never depend on fetching font metadata.
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;800&family=Noto+Serif+Hebrew:wght@400;600&display=swap'

export const metadata: Metadata = { title: APP_NAME, description: '성경 히브리어를 장면 속 대화로 배우는 게임' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_CSS} />
      </head>
      <body>
        <ProgressProvider>
          <header className="site-header">
            <div className="wrap header-row">
              <Link href="/" className="brand">{APP_NAME}</Link>
              <HeaderStats />
            </div>
          </header>
          <main className="wrap">{children}</main>
          <footer className="wrap site-footer">
            본문: Westminster Leningrad Codex (퍼블릭 도메인) · 형태소 정보: Open Scriptures Hebrew Bible (CC BY 4.0) · 사전 원형: Strong&apos;s Hebrew Dictionary, Open Scriptures (CC BY-SA)
          </footer>
          <TabBar />
        </ProgressProvider>
      </body>
    </html>
  )
}
