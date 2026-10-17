import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function getSupabaseConfigError(): string | null {
  if (!url || !anonKey) {
    return 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env.local (local) or Railway Variables (production).'
  }
  return null
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  const err = getSupabaseConfigError()
  if (err) throw new Error(err)
  if (!client) {
    client = createClient(url, anonKey)
  }
  return client
}
