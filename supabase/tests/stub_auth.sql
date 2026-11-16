-- Minimal emulation of Supabase's auth schema and roles, for local SQL tests only.
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  is_anonymous boolean default true
);
create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
