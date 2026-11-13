-- Run after stub_auth.sql and the migration. Any failed assert aborts psql (ON_ERROR_STOP).
create function public.as_user(u uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', u::text, false);
  set role authenticated;
end $$;
create function public.err_of(sql text) returns text language plpgsql as $$
begin
  execute sql;
  return null;
exception when others then
  return sqlerrm;
end $$;

create table public.t_ids (name text primary key, id uuid not null default gen_random_uuid());
insert into public.t_ids(name) select unnest(array['a','b','c','d','g','k']);
insert into auth.users(id) select id from public.t_ids;
create function public.uid_of(n text) returns uuid language sql as $$ select id from public.t_ids where name = n $$;
grant select on public.t_ids to authenticated;
grant execute on function public.uid_of(text), public.err_of(text) to authenticated;

do $$
declare
  a uuid := uid_of('a'); b uuid := uid_of('b'); c uuid := uid_of('c');
  pa profiles; pb profiles; pb2 profiles;
  n int; r record; ids uuid[];
  total int;
begin
  -- profiles and codes
  perform as_user(a); pa := ensure_profile('아브라함', 'abraham');
  perform as_user(b); pb := ensure_profile('다윗', 'david');
  assert pa.friend_code ~ '^ALEF-[A-HJ-NP-Z2-9]{4}$', 'code format a: ' || pa.friend_code;
  assert pb.friend_code ~ '^ALEF-[A-HJ-NP-Z2-9]{4}$', 'code format b';
  assert pa.friend_code <> pb.friend_code, 'codes differ';
  pb2 := ensure_profile('다른', 'saul');
  assert pb2.nickname = '다윗' and pb2.avatar_id = 'david', 'ensure_profile must not overwrite';
  assert pb2.friend_code = pb.friend_code, 'code stable';

  -- profile_by_code
  select * into r from profile_by_code(lower(pa.friend_code));
  assert r.nickname = '아브라함' and r.is_me = false, 'profile_by_code case-insensitive, is_me false';
  select count(*) into n from profile_by_code('ALEF-ZZZZ');
  assert n = 0, 'unknown code yields no rows';

  -- add_friend errors and success
  perform as_user(a);
  assert err_of('select * from add_friend(''ALEF-ZZZZ'')') = 'not_found', 'not_found';
  assert err_of(format('select * from add_friend(%L)', pa.friend_code)) = 'self', 'self';
  select * into r from add_friend(lower(pb.friend_code));
  assert r.user_id = b and r.nickname = '다윗', 'lowercase code add succeeds';
  assert err_of(format('select * from add_friend(%L)', pb.friend_code)) = 'already', 'already';
  perform as_user(b);
  assert err_of(format('select * from add_friend(%L)', pa.friend_code)) = 'already', 'already (reverse)';
  select count(*) into n from friend_leaderboard(current_week());
  assert n = 2, 'B sees 2 rows';
  perform as_user(a);
  select count(*) into n from friend_leaderboard(current_week());
  assert n = 2, 'A sees 2 rows';

  -- record_xp validation
  assert err_of(format('select record_xp(current_week(), 31, 1)') ) = 'invalid_gained', 'invalid_gained high';
  assert err_of('select record_xp(current_week(), 0, 1)') = 'invalid_gained', 'invalid_gained zero';
  assert err_of('select record_xp(''2020-W01'', 10, 1)') = 'invalid_week', 'invalid_week';
  assert record_xp(previous_week(), 10, 1) = 10, 'previous week allowed';
  assert record_xp(previous_week(), 5, 1) = 15, 'accumulates';

  -- cap at 2100 (user d, not in anyone's board)
  perform as_user(uid_of('d')); perform ensure_profile('d', 'x');
  for i in 1..71 loop total := record_xp(current_week(), 30, 1); end loop;
  assert total = 2100, 'cap 2100, got ' || total;
  assert record_xp(current_week(), 1, 1) = 2100, 'stays at cap';

  -- ranking: A 50/2, B 50/5, C(not friend) 999
  perform as_user(a); perform record_xp(current_week(), 20, 2); perform record_xp(current_week(), 30, 2);
  perform as_user(b); perform record_xp(current_week(), 30, 5); perform record_xp(current_week(), 20, 5);
  perform as_user(c); perform ensure_profile('c', 'x');
  for i in 1..30 loop perform record_xp(current_week(), 30, 1); end loop;
  perform as_user(a);
  select array_agg(l.user_id order by l.ord) into ids
    from (select user_id, row_number() over () ord from friend_leaderboard(current_week())) l;
  assert ids = array[b, a], 'ranking [B, A], got ' || ids::text;
  assert not (c = any(ids)), 'C absent';
end $$;

-- RLS: A cannot see B's progress
do $$
declare a uuid := uid_of('a'); b uuid := uid_of('b'); n int;
begin
  perform as_user(b);
  insert into progress(user_id, snapshot) values (b, '{"xp": 120}');
  perform as_user(a);
  select count(*) into n from progress where user_id = b;
  assert n = 0, 'RLS hides other progress';
  select count(*) into n from profiles where user_id = b;
  assert n = 0, 'RLS hides other profiles';
  assert err_of('select * from weekly_xp') like 'permission denied%', 'weekly_xp not directly readable';
  assert err_of('select * from friendships') like 'permission denied%', 'friendships not directly readable';
  select total_xp into n from friend_leaderboard(current_week()) where user_id = b;
  assert n = 120, 'total_xp from snapshot';
  reset role;
end $$;

-- anon cannot execute RPCs
do $$
begin
  reset role;
  set role anon;
  assert err_of('select * from friend_leaderboard(''2026-W01'')') like 'permission denied%', 'anon blocked';
  assert err_of('select record_xp(''2026-W01'', 1, 1)') like 'permission denied%', 'anon blocked record_xp';
  reset role;
end $$;

-- crown
do $$
declare a uuid := uid_of('a'); b uuid := uid_of('b'); r record; n int;
begin
  reset role;
  insert into weekly_xp(user_id, week, xp, streak) values
    (b, previous_week(), 40, 3) on conflict (user_id, week) do update set xp = 40;
  update weekly_xp set xp = 10 where user_id = a and week = previous_week();
  perform as_user(a);
  select crown into r from friend_leaderboard(current_week()) where user_id = b;
  assert r.crown = true, 'B crowned';
  select crown into r from friend_leaderboard(current_week()) where user_id = a;
  assert r.crown = false, 'A not crowned';
  reset role;
  update weekly_xp set xp = 0 where week = previous_week() and user_id in (a, b);
  perform as_user(a);
  select count(*) into n from friend_leaderboard(current_week()) where crown;
  assert n = 0, 'no crown when last week all zero';
  reset role;
end $$;

-- remove_friend
do $$
declare a uuid := uid_of('a'); b uuid := uid_of('b'); n int; code text;
begin
  perform as_user(a);
  perform remove_friend(b);
  select count(*) into n from friend_leaderboard(current_week());
  assert n = 1, 'only me after remove';
  perform as_user(b);
  select count(*) into n from friend_leaderboard(current_week());
  assert n = 1, 'removal is symmetric';
  -- restore friendship for later checks
  reset role;
  code := (select friend_code from profiles where user_id = b);
  perform as_user(a);
  perform add_friend(code);
  reset role;
end $$;

-- guest transfer
do $$
declare
  g uuid := uid_of('g'); k uuid := uid_of('k'); b uuid := uid_of('b');
  tk text; n int; wk int; code text := (select friend_code from profiles where user_id = b);
begin
  perform as_user(g); perform ensure_profile('손님', 'x');
  perform add_friend(code);
  perform record_xp(previous_week(), 30, 1);
  tk := create_transfer_ticket();
  assert tk is not null and length(tk) >= 16, 'ticket issued';
  perform as_user(k); perform ensure_profile('카카오', 'x');
  perform record_xp(previous_week(), 10, 1);
  perform absorb_guest(tk);
  select count(*) into n from friend_leaderboard(current_week()) where user_id = b;
  assert n = 1, 'K now has B';
  select xp into wk from (select week_xp xp from friend_leaderboard(previous_week()) where is_me) s;
  assert wk >= 30, 'K last week xp >= 30, got ' || wk;
  reset role;
  select count(*) into n from auth.users where id = g;
  assert n = 0, 'guest user deleted';
  perform as_user(k);
  assert err_of(format('select absorb_guest(%L)', tk)) = 'invalid_ticket', 'ticket single-use';
  reset role;
  insert into transfer_tickets(ticket, guest_id, expires_at) values ('expired-ticket-0000000000', b, now() - interval '1 minute');
  perform as_user(k);
  assert err_of('select absorb_guest(''expired-ticket-0000000000'')') = 'invalid_ticket', 'expired ticket';
  assert err_of('select absorb_guest(''nope'')') = 'invalid_ticket', 'unknown ticket';
  reset role;
end $$;

-- delete account
do $$
declare k uuid := uid_of('k'); n int;
begin
  perform as_user(k);
  perform delete_my_account();
  reset role;
  select count(*) into n from profiles where user_id = k;
  assert n = 0, 'profile gone';
  select count(*) into n from auth.users where id = k;
  assert n = 0, 'user gone';
end $$;

\echo friends.test.sql: all assertions passed
