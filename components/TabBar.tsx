'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Illustration } from './Illustration'
import { ZOE_SRC } from './Zoe'
import { Icon, type IconName } from './Icon'

const TABS = [
  { href: '/journey', label: '여정', icon: 'compass' as IconName, match: (p: string) => p === '/journey' || p.startsWith('/unit/') },
  { href: '/', label: '홈', icon: null as IconName | null, match: (p: string) => p === '/' },
  { href: '/vocab', label: '단어장', icon: 'scroll' as IconName, match: (p: string) => p === '/vocab' },
]

export function TabBar() {
  const pathname = usePathname() ?? '/'
  if (pathname.startsWith('/lesson/') || pathname === '/intro') return null
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className={`tab ${t.icon ? '' : 'tab-zoe'}`} aria-current={t.match(pathname) ? 'page' : undefined}>
          {t.icon ? <span className="tab-icon"><Icon name={t.icon} size={24} /></span> : <Illustration src={ZOE_SRC} alt="" className="tab-zoe-img" />}
          <span className="tab-label">{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}
