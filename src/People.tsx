import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { PlayerRecord } from './types'
import { PLAYERS_SETUP_SQL, duplicateName, normalizeName } from './players'
import { PlayersTableMissing, addPlayer, loadPlayers, renamePlayer } from './storage'
import { getSupabaseConfigError, initSupabaseConfig } from './supabase'
import './App.css'

export default function People() {
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await initSupabaseConfig()
        const cfg = getSupabaseConfigError()
        if (cfg) {
          if (!cancelled) {
            setSetupError(cfg)
            setLoading(false)
          }
          return
        }
        const next = await loadPlayers()
        if (cancelled) return
        setPlayers(next)
        setDrafts(Object.fromEntries(next.map((p) => [p.id, p.name])))
        setTableMissing(false)
        setSetupError(null)
      } catch (e) {
        if (!cancelled) {
          if (e instanceof PlayersTableMissing) {
            setTableMissing(true)
            setSetupError(null)
          } else {
            setSetupError(e instanceof Error ? e.message : 'Could not load people.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function saveName(player: PlayerRecord) {
    const next = drafts[player.id] ?? ''
    const cleaned = normalizeName(next)
    if (!cleaned) {
      setError('Enter a name.')
      return
    }
    if (duplicateName(cleaned, players.map((p) => p.name), player.name)) {
      setError('That name is already on the list.')
      return
    }
    setBusyId(player.id)
    setError(null)
    setNotice(null)
    try {
      await renamePlayer(player.id, player.name, cleaned)
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? { ...p, name: cleaned } : p)))
      setDrafts((prev) => ({ ...prev, [player.id]: cleaned }))
      setNotice(`Saved ${cleaned}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that name.')
    } finally {
      setBusyId(null)
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    const cleaned = normalizeName(newName)
    if (!cleaned) {
      setError('Enter a name.')
      return
    }
    if (duplicateName(cleaned, players.map((p) => p.name))) {
      setError('That name is already on the list.')
      return
    }
    setBusyId('new')
    setError(null)
    setNotice(null)
    try {
      const created = await addPlayer(cleaned)
      setPlayers((prev) => [...prev, created])
      setDrafts((prev) => ({ ...prev, [created.id]: created.name }))
      setNewName('')
      setSetupError(null)
      setNotice(`Added ${created.name}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that person.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true" />

      <header className="brand">
        <Link to="/" className="back">
          ← Games
        </Link>
        <h1>People</h1>
        <p className="lede">Edit a name or add someone. Changes show up for everyone.</p>
      </header>

      <main>
        {setupError && (
          <p className="error banner" role="alert">
            {setupError}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="saved" role="status">
            {notice}
          </p>
        )}

        {tableMissing && (
          <div className="sql-setup">
            <p>Run this once in the Supabase SQL editor. After that, names you add or edit here are saved for everyone.</p>
            <button
              type="button"
              className="cta slim"
              onClick={async () => {
                await navigator.clipboard.writeText(PLAYERS_SETUP_SQL)
                setCopied(true)
              }}
            >
              {copied ? 'Copied' : 'Copy SQL'}
            </button>
            <pre tabIndex={0}>
              <code>{PLAYERS_SETUP_SQL}</code>
            </pre>
          </div>
        )}

        {loading ? (
          <p className="empty">Loading people…</p>
        ) : tableMissing ? null : (
          <ul className="people-list">
            {players.map((player) => {
              const dirty = normalizeName(drafts[player.id] ?? '') !== player.name
              return (
                <li key={player.id} className="person-row">
                  <label className="field">
                    <span className="sr-only">Name</span>
                    <input
                      value={drafts[player.id] ?? ''}
                      onChange={(e) => {
                        setDrafts((prev) => ({ ...prev, [player.id]: e.target.value }))
                        setError(null)
                      }}
                      aria-label={`Name for ${player.name}`}
                    />
                  </label>
                  <button
                    type="button"
                    className="cta slim"
                    disabled={!dirty || busyId === player.id}
                    onClick={() => saveName(player)}
                  >
                    {busyId === player.id ? 'Saving…' : 'Save'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && !tableMissing && (
        <form className="add-person" onSubmit={onAdd}>
          <label className="field">
            <span>Add a person</span>
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setError(null)
              }}
              placeholder="Name"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="cta slim" disabled={busyId === 'new'}>
            {busyId === 'new' ? 'Adding…' : 'Add'}
          </button>
        </form>
        )}
      </main>
    </div>
  )
}
