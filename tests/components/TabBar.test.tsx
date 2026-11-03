import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
let pathname = '/'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
import { TabBar } from '@/components/TabBar'

describe('TabBar', () => {
  test('three tabs with Zoe in the middle and current tab marked', () => {
    pathname = '/journey'
    render(<TabBar />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    ;['여정', '조에', '단어장'].forEach((name, i) => expect(links[i]).toHaveAccessibleName(name))
    expect(screen.getByRole('link', { name: '여정' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '조에' })).not.toHaveAttribute('aria-current')
  })
  test('unit pages count as the journey tab', () => {
    pathname = '/unit/unit-1-rebekah'
    render(<TabBar />)
    expect(screen.getByRole('link', { name: '여정' })).toHaveAttribute('aria-current', 'page')
  })
  test('hidden inside a lesson', () => {
    pathname = '/lesson/rebekah-quiz'
    const { container } = render(<TabBar />)
    expect(container).toBeEmptyDOMElement()
  })
})
