import { expect, test } from 'vitest'

test('app name is the working title', async () => {
  expect(await import('@/lib/version')).toHaveProperty('APP_NAME', '알레프 여정')
})
