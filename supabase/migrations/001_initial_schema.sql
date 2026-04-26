create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id),
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'finished')),
  join_code text not null unique,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pub_stops (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  stop_index int not null check (stop_index > 0),
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  radius_m int not null default 120 check (radius_m > 0),
  unique (session_id, stop_index)
);

create table if not exists public.session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player' check (role in ('host', 'player')),
  joined_at timestamptz not null default now(),
  disqualified_at timestamptz,
  unique (session_id, user_id)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  stop_id uuid not null references public.pub_stops(id) on delete cascade,
  arrived_at_server timestamptz not null default now(),
  photo_path text not null,
  lat double precision not null,
  lng double precision not null,
  distance_m double precision not null,
  is_valid boolean not null default true,
  invalid_reason text,
  unique (player_id, stop_id)
);

create table if not exists public.player_progress (
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  completed_stops int not null default 0,
  total_stops int not null default 0,
  total_elapsed_seconds int,
  last_valid_checkin_at timestamptz,
  primary key (session_id, player_id)
);

create index if not exists idx_pub_stops_session on public.pub_stops(session_id);
create index if not exists idx_checkins_session_player on public.checkins(session_id, player_id);
create index if not exists idx_checkins_stop on public.checkins(stop_id);
create index if not exists idx_session_players_session on public.session_players(session_id);

create or replace function public.recompute_player_progress(p_session_id uuid, p_player_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_started_at timestamptz;
  v_total_stops int;
  v_completed int;
  v_last_checkin timestamptz;
begin
  select started_at into v_started_at from public.sessions where id = p_session_id;
  select count(*) into v_total_stops from public.pub_stops where session_id = p_session_id;

  select
    count(*),
    max(arrived_at_server)
  into v_completed, v_last_checkin
  from public.checkins c
  where c.session_id = p_session_id
    and c.player_id = p_player_id
    and c.is_valid = true;

  insert into public.player_progress (
    session_id,
    player_id,
    completed_stops,
    total_stops,
    total_elapsed_seconds,
    last_valid_checkin_at
  )
  values (
    p_session_id,
    p_player_id,
    coalesce(v_completed, 0),
    coalesce(v_total_stops, 0),
    case
      when v_started_at is not null and v_completed > 0
      then extract(epoch from (v_last_checkin - v_started_at))::int
      else null
    end,
    v_last_checkin
  )
  on conflict (session_id, player_id) do update set
    completed_stops = excluded.completed_stops,
    total_stops = excluded.total_stops,
    total_elapsed_seconds = excluded.total_elapsed_seconds,
    last_valid_checkin_at = excluded.last_valid_checkin_at;
end;
$$;

create or replace function public.handle_checkin_progress()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.recompute_player_progress(new.session_id, new.player_id);
  return new;
end;
$$;

drop trigger if exists trg_checkin_progress on public.checkins;
create trigger trg_checkin_progress
after insert on public.checkins
for each row execute function public.handle_checkin_progress();

create or replace view public.leaderboard_view as
select
  pp.session_id,
  pp.player_id,
  p.display_name,
  pp.completed_stops,
  pp.total_stops,
  pp.total_elapsed_seconds,
  pp.last_valid_checkin_at,
  rank() over (
    partition by pp.session_id
    order by
      case when pp.total_elapsed_seconds is null then 1 else 0 end asc,
      pp.total_elapsed_seconds asc nulls last,
      pp.last_valid_checkin_at asc nulls last
  ) as rank_position
from public.player_progress pp
left join public.profiles p on p.id = pp.player_id;
