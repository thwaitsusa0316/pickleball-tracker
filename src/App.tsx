import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Game, Player, PlayerRecord } from './types'
import { builtinRoster, computePairStats, formatDate, pairLabel, todayISO } from './players'
import { PlayersTableMissing, insertGame, loadGames, loadPlayers, updateGame } from './storage'
import { getSupabaseConfigError, initSupabaseConfig } from './supabase'
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
  if (!form.t1p1 || !form.t2p1) return 'Pick player 1 for each team.'
  const picked = [form.t1p1, form.t1p2, form.t2p1, form.t2p2].filter(Boolean)
  if (new Set(picked).size !== picked.length) return 'Every selected player must be distinct.'
  if (!form.date) return 'Choose a play date.'
  if (form.score1 === '' || form.score2 === '') return 'Enter both scores.'
  const s1 = Number(form.score1)
  const s2 = Number(form.score2)
  if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0 || !Number.isInteger(s1) || !Number.isInteger(s2)) {
    return 'Scores must be non-negative whole numbers.'
  }
  return null
}

function toTeams(form: FormState): { team1: [Player, Player]; team2: [Player, Player] } {
  return {
    team1: [form.t1p1, form.t1p2],
    team2: [form.t2p1, form.t2p2],
  }
}

export default function App() {
  const [games, setGames] = useState<Game[]>([])
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await initSupabaseConfig()
        const cfgErr = getSupabaseConfigError()
        if (cancelled) return
        if (cfgErr) {
          setConfigError(cfgErr)
          setLoadError(cfgErr)
          setLoading(false)
          return
        }
        setConfigError(null)
        const [gamesResult, playersResult] = await Promise.allSettled([loadGames(), loadPlayers()])
        if (cancelled) return

        if (gamesResult.status === 'fulfilled') {
          setGames(gamesResult.value)
        } else {
          const reason = gamesResult.reason
          setLoadError(reason instanceof Error ? reason.message : 'Failed to load games.')
        }

        if (playersResult.status === 'fulfilled') {
          setPlayers(playersResult.value)
        } else if (playersResult.reason instanceof PlayersTableMissing) {
          setPlayers(builtinRoster())
        } else {
          const reason = playersResult.reason
          setLoadError(reason instanceof Error ? reason.message : 'Failed to load players.')
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load games.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!justSaved) return
    const t = window.setTimeout(() => setJustSaved(false), 1800)
    return () => window.clearTimeout(t)
  }, [justSaved])

  const stats = computePairStats(games)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const message = validate(form)
    if (message) {
      setError(message)
      return
    }
    if (configError) {
      setError(configError)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const teams = toTeams(form)
      const next = await insertGame({
        date: form.date,
        team1: teams.team1,
        team2: teams.team2,
        score1: Number(form.score1),
        score2: Number(form.score2),
      })
      setGames((prev) =>
        [next, ...prev].sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date)
          return b.createdAt - a.createdAt
        }),
      )
      setForm(emptyForm())
      setJustSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game.')
    } finally {
      setSaving(false)
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  function startEdit(game: Game) {
    setEditingId(game.id)
    setEditForm({
      date: game.date,
      t1p1: game.team1[0],
      t1p2: game.team1[1],
      t2p1: game.team2[0],
      t2p2: game.team2[1],
      score1: String(game.score1),
      score2: String(game.score2),
    })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
    setEditError(null)
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId || !editForm) return
    const message = validate(editForm)
    if (message) {
      setEditError(message)
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const teams = toTeams(editForm)
      const updated = await updateGame(editingId, {
        date: editForm.date,
        team1: teams.team1,
        team2: teams.team2,
        score1: Number(editForm.score1),
        score2: Number(editForm.score2),
      })
      setGames((prev) =>
        prev
          .map((game) => (game.id === updated.id ? updated : game))
          .sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date)
            return b.createdAt - a.createdAt
          }),
      )
      cancelEdit()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save game.')
    } finally {
      setEditSaving(false)
    }
  }

  function playerChoices(current: string): string[] {
    const names = players.map((player) => player.name)
    if (current && !names.includes(current)) return [current, ...names]
    return names
  }

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true" />

      <header className="brand">
        <div className="brand-row">
          <p className="brand-mark">Pickleball</p>
          <Link to="/players" className="plus" aria-label="People">
            +
          </Link>
        </div>
        <h1>Doubles log</h1>
        <p className="lede">
          {players.length > 0
            ? `${players.map((p) => p.name).join(', ')} — rotate partners, keep score, see which pairs win.`
            : 'Rotate partners, keep score, see which pairs win.'}
        </p>
      </header>

      <main>
        {loadError && (
          <p className="error banner" role="alert">
            {loadError}
          </p>
        )}

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
                    {players.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Player 2 (optional)</span>
                  <select
                    value={form.t1p2}
                    onChange={(e) => setField('t1p2', e.target.value as Player | '')}
                  >
                    <option value="">None</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
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
                    {players.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Player 2 (optional)</span>
                  <select
                    value={form.t2p2}
                    onChange={(e) => setField('t2p2', e.target.value as Player | '')}
                  >
                    <option value="">None</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
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

            <button type="submit" className="cta" disabled={saving || !!configError || loading || players.length === 0}>
              {saving ? 'Saving…' : 'Save game'}
            </button>
          </form>
        </section>

        <section className="section" aria-labelledby="games-heading">
          <div className="section-head">
            <h2 id="games-heading">Games</h2>
            <p>Newest first — multiple games per day are fine.</p>
          </div>

          {loading ? (
            <p className="empty">Loading games…</p>
          ) : games.length === 0 ? (
            <p className="empty">No games logged yet.</p>
          ) : (
            <ul className="game-list">
              {games.map((g) => {
                const t1Win = g.score1 > g.score2
                const t2Win = g.score2 > g.score1
                const editing = editingId === g.id && editForm
                return (
                  <li key={g.id} className="game-row">
                    {editing ? (
                      <form className="edit-form" onSubmit={saveEdit} noValidate>
                        <div className="game-top">
                          <p className="edit-label">Edit game</p>
                          <button type="button" className="text-btn" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                        <label className="field date-field">
                          <span>Play date</span>
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => {
                              setEditForm({ ...editForm, date: e.target.value })
                              setEditError(null)
                            }}
                          />
                        </label>
                        <div className="teams">
                          <fieldset className="team">
                            <legend>Team 1</legend>
                            <label className="field">
                              <span>Player 1</span>
                              <select
                                value={editForm.t1p1}
                                onChange={(e) => {
                                  setEditForm({ ...editForm, t1p1: e.target.value })
                                  setEditError(null)
                                }}
                              >
                                <option value="">Select…</option>
                                {playerChoices(editForm.t1p1).map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field">
                              <span>Player 2 (optional)</span>
                              <select
                                value={editForm.t1p2}
                                onChange={(e) => {
                                  setEditForm({ ...editForm, t1p2: e.target.value })
                                  setEditError(null)
                                }}
                              >
                                <option value="">None</option>
                                {playerChoices(editForm.t1p2).map((name) => (
                                  <option key={name} value={name}>
                                    {name}
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
                                value={editForm.score1}
                                onChange={(e) => {
                                  setEditForm({ ...editForm, score1: e.target.value })
                                  setEditError(null)
                                }}
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
                                value={editForm.t2p1}
                                onChange={(e) => {
                                  setEditForm({ ...editForm, t2p1: e.target.value })
                                  setEditError(null)
                                }}
                              >
                                <option value="">Select…</option>
                                {playerChoices(editForm.t2p1).map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field">
                              <span>Player 2 (optional)</span>
                              <select
                                value={editForm.t2p2}
                                onChange={(e) => {
                                  setEditForm({ ...editForm, t2p2: e.target.value })
                                  setEditError(null)
                                }}
                              >
                                <option value="">None</option>
                                {playerChoices(editForm.t2p2).map((name) => (
                                  <option key={name} value={name}>
                                    {name}
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
                                value={editForm.score2}
                                onChange={(e) => {
                                  setEditForm({ ...editForm, score2: e.target.value })
                                  setEditError(null)
                                }}
                              />
                            </label>
                          </fieldset>
                        </div>
                        {editError && (
                          <p className="error" role="alert">
                            {editError}
                          </p>
                        )}
                        <div className="edit-actions">
                          <button type="submit" className="cta slim" disabled={editSaving}>
                            {editSaving ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" className="text-btn" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="game-top">
                          <time dateTime={g.date}>{formatDate(g.date)}</time>
                          <button type="button" className="text-btn" onClick={() => startEdit(g)}>
                            Edit
                          </button>
                        </div>
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
                      </>
                    )}
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

          {loading ? (
            <p className="empty">Loading stats…</p>
          ) : stats.length === 0 ? (
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
        <p>Games sync via Supabase for everyone on freepickleball.online.</p>
      </footer>
    </div>
  )
}
