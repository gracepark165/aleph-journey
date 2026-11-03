import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HebrewText } from '@/components/HebrewText'

test('renders RTL Hebrew span', () => {
  render(<HebrewText text="מַיִם" />)
  const el = screen.getByText('מַיִם')
  expect(el).toHaveAttribute('lang', 'he')
  expect(el).toHaveAttribute('dir', 'rtl')
})
