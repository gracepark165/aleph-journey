import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Noto_Sans_KR, Noto_Serif_Hebrew } from 'next/font/google'
import { HeaderStats } from '@/components/HeaderStats'
import { TabBar } from '@/components/TabBar'
import { ProgressProvider } from '@/lib/progress/ProgressProvider'
import { APP_NAME } from '@/lib/version'
import './globals.css'

const hebrew = Noto_Serif_Hebrew({ subsets: ['hebrew'], weight: ['400', '600'], variable: '--font-hebrew', display: 'swap' })
const korean = Noto_Sans_KR({ subsets: ['latin'], weight: ['400', '700', '800'], variable: '--font-korean', display: 'swap', preload: false })

export const metadata: Metadata = { title: APP_NAME, description: '성경 히브리어를 장면 속 대화로 배우는 게임' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${hebrew.variable} ${korean.variable}`}>
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
            본문: Westminster Leningrad Codex (퍼블릭 도메인) · 형태소 정보: Open Scriptures Hebrew Bible (CC BY 4.0)
          </footer>
          <TabBar />
        </ProgressProvider>
      </body>
    </html>
  )
}
