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

### Schema (`games`)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `play_date` | `date` | Play date |
| `team1_player1`, `team1_player2` | `text` | Team 1 |
| `team2_player1`, `team2_player2` | `text` | Team 2 |
| `score1`, `score2` | `integer` | Non-negative |
| `created_at` | `timestamptz` | Default `now()` |

Players stay hardcoded in the app (`Liz`, `Amanda`, `Boyo`, `Steve`, `Maggie`).

### Security tradeoff (RLS)

Policies let the **anon** key **read and insert** any row. That fits a casual friends scoreboard: no login, shared list.

Anyone who has the public anon key (it ships in the frontend bundle) can:

- read all games
- insert arbitrary games

They **cannot** update or delete via the anon key (no policies for those). Do **not** put the service-role key in Railway or the browser. If you need private or per-user data later, add auth and tighten RLS.

## Railway deploy

Repo is connected for auto-deploy from `main`. Domain: **freepickleball.online**.

### Commands (Railway UI → service → Settings)

| Setting | Value |
|---------|--------|
| **Build Command** | `npm run build` |
| **Start Command** | `npm run start` |

`npm start` runs `serve -s dist -l tcp://0.0.0.0:$PORT` (SPA fallback). No `railway.json` required.

### Environment variables (Railway UI → Variables)

Set **both** (same values as local `.env.local`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vite inlines these at **build** time, so after adding or changing them, trigger a **redeploy / rebuild** (not only a restart).

### Domain

Point / keep custom domain **freepickleball.online** on the Railway service as you already have; no DNS changes are made by this repo.

## Build

```bash
npm run build
npm run start   # serves dist; set PORT locally if needed
```

## Offline HTML note

`public/pickleball-tracker.html` is a standalone localStorage demo only. Production uses the Vite app + Supabase.
