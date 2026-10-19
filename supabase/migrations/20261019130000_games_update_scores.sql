-- Let the anon key edit a game's date, scores, and player names.
-- Paste this whole file into the Supabase SQL editor once.
-- Existing rows are not changed.

grant update (
  play_date,
  score1,
  score2,
  team1_player1,
  team1_player2,
  team2_player1,
  team2_player2
) on public.games to anon, authenticated;

drop policy if exists "games_update_names_anon" on public.games;
drop policy if exists "games_update_anon" on public.games;

create policy "games_update_anon"
  on public.games
  for update
  to anon, authenticated
  using (true)
  with check (true);
