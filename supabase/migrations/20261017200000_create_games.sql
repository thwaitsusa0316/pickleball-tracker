-- Pickleball Tracker: games table + open anon RLS (casual friends app)
-- Run this in the Supabase SQL Editor (or via CLI), then run supabase/seed.sql

create extension if not exists "pgcrypto";

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  play_date date not null,
  team1_player1 text not null,
  team1_player2 text not null,
  team2_player1 text not null,
  team2_player2 text not null,
  score1 integer not null check (score1 >= 0),
  score2 integer not null check (score2 >= 0),
  created_at timestamptz not null default now()
);

create index if not exists games_play_date_created_at_idx
  on public.games (play_date desc, created_at desc);

alter table public.games enable row level security;

-- Anyone with the anon key can read all games
drop policy if exists "games_select_anon" on public.games;
create policy "games_select_anon"
  on public.games
  for select
  to anon, authenticated
  using (true);

-- Anyone with the anon key can insert games
drop policy if exists "games_insert_anon" on public.games;
create policy "games_insert_anon"
  on public.games
  for insert
  to anon, authenticated
  with check (true);

-- No update/delete policies: anonymous clients cannot change or remove rows
-- via the anon key (service role / dashboard still can).
