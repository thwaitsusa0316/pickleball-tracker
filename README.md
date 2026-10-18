# Pickleball Tracker

Minimal doubles pickleball tracker for a fixed group of five players — **Liz, Amanda, Boyo, Steve, and Maggie** — who rotate partners.

Hosted at **[freepickleball.online](https://freepickleball.online)** (Railway), backed by **Supabase**.

## Features

- **Log a game** — play date, two teams of two (dropdowns), and scores, with validation
- **Games list** — newest first; multiple games per day supported
- **Stats by pair** — wins / losses / games played for each unordered partner pair (full names, alphabetically normalized)

Games persist in a shared Supabase `games` table (not browser localStorage).

## Run locally

1. Copy env vars:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase → **Project Settings → API**.

2. Apply schema + seed in the Supabase SQL Editor (see below) if you have not already.

3. Start the app:

   ```bash
   npm install
   npm run dev
   ```

## Supabase setup

In the [Supabase SQL Editor](https://supabase.com/dashboard), run these files **in order**:

1. **`supabase/migrations/20261017200000_create_games.sql`** — creates `games`, enables RLS, allows anon `SELECT` + `INSERT`
2. **`supabase/seed.sql`** — inserts the four completed 2026-10-17 games (skips the unfinished fifth row)
3. **`supabase/migrations/20261018140000_create_players.sql`** — creates `players`, seeds Liz, Amanda, Boyo, Steve, Maggie, and Paddy Schipp, and lets anon update player names on games

### Schema (`games`)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `play_date` | `date` | Play date |
| `team1_player1`, `team1_player2` | `text` | Team 1 |
| `team2_player1`, `team2_player2` | `text` | Team 2 |
| `score1`, `score2` | `integer` | Non-negative |
| `created_at` | `timestamptz` | Default `now()` |

The **+** control opens `/players`. When the `players` table exists, names load from Supabase (an empty table is filled with Liz, Amanda, Boyo, Steve, Maggie, and Paddy Schipp). If that table has not been created yet, the game log still uses those six names, and `/players` shows the setup SQL to run once in the Supabase SQL editor. Renames also rewrite matching name columns on past games so pair stats stay attached.

### Schema (`players`)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `name` | `text` | Unique, not blank |
| `created_at` | `timestamptz` | Default `now()` |

### Security tradeoff (RLS)

Policies let the **anon** key **read and insert** any row. That fits a casual friends scoreboard: no login, shared list.

Anyone who has the public anon key (it ships in the frontend bundle) can:

- read all games and players
- insert games and players
- rename players, and update the four name columns on games (scores and dates stay locked by column grants)

They cannot delete rows. Do **not** put the service-role key in Railway or the browser. If you need private or per-user data later, add auth and tighten RLS.

## Railway deploy

Repo is connected for auto-deploy from `main`. Domain: **freepickleball.online**.

### Commands (Railway UI → service → Settings)

| Setting | Value |
|---------|--------|
| **Build Command** | `npm run build` |
| **Start Command** | `npm run start` |

`npm start` writes `dist/config.json` from env, then runs `serve -s dist -l tcp://0.0.0.0:$PORT` (SPA fallback). No `railway.json` required.

### Environment variables (Railway UI → Variables)

Set these on the **same service** that runs the web app (not a separate worker):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** `public` key |

Aliases also work: `SUPABASE_URL` / `SUPABASE_ANON_KEY`.

**Why the old “Missing VITE_…” error:** Vite only bakes `import.meta.env.VITE_*` at **build** time. If vars were added after the last build (or only as runtime-only without a rebuild), the JS bundle had empty values. The app now loads `/config.json` written at **container start**, so a redeploy/restart with vars set is enough — a full rebuild is still fine but no longer required for these two keys.

After setting variables: **Deploy → Redeploy** (or push to `main`). Confirm deploy logs show `write-runtime-config: wrote dist/config.json`.

### Domain / “Not secure”

Production should be opened as **`https://freepickleball.online`** (not `http://`).

Railway already serves TLS for this hostname (Let's Encrypt). HTTP redirects to HTTPS. If a browser still says “Not secure”:

1. Use the `https://` URL explicitly.
2. In Railway → service → **Settings → Networking / Custom Domain**, confirm `freepickleball.online` shows a valid certificate (not “pending”).
3. DNS should CNAME (or Railway’s recommended record) to your `*.up.railway.app` service; wait for DNS/SSL to finish after any domain change.
4. Hard-refresh or try a private window (stale HTTP bookmarks can confuse).

## Build

```bash
npm run build
npm run start   # serves dist; set PORT locally if needed
```

## Offline HTML note

`public/pickleball-tracker.html` is a standalone localStorage demo only. Production uses the Vite app + Supabase.
