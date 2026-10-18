import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type PlayerRow = {
  id: string
  name: string
  created_at: string
}

export type GameRow = {
  id: string
  play_date: string
  team1_player1: string
  team1_player2: string
  team2_player1: string
  team2_player2: string
  score1: number
  score2: number
  created_at: string
}

type RuntimeConfig = {
  supabaseUrl: string
  supabaseAnonKey: string
}

let url = ''
let anonKey = ''
let ready: Promise<void> | null = null
let client: SupabaseClient | null = null

async function loadRuntimeConfig(): Promise<RuntimeConfig | null> {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<RuntimeConfig>
    if (typeof data.supabaseUrl === 'string' && typeof data.supabaseAnonKey === 'string') {
      return {
        supabaseUrl: data.supabaseUrl,
        supabaseAnonKey: data.supabaseAnonKey,
      }
    }
  } catch {
    // Local Vite often has no /config.json — fall back to import.meta.env
  }
  return null
}

/** Resolve Supabase credentials: runtime /config.json first, then Vite build-time env. */
export function initSupabaseConfig(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const runtime = await loadRuntimeConfig()
      url = runtime?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || ''
      anonKey = runtime?.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      client = null
    })()
  }
  return ready
}

export function getSupabaseConfigError(): string | null {
  if (!url || !anonKey) {
    return 'Missing Supabase URL or anon key. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Railway (Variables), then redeploy so the start script can write /config.json.'
  }
  return null
}

export function getSupabase(): SupabaseClient {
  const err = getSupabaseConfigError()
  if (err) throw new Error(err)
  if (!client) {
    client = createClient(url, anonKey)
  }
  return client
}
