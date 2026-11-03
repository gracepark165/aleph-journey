'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Illustration } from './Illustration'
import { ZOE_SRC } from './Zoe'

const TABS = [
  { href: '/journey', label: '여정', icon: '🧭', match: (p: string) => p === '/journey' || p.startsWith('/unit/') },
  { href: '/', label: '조에', icon: null, match: (p: string) => p === '/' },
  { href: '/vocab', label: '단어장', icon: '📜', match: (p: string) => p === '/vocab' },
]

export function TabBar() {
  const pathname = usePathname() ?? '/'
  if (pathname.startsWith('/lesson/')) return null
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className={`tab ${t.icon ? '' : 'tab-zoe'}`} aria-current={t.match(pathname) ? 'page' : undefined}>
          {t.icon ? <span className="tab-icon" aria-hidden="true">{t.icon}</span> : <Illustration src={ZOE_SRC} alt="" className="tab-zoe-img" />}
          <span className="tab-label">{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}
