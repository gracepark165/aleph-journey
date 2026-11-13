import { describe, expect, it } from 'vitest'
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
