-- Players roster + rename support for games.
-- Paste this whole file into the Supabase SQL Editor.
-- The anon key cannot run DDL; this must be run as the project owner.

create extension if not exists "pgcrypto";

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

alter table public.players enable row level security;

drop policy if exists "players_select_anon" on public.players;
create policy "players_select_anon"
  on public.players
  for select
  to anon, authenticated
  using (true);

drop policy if exists "players_insert_anon" on public.players;
create policy "players_insert_anon"
  on public.players
  for insert
  to anon, authenticated
  with check (length(btrim(name)) > 0);

drop policy if exists "players_update_anon" on public.players;
create policy "players_update_anon"
  on public.players
  for update
  to anon, authenticated
  using (true)
  with check (length(btrim(name)) > 0);

grant select, insert, update on public.players to anon, authenticated;

-- Renaming a player rewrites matching name columns on games.
-- Other columns (scores, dates) are not granted to anon.
revoke update on table public.games from anon, authenticated;
grant update (
  team1_player1,
  team1_player2,
  team2_player1,
  team2_player2
) on public.games to anon, authenticated;

drop policy if exists "games_update_names_anon" on public.games;
create policy "games_update_names_anon"
  on public.games
  for update
  to anon, authenticated
  using (true)
  with check (true);

insert into public.players (name) values
  ('Liz'),
  ('Amanda'),
  ('Boyo'),
  ('Steve'),
  ('Maggie'),
  ('Paddy Schipp')
on conflict (name) do nothing;
