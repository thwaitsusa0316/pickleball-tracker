import type { PairStat, Game, Player } from './types'

export const PLAYERS_SQL_HINT =
  'The players table is missing or empty. In the Supabase SQL editor, run supabase/migrations/20261018140000_create_players.sql (same file as docs/supabase-players.sql). The anon key cannot create tables.'

export function pairKey(a: Player, b: Player): string {
  return [a, b].sort().join('|')
}

export function pairLabel(a: Player, b: Player): string {
  return [a, b].sort().join(' & ')
}

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function computePairStats(games: Game[]): PairStat[] {
  const map = new Map<string, PairStat>()

  const bump = (a: Player, b: Player, won: boolean) => {
    const key = pairKey(a, b)
    const existing = map.get(key) ?? {
      pairKey: key,
      label: pairLabel(a, b),
      wins: 0,
      losses: 0,
      games: 0,
    }
    existing.games += 1
    if (won) existing.wins += 1
    else existing.losses += 1
    map.set(key, existing)
  }

  for (const g of games) {
    const team1Won = g.score1 > g.score2
    const team2Won = g.score2 > g.score1
    if (!team1Won && !team2Won) continue
    bump(g.team1[0], g.team1[1], team1Won)
    bump(g.team2[0], g.team2[1], team2Won)
  }

  return [...map.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.games !== a.games) return b.games - a.games
    return a.label.localeCompare(b.label)
  })
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function duplicateName(name: string, existing: string[], ignore?: string): boolean {
  const key = normalizeName(name).toLowerCase()
  return existing.some((n) => n !== ignore && normalizeName(n).toLowerCase() === key)
}
