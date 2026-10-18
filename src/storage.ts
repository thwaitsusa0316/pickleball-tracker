import type { Game, Player, PlayerRecord } from './types'
import { PLAYERS_SQL_HINT, normalizeName } from './players'
import { getSupabase, type GameRow, type PlayerRow } from './supabase'

function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    date: row.play_date,
    team1: [row.team1_player1, row.team1_player2],
    team2: [row.team2_player1, row.team2_player2],
    score1: row.score1,
    score2: row.score2,
    createdAt: new Date(row.created_at).getTime(),
  }
}

function rowToPlayer(row: PlayerRow): PlayerRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).getTime(),
  }
}

function sortGames(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  const message = (error.message ?? '').toLowerCase()
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('players') && (message.includes('schema cache') || message.includes('does not exist'))
  )
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

export async function loadPlayers(): Promise<PlayerRecord[]> {
  const { data, error } = await getSupabase()
    .from('players')
    .select('*')
    .order('created_at', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    if (isMissingTable(error)) throw new Error(PLAYERS_SQL_HINT)
    throw error
  }

  return ((data as PlayerRow[] | null) ?? []).map(rowToPlayer)
}

export async function addPlayer(name: string): Promise<PlayerRecord> {
  const cleaned = normalizeName(name)
  if (!cleaned) throw new Error('Enter a name.')

  const { data, error } = await getSupabase()
    .from('players')
    .insert({ name: cleaned })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('That name is already on the list.')
    if (isMissingTable(error)) throw new Error(PLAYERS_SQL_HINT)
    throw error
  }
  return rowToPlayer(data as PlayerRow)
}

const GAME_NAME_COLUMNS = [
  'team1_player1',
  'team1_player2',
  'team2_player1',
  'team2_player2',
] as const

export async function renamePlayer(id: string, oldName: string, nextName: string): Promise<void> {
  const cleaned = normalizeName(nextName)
  if (!cleaned) throw new Error('Enter a name.')
  if (cleaned === oldName) return

  const supabase = getSupabase()
  const { error: playerError } = await supabase
    .from('players')
    .update({ name: cleaned })
    .eq('id', id)

  if (playerError) {
    if (playerError.code === '23505') throw new Error('That name is already on the list.')
    if (isMissingTable(playerError)) throw new Error(PLAYERS_SQL_HINT)
    throw playerError
  }

  for (const column of GAME_NAME_COLUMNS) {
    const { error } = await supabase
      .from('games')
      .update({ [column]: cleaned })
      .eq(column, oldName)
    if (error) {
      throw new Error(
        `Renamed ${oldName} to ${cleaned}, but games still using the old name could not be updated (${error.message}). Run the players SQL so anon can update game names, then save the name again.`,
      )
    }
  }
}
