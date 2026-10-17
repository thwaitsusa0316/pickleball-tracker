import type { Game, Player } from './types'
import { PLAYERS } from './players'
import { getSupabase, type GameRow } from './supabase'

function isPlayer(value: string): value is Player {
  return (PLAYERS as string[]).includes(value)
}

function rowToGame(row: GameRow): Game {
  const players = [
    row.team1_player1,
    row.team1_player2,
    row.team2_player1,
    row.team2_player2,
  ]
  if (!players.every(isPlayer)) {
    throw new Error(`Unexpected player name in game ${row.id}`)
  }
  return {
    id: row.id,
    date: row.play_date,
    team1: [row.team1_player1 as Player, row.team1_player2 as Player],
    team2: [row.team2_player1 as Player, row.team2_player2 as Player],
    score1: row.score1,
    score2: row.score2,
    createdAt: new Date(row.created_at).getTime(),
  }
}

function sortGames(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })
}

export async function loadGames(): Promise<Game[]> {
  const { data, error } = await getSupabase()
    .from('games')
    .select('*')
    .order('play_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return sortGames((data as GameRow[] | null)?.map(rowToGame) ?? [])
}

export async function insertGame(input: {
  date: string
  team1: [Player, Player]
  team2: [Player, Player]
  score1: number
  score2: number
}): Promise<Game> {
  const payload = {
    play_date: input.date,
    team1_player1: input.team1[0],
    team1_player2: input.team1[1],
    team2_player1: input.team2[0],
    team2_player2: input.team2[1],
    score1: input.score1,
    score2: input.score2,
  }

  const { data, error } = await getSupabase()
    .from('games')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return rowToGame(data as GameRow)
}
