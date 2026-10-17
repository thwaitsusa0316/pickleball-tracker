export type Player = 'Liz' | 'Amanda' | 'Boyo' | 'Steve' | 'Maggie'

export type Game = {
  id: string
  date: string
  team1: [Player, Player]
  team2: [Player, Player]
  score1: number
  score2: number
  createdAt: number
}

export type PairStat = {
  pairKey: string
  label: string
  wins: number
  losses: number
  games: number
}
