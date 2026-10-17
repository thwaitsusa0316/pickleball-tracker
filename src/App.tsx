import { useEffect, useState, type FormEvent } from 'react'
import type { Game, Player } from './types'
import { PLAYERS, computePairStats, formatDate, pairLabel, todayISO } from './players'
import { createGame, loadGames, saveGames } from './storage'
import './App.css'

type FormState = {
  date: string
  t1p1: Player | ''
  t1p2: Player | ''
  t2p1: Player | ''
  t2p2: Player | ''
  score1: string
  score2: string
}

const emptyForm = (): FormState => ({
  date: todayISO(),
  t1p1: '',
  t1p2: '',
  t2p1: '',
  t2p2: '',
  score1: '',
  score2: '',
})

function validate(form: FormState): string | null {
  const players = [form.t1p1, form.t1p2, form.t2p1, form.t2p2]
  if (players.some((p) => !p)) return 'Pick two players for each team.'
  if (new Set(players).size !== 4) return 'All four players must be distinct.'
  if (!form.date) return 'Choose a play date.'
  if (form.score1 === '' || form.score2 === '') return 'Enter both scores.'
  const s1 = Number(form.score1)
  const s2 = Number(form.score2)
  if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0 || !Number.isInteger(s1) || !Number.isInteger(s2)) {
    return 'Scores must be non-negative whole numbers.'
  }
  return null
}

export default function App() {
  const [games, setGames] = useState<Game[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setGames(loadGames())
  }, [])

  useEffect(() => {
    if (!justSaved) return
    const t = window.setTimeout(() => setJustSaved(false), 1800)
    return () => window.clearTimeout(t)
  }, [justSaved])

  const stats = computePairStats(games)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const message = validate(form)
    if (message) {
      setError(message)
      return
    }

    const next = createGame({
      date: form.date,
      team1: [form.t1p1 as Player, form.t1p2 as Player],
      team2: [form.t2p1 as Player, form.t2p2 as Player],
      score1: Number(form.score1),
      score2: Number(form.score2),
    })

    const updated = [next, ...games].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.createdAt - a.createdAt
    })
    setGames(updated)
    saveGames(updated)
    setForm(emptyForm())
    setError(null)
    setJustSaved(true)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true" />

      <header className="brand">
        <p className="brand-mark">Pickleball</p>
        <h1>Five-player doubles log</h1>
        <p className="lede">
          Liz, Amanda, Boyo, Steve, and Maggie — rotate partners, keep score, see which pairs win.
        </p>
      </header>

      <main>
        <section className="section" aria-labelledby="log-heading">
          <div className="section-head">
            <h2 id="log-heading">Log a game</h2>
            <p>Date, two teams of two, and the final score.</p>
          </div>

          <form className="log-form" onSubmit={onSubmit} noValidate>
            <label className="field date-field">
              <span>Play date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
                required
              />
            </label>

            <div className="teams">
              <fieldset className="team">
                <legend>Team 1</legend>
                <label className="field">
                  <span>Player 1</span>
                  <select
                    value={form.t1p1}
                    onChange={(e) => setField('t1p1', e.target.value as Player | '')}
                  >
                    <option value="">Select…</option>
                    {PLAYERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Player 2</span>
                  <select
                    value={form.t1p2}
                    onChange={(e) => setField('t1p2', e.target.value as Player | '')}
                  >
                    <option value="">Select…</option>
                    {PLAYERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field score-field">
                  <span>Score</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={form.score1}
                    onChange={(e) => setField('score1', e.target.value)}
                    placeholder="0"
                  />
                </label>
              </fieldset>

              <p className="vs" aria-hidden="true">
                vs
              </p>

              <fieldset className="team">
                <legend>Team 2</legend>
                <label className="field">
                  <span>Player 1</span>
                  <select
                    value={form.t2p1}
                    onChange={(e) => setField('t2p1', e.target.value as Player | '')}
                  >
                    <option value="">Select…</option>
                    {PLAYERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Player 2</span>
                  <select
                    value={form.t2p2}
                    onChange={(e) => setField('t2p2', e.target.value as Player | '')}
                  >
                    <option value="">Select…</option>
                    {PLAYERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field score-field">
                  <span>Score</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={form.score2}
                    onChange={(e) => setField('score2', e.target.value)}
                    placeholder="0"
                  />
                </label>
              </fieldset>
            </div>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {justSaved && !error && (
              <p className="saved" role="status">
                Game saved.
              </p>
            )}

            <button type="submit" className="cta">
              Save game
            </button>
          </form>
        </section>

        <section className="section" aria-labelledby="games-heading">
          <div className="section-head">
            <h2 id="games-heading">Games</h2>
            <p>Newest first — multiple games per day are fine.</p>
          </div>

          {games.length === 0 ? (
            <p className="empty">No games logged yet.</p>
          ) : (
            <ul className="game-list">
              {games.map((g) => {
                const t1Win = g.score1 > g.score2
                const t2Win = g.score2 > g.score1
                return (
                  <li key={g.id} className="game-row">
                    <time dateTime={g.date}>{formatDate(g.date)}</time>
                    <div className="matchup">
                      <span className={t1Win ? 'winner' : undefined}>
                        {pairLabel(g.team1[0], g.team1[1])}
                      </span>
                      <span className="score">
                        {g.score1}–{g.score2}
                      </span>
                      <span className={t2Win ? 'winner' : undefined}>
                        {pairLabel(g.team2[0], g.team2[1])}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="section" aria-labelledby="stats-heading">
          <div className="section-head">
            <h2 id="stats-heading">Stats by pair</h2>
            <p>Wins, losses, and games for each unordered partner pair.</p>
          </div>

          {stats.length === 0 ? (
            <p className="empty">Stats appear after you log games.</p>
          ) : (
            <table className="stats-table">
              <thead>
                <tr>
                  <th scope="col">Pair</th>
                  <th scope="col">W</th>
                  <th scope="col">L</th>
                  <th scope="col">GP</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.pairKey}>
                    <th scope="row">{s.label}</th>
                    <td>{s.wins}</td>
                    <td>{s.losses}</td>
                    <td>{s.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Saved in this browser via localStorage.</p>
      </footer>
    </div>
  )
}
