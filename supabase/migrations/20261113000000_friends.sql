-- Friends + weekly XP ranking.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text check (char_length(nickname) between 1 and 12),
  avatar_id text,
  friend_code text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.weekly_xp (
  user_id uuid not null references auth.users(id) on delete cascade,
  week text not null,
  xp int not null default 0 check (xp between 0 and 2100),
  streak int not null default 0 check (streak >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);

create table public.friendships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index friendships_user_b_idx on public.friendships(user_b);

create table public.transfer_tickets (
  ticket text primary key,
  guest_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

-- RLS: only profiles and progress are directly reachable, and only for the owner.
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.weekly_xp enable row level security;
alter table public.friendships enable row level security;
alter table public.transfer_tickets enable row level security;

revoke all on public.profiles, public.progress, public.weekly_xp,
  public.friendships, public.transfer_tickets from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.progress to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_select_own on public.progress
  for select to authenticated using (user_id = auth.uid());
create policy progress_insert_own on public.progress
  for insert to authenticated with check (user_id = auth.uid());
create policy progress_update_own on public.progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Weeks (ISO, Asia/Seoul)
create function public.current_week() returns text
  language sql stable
  as $$ select to_char(now() at time zone 'Asia/Seoul', 'IYYY-"W"IW') $$;

create function public.previous_week() returns text
  language sql stable
  as $$ select to_char((now() at time zone 'Asia/Seoul') - interval '7 days', 'IYYY-"W"IW') $$;

-- Internal helpers (not exposed)
create function public.snapshot_xp(s jsonb) returns int
  language sql immutable
  as $$
    select case when jsonb_typeof(s->'xp') = 'number'
      then least(greatest(floor((s->>'xp')::numeric), 0), 2147483647)::int
      else 0 end
  $$;

create function public.gen_friend_code() returns text
  language plpgsql volatile
  set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := 'ALEF-';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where friend_code = code);
  end loop;
  return code;
end $$;

create function public.require_uid() returns uuid
  language plpgsql stable
  as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;
  return uid;
end $$;

-- RPCs
create function public.ensure_profile(p_nickname text, p_avatar_id text)
  returns public.profiles
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); result profiles;
begin
  select * into result from profiles where user_id = uid;
  if found then return result; end if;
  insert into profiles(user_id, nickname, avatar_id, friend_code)
    values (uid, p_nickname, p_avatar_id, gen_friend_code())
    on conflict (user_id) do nothing;
  select * into result from profiles where user_id = uid;
  return result;
end $$;

create function public.update_profile(p_nickname text, p_avatar_id text)
  returns public.profiles
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); result profiles;
begin
  update profiles set nickname = p_nickname, avatar_id = p_avatar_id, updated_at = now()
    where user_id = uid returning * into result;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  return result;
end $$;

create function public.profile_by_code(p_code text)
  returns table(nickname text, avatar_id text, is_me boolean)
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid();
begin
  return query
    select p.nickname, p.avatar_id, p.user_id = uid
    from profiles p where p.friend_code = upper(btrim(p_code));
end $$;

create function public.add_friend(p_code text)
  returns table(user_id uuid, nickname text, avatar_id text)
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); target profiles;
begin
  select * into target from profiles p where p.friend_code = upper(btrim(p_code));
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if target.user_id = uid then raise exception 'self' using errcode = 'P0001'; end if;
  begin
    insert into friendships(user_a, user_b)
      values (least(uid, target.user_id), greatest(uid, target.user_id));
  exception when unique_violation then
    raise exception 'already' using errcode = 'P0001';
  end;
  return query select target.user_id, target.nickname, target.avatar_id;
end $$;

create function public.remove_friend(p_user uuid) returns void
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid();
begin
  delete from friendships
    where user_a = least(uid, p_user) and user_b = greatest(uid, p_user);
end $$;

create function public.record_xp(p_week text, p_gained int, p_streak int) returns int
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); total int;
begin
  if p_gained is null or p_gained < 1 or p_gained > 30 then
    raise exception 'invalid_gained' using errcode = 'P0001';
  end if;
  if p_week is distinct from current_week() and p_week is distinct from previous_week() then
    raise exception 'invalid_week' using errcode = 'P0001';
  end if;
  insert into weekly_xp(user_id, week, xp, streak)
    values (uid, p_week, least(p_gained, 2100), greatest(coalesce(p_streak, 0), 0))
  on conflict (user_id, week) do update
    set xp = least(weekly_xp.xp + p_gained, 2100),
        streak = greatest(coalesce(p_streak, 0), 0),
        updated_at = now()
  returning xp into total;
  return total;
