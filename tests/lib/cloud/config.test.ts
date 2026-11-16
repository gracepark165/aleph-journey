import { afterEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn(async () => ({ data: { session: { user: { id: 'u1', is_anonymous: true } } }, error: null }))
const createClient = vi.fn<(...a: unknown[]) => unknown>(() => ({ auth: { getSession }, rpc: vi.fn(), from: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: (...a: unknown[]) => createClient(...a) }))
import { isCloudConfigured } from '@/lib/cloud/config'

describe('isCloudConfigured', () => {
  it('is true when both variables are set', () => {
    expect(isCloudConfigured({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toBe(true)
  })
  it('is false when either is missing or empty', () => {
    expect(isCloudConfigured({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toBe(false)
    expect(isCloudConfigured({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toBe(false)
    expect(isCloudConfigured({ NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toBe(false)
    expect(isCloudConfigured({})).toBe(false)
  })
})

describe('createCloudApi', () => {
  afterEach(() => { vi.unstubAllEnvs() })
  it('is null without the env variables', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    const { createCloudApi } = await import('@/lib/cloud/config')
    expect(createCloudApi()).toBeNull()
  })
  it('builds the Supabase api when configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'k')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FAKE', '')
    const { createCloudApi } = await import('@/lib/cloud/config')
    const api = createCloudApi()!
    expect(createClient).not.toHaveBeenCalled() // supabase-js loads on first use
    expect(await api.ensureSession()).toEqual({ id: 'u1', isGuest: true })
    await api.ensureSession()
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith('https://x.supabase.co', 'k', expect.anything())
  })
  it('returns one shared instance per configuration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://shared.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'k')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FAKE', '')
    const { createCloudApi } = await import('@/lib/cloud/config')
    const a = createCloudApi()
    expect(createCloudApi()).toBe(a)
    await a!.ensureSession()
    await createCloudApi()!.ensureSession()
    expect(createClient.mock.calls.filter(c => c[0] === 'https://shared.supabase.co')).toHaveLength(1)
  })
  it('turns a failing client setup into a CloudError and retries on the next call', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://flaky.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'k')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FAKE', '')
    const { createCloudApi } = await import('@/lib/cloud/config')
    const { CloudError } = await import('@/lib/cloud/types')
    createClient.mockImplementationOnce(() => { throw new Error('boom') })
    const api = createCloudApi()!
    const err = await api.ensureSession().catch(e => e)
    expect(err).toBeInstanceOf(CloudError)
    expect(err.code).toBe('unknown')
    expect(await api.ensureSession()).toEqual({ id: 'u1', isGuest: true })
  })
})
