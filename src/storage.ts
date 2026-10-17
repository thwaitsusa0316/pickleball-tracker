import type { Game, Player } from './types'

const STORAGE_KEY = 'pickleball-tracker:games:v1'
const SEEDED_KEY = 'pickleball-tracker:seeded:v1'

const SEED_GAMES: Omit<Game, 'id' | 'createdAt'>[] = [
  {
    date: '2026-10-17',
    team1: ['Boyo', 'Maggie'],
    team2: ['Steve', 'Liz'],
    score1: 11,
    score2: 8,
  },
  {
    date: '2026-10-17',
    team1: ['Boyo', 'Maggie'],
    team2: ['Steve', 'Amanda'],
    score1: 11,
    score2: 8,
  },
  {
    date: '2026-10-17',
    team1: ['Boyo', 'Amanda'],
    team2: ['Liz', 'Maggie'],
    score1: 11,
    score2: 3,
  },
  {
    date: '2026-10-17',
    team1: ['Steve', 'Maggie'],
    team2: ['Liz', 'Amanda'],
    score1: 11,
    score2: 8,
  },
]

function makeId(): string {
  return crypto.randomUUID()
}

function sortGames(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })
}

export function loadGames(): Game[] {
  try {
    const seeded = localStorage.getItem(SEEDED_KEY)
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!seeded) {
      const base = Date.parse('2026-10-17T12:00:00')
      const seed: Game[] = SEED_GAMES.map((g, i) => ({
        ...g,
        id: makeId(),
        createdAt: base + i * 1000,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
      localStorage.setItem(SEEDED_KEY, '1')
      return sortGames(seed)
    }

    if (!raw) return []
    return sortGames(JSON.parse(raw) as Game[])
  } catch {
    return []
  }
}

export function saveGames(games: Game[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export function createGame(input: {
  date: string
  team1: [Player, Player]
  team2: [Player, Player]
  score1: number
  score2: number
}): Game {
  return { id: makeId(), createdAt: Date.now(), ...input }
}
