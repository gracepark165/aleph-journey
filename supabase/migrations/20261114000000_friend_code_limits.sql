-- Friend-code abuse limits and a stricter guest transfer. Run after 20261113000000_friends.sql.
--
-- 1. Rate limit: each unknown friend code a user looks up (profile_by_code or add_friend) is
--    recorded. After 20 misses within the last hour, every lookup by that user (even a valid
--    code) raises 'rate_limited' until the oldest misses are more than an hour old. Found codes
--    never count. Anonymous accounts are free, so this only slows down enumeration; add
--    Supabase's CAPTCHA (Cloudflare Turnstile) for anonymous sign-ins if abuse continues.
--    add_friend now returns no row (instead of raising 'not_found') for an unknown code: an
--    error would roll back the recorded miss. The client maps an empty result to not_found.
-- 2. absorb_guest only absorbs an account that is still anonymous.

create table public.friend_code_misses (
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index friend_code_misses_user_at_idx on public.friend_code_misses(user_id, at);

alter table public.friend_code_misses enable row level security;
revoke all on public.friend_code_misses from anon, authenticated;

-- Internal helpers (not exposed)
create function public.check_code_rate(uid uuid) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from friend_code_misses m
      where m.user_id = uid and m.at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end $$;

create function public.record_code_miss(uid uuid) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  delete from friend_code_misses m where m.user_id = uid and m.at <= now() - interval '1 hour';
  insert into friend_code_misses(user_id) values (uid);
end $$;

revoke all on function public.check_code_rate(uuid), public.record_code_miss(uuid) from public, anon, authenticated;

create or replace function public.profile_by_code(p_code text)
  returns table(nickname text, avatar_id text, is_me boolean)
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); found_any boolean := false;
begin
  perform check_code_rate(uid);
  for nickname, avatar_id, is_me in
    select p.nickname, p.avatar_id, p.user_id = uid
    from profiles p where p.friend_code = upper(btrim(p_code))
  loop
    found_any := true;
    return next;
  end loop;
  if not found_any then perform record_code_miss(uid); end if;
end $$;

create or replace function public.add_friend(p_code text)
  returns table(user_id uuid, nickname text, avatar_id text)
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); target profiles;
begin
  perform check_code_rate(uid);
  select * into target from profiles p where p.friend_code = upper(btrim(p_code));
  if not found then
    -- No row instead of an error, so the recorded miss is committed.
    perform record_code_miss(uid);
    return;
  end if;
  if target.user_id = uid then raise exception 'self' using errcode = 'P0001'; end if;
  begin
    insert into friendships(user_a, user_b)
      values (least(uid, target.user_id), greatest(uid, target.user_id));
  exception when unique_violation then
    raise exception 'already' using errcode = 'P0001';
  end;
  return query select target.user_id, target.nickname, target.avatar_id;
end $$;

create or replace function public.absorb_guest(p_ticket text) returns void
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := require_uid(); g uuid;
begin
  delete from transfer_tickets
    where ticket = p_ticket and expires_at > now()
    returning guest_id into g;
  -- The source must still be a guest: a ticket minted before that guest linked Kakao is void.
  if g is null or g = uid
     or not exists (select 1 from auth.users u where u.id = g and u.is_anonymous) then
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

-- create or replace keeps the existing grants; restate them so this file is self-describing.
revoke all on function public.profile_by_code(text), public.add_friend(text), public.absorb_guest(text) from public, anon;
grant execute on function public.profile_by_code(text), public.add_friend(text), public.absorb_guest(text) to authenticated;
