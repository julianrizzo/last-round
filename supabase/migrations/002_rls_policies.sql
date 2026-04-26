alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.pub_stops enable row level security;
alter table public.session_players enable row level security;
alter table public.checkins enable row level security;
alter table public.player_progress enable row level security;

create or replace function public.is_session_member(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.session_players sp
    where sp.session_id = p_session_id and sp.user_id = p_user_id
  );
$$;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles self write" on public.profiles;
create policy "profiles self write" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "sessions read for members" on public.sessions;
create policy "sessions read for members" on public.sessions
for select using (
  host_user_id = auth.uid()
  or public.is_session_member(id, auth.uid())
);

drop policy if exists "sessions insert host only" on public.sessions;
create policy "sessions insert host only" on public.sessions
for insert with check (host_user_id = auth.uid());

drop policy if exists "sessions host update only" on public.sessions;
create policy "sessions host update only" on public.sessions
for update using (host_user_id = auth.uid()) with check (host_user_id = auth.uid());

drop policy if exists "pub_stops read members" on public.pub_stops;
create policy "pub_stops read members" on public.pub_stops
for select using (public.is_session_member(session_id, auth.uid()));

drop policy if exists "pub_stops draft host insert" on public.pub_stops;
create policy "pub_stops draft host insert" on public.pub_stops
for insert with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_id
      and s.host_user_id = auth.uid()
      and s.status = 'draft'
  )
);

drop policy if exists "pub_stops draft host update" on public.pub_stops;
create policy "pub_stops draft host update" on public.pub_stops
for update using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id
      and s.host_user_id = auth.uid()
      and s.status = 'draft'
  )
) with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_id
      and s.host_user_id = auth.uid()
      and s.status = 'draft'
  )
);

drop policy if exists "pub_stops draft host delete" on public.pub_stops;
create policy "pub_stops draft host delete" on public.pub_stops
for delete using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id
      and s.host_user_id = auth.uid()
      and s.status = 'draft'
  )
);

drop policy if exists "session_players read members" on public.session_players;
create policy "session_players read members" on public.session_players
for select using (public.is_session_member(session_id, auth.uid()));

drop policy if exists "session_players self join" on public.session_players;
create policy "session_players self join" on public.session_players
for insert with check (user_id = auth.uid());

drop policy if exists "checkins read members" on public.checkins;
create policy "checkins read members" on public.checkins
for select using (public.is_session_member(session_id, auth.uid()));

drop policy if exists "checkins own write" on public.checkins;
create policy "checkins own write" on public.checkins
for insert with check (
  player_id = auth.uid()
  and public.is_session_member(session_id, auth.uid())
);

drop policy if exists "player_progress read members" on public.player_progress;
create policy "player_progress read members" on public.player_progress
for select using (public.is_session_member(session_id, auth.uid()));

grant select on public.leaderboard_view to authenticated;
