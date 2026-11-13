import type { CloudApi } from './types'
import { CloudError } from './types'
import { createFakeCloudApi } from './fake-api'

type Env = Record<string, string | undefined>

export function isCloudConfigured(env: Env = {
  // Direct property access so Next.js can inline these at build time.
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

const METHODS: (keyof CloudApi)[] = [
  'ensureSession', 'ensureProfile', 'updateProfile', 'pullProgress', 'pushProgress', 'recordXp', 'leaderboard',
  'profileByCode', 'addFriend', 'removeFriend', 'connectKakao', 'finishAuth', 'signOut', 'deleteAccount',
]

/** Supabase api whose code (supabase-js) is only downloaded on the first call, so cloud-off builds stay small. */
function lazySupabaseApi(url: string, anonKey: string): CloudApi {
  let loading: Promise<CloudApi> | null = null
  const load = () => (loading ??= import('./supabase-api').then(
    m => m.createSupabaseCloudApi(url, anonKey),
    e => { loading = null; throw new CloudError('network', String(e)) },
  ))
  return Object.fromEntries(METHODS.map(name => [
    name,
    async (...args: unknown[]) => {
      const api = await load()
      return (api[name] as (...a: unknown[]) => Promise<unknown>)(...args)
    },
  ])) as unknown as CloudApi
}

export function createCloudApi(): CloudApi | null {
  if (!isCloudConfigured()) return null
  if (process.env.NEXT_PUBLIC_CLOUD_FAKE === '1') return createFakeCloudApi()
  return lazySupabaseApi(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
