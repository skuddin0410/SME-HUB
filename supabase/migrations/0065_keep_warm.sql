-- Keep-warm (Nov 26): Amplify shuts its server down after a few quiet minutes, and the first click after that waited
-- 5-7 seconds while it started again. Every 2 minutes the database calls the site's /api/warm address, which does no
-- work, so the server stays awake. The addresses live in a table, so moving from test.smehub.ca to smehub.ca is a
-- row change, not a code change. Needs pg_cron and pg_net (both available on Supabase); skipped quietly where absent.

create table if not exists public.keep_warm (
  url text primary key check (url ~ '^https://[a-z0-9.-]+/api/warm$'),
  created_at timestamptz not null default now()
);
alter table public.keep_warm enable row level security;
-- no policies: only the database itself (and the team through the dashboard) reads or changes this list
revoke all on public.keep_warm from anon, authenticated;

insert into public.keep_warm (url) values ('https://test.smehub.ca/api/warm') on conflict do nothing;

create or replace function public.keep_warm_ping()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare u text;
begin
  for u in select url from public.keep_warm loop
    perform net.http_get(url := u, timeout_milliseconds := 5000);
  end loop;
end;
$$;
revoke all on function public.keep_warm_ping() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
    perform cron.schedule('keep-warm', '*/2 * * * *', 'select public.keep_warm_ping()');
  end if;
exception when others then
  raise notice 'keep-warm not scheduled: %', sqlerrm;
end;
$$;
