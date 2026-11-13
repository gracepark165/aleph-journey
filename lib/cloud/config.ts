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
  'profileByCode', 'addFriend', 'removeFriend', 'connectKakao', 'continueKakaoLogin', 'finishAuth', 'signOut', 'deleteAccount',
]

/** Supabase api whose code (supabase-js) is only downloaded on the first call, so cloud-off builds stay small. */
function lazySupabaseApi(url: string, anonKey: string): CloudApi {
  let loading: Promise<CloudApi> | null = null
  const create = async (): Promise<CloudApi> => {
    let mod: typeof import('./supabase-api')
    try {
      mod = await import('./supabase-api')
    } catch (e) {
      throw new CloudError('network', String(e))
    }
    try {
      return mod.createSupabaseCloudApi(url, anonKey)
    } catch (e) {
      throw new CloudError('unknown', String(e))
    }
  }
  // A failed load is forgotten so the next call tries again.
  const load = () => (loading ??= create().catch(e => { loading = null; throw e }))
  return Object.fromEntries(METHODS.map(name => [
    name,
    async (...args: unknown[]) => {
      const api = await load()
      return (api[name] as (...a: unknown[]) => Promise<unknown>).apply(api, args)
    },
  ])) as unknown as CloudApi
}

/** One api per configuration, so every caller (CloudProvider, /auth/callback) shares one Supabase auth client. */
let shared: { key: string; api: CloudApi } | null = null

export function createCloudApi(): CloudApi | null {
  if (!isCloudConfigured()) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const fake = process.env.NEXT_PUBLIC_CLOUD_FAKE === '1'
  const key = `${fake ? 'fake' : 'supabase'}|${url}|${anonKey}`
  if (shared?.key !== key) shared = { key, api: fake ? createFakeCloudApi() : lazySupabaseApi(url, anonKey) }
  return shared.api
}
