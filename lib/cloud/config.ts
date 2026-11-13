import type { CloudApi } from './types'
import { createFakeCloudApi } from './fake-api'

type Env = Record<string, string | undefined>

export function isCloudConfigured(env: Env = {
  // Direct property access so Next.js can inline these at build time.
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function createCloudApi(): CloudApi | null {
  if (!isCloudConfigured()) return null
  if (process.env.NEXT_PUBLIC_CLOUD_FAKE === '1') return createFakeCloudApi()
  // Task 9: createSupabaseCloudApi(url, key)
  return null
}
