-- One-time seed: four completed games from 2026-10-17
-- Run AFTER supabase/migrations/20261017200000_create_games.sql
-- Safe to re-run only if you truncate first, or if these ids are unused.

insert into public.games (
  id,
  play_date,
  team1_player1,
  team1_player2,
  team2_player1,
  team2_player2,
  score1,
  score2,
  created_at
) values
  (
    'a1000000-0000-4000-8000-000000000001',
    '2026-10-17',
    'Boyo', 'Maggie',
    'Steve', 'Liz',
    11, 8,
    '2026-10-17T12:00:00Z'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '2026-10-17',
    'Boyo', 'Maggie',
    'Steve', 'Amanda',
    11, 8,
    '2026-10-17T12:00:01Z'
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    '2026-10-17',
    'Boyo', 'Amanda',
    'Liz', 'Maggie',
    11, 3,
    '2026-10-17T12:00:02Z'
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    '2026-10-17',
    'Steve', 'Maggie',
    'Liz', 'Amanda',
    11, 8,
    '2026-10-17T12:00:03Z'
  )
on conflict (id) do nothing;