end $$;

create function public.friend_leaderboard(p_week text)
  returns table(user_id uuid, nickname text, avatar_id text, total_xp int, week_xp int,
                streak int, is_me boolean, crown boolean)
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); prev text := previous_week();
begin
  return query
  with members as (
    select uid as m
    union
    select case when f.user_a = uid then f.user_b else f.user_a end
      from friendships f where f.user_a = uid or f.user_b = uid
  ),
  last_week as (
    select m.m as uid2, coalesce(w.xp, 0) as xp,
           row_number() over (order by coalesce(w.xp, 0) desc, coalesce(w.streak, 0) desc, p.nickname) as rk
    from members m
    left join weekly_xp w on w.user_id = m.m and w.week = prev
    left join profiles p on p.user_id = m.m
  )
  select m.m,
         p.nickname,
         p.avatar_id,
         snapshot_xp(pr.snapshot),
         coalesce(w.xp, 0),
         coalesce(w.streak, 0),
         m.m = uid,
         coalesce(lw.rk = 1 and lw.xp > 0, false)
  from members m
  left join profiles p on p.user_id = m.m
  left join progress pr on pr.user_id = m.m
  left join weekly_xp w on w.user_id = m.m and w.week = p_week
  left join last_week lw on lw.uid2 = m.m
  order by coalesce(w.xp, 0) desc, coalesce(w.streak, 0) desc, p.nickname;
end $$;

create function public.create_transfer_ticket() returns text
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); t text;
begin
  if not coalesce((select u.is_anonymous from auth.users u where u.id = uid), false) then
    raise exception 'not_guest' using errcode = 'P0001';
  end if;
  t := replace(gen_random_uuid()::text, '-', '');
  delete from transfer_tickets where guest_id = uid or expires_at < now();
  insert into transfer_tickets(ticket, guest_id, expires_at)
    values (t, uid, now() + interval '10 minutes');
  return t;
end $$;

create function public.absorb_guest(p_ticket text) returns void
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); g uuid;
begin
  delete from transfer_tickets
    where ticket = p_ticket and expires_at > now()
    returning guest_id into g;
  if g is null or g = uid then
    raise exception 'invalid_ticket' using errcode = 'P0001';
  end if;

  insert into friendships(user_a, user_b)
    select least(uid, f.other), greatest(uid, f.other)
    from (select case when user_a = g then user_b else user_a end as other
          from friendships where user_a = g or user_b = g) f
    where f.other <> uid
  on conflict do nothing;

  insert into weekly_xp(user_id, week, xp, streak)
    select uid, week, xp, streak from weekly_xp where user_id = g
  on conflict (user_id, week) do update
    set xp = greatest(weekly_xp.xp, excluded.xp),
        streak = greatest(weekly_xp.streak, excluded.streak),
        updated_at = now();

  delete from auth.users where id = g;
end $$;

create function public.delete_my_account() returns void
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid();
begin
  delete from auth.users where id = uid;
end $$;

-- Only signed-in users may call the RPCs.
revoke all on function
  public.current_week(), public.previous_week(), public.gen_friend_code(), public.require_uid(), public.snapshot_xp(jsonb),
  public.ensure_profile(text, text), public.update_profile(text, text),
  public.profile_by_code(text), public.add_friend(text), public.remove_friend(uuid),
  public.record_xp(text, int, int), public.friend_leaderboard(text),
  public.create_transfer_ticket(), public.absorb_guest(text), public.delete_my_account()
  from public, anon;
grant execute on function
  public.current_week(), public.previous_week(), public.require_uid(),
  public.ensure_profile(text, text), public.update_profile(text, text),
  public.profile_by_code(text), public.add_friend(text), public.remove_friend(uuid),
  public.record_xp(text, int, int), public.friend_leaderboard(text),
  public.create_transfer_ticket(), public.absorb_guest(text), public.delete_my_account()
  to authenticated;
