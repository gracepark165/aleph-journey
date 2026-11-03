import { afterEach, expect, test, vi } from 'vitest'
vi.mock('server-only', () => ({}))

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

test('production cache does not grow with unknown lesson ids', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.resetModules()
  const { loadLesson, contentCacheSize } = await import('@/lib/content/load')
  expect(loadLesson('rebekah-quiz')?.type).toBe('quiz')
  expect(loadLesson('nope-0')).toBeNull()
  const size = contentCacheSize()
  for (let i = 1; i <= 50; i++) expect(loadLesson(`nope-${i}`)).toBeNull()
  expect(contentCacheSize()).toBe(size)
})
