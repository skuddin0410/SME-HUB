-- Update 1: sign-up details, newsletter consent, log-in pauses, reset limits, and "where you're logged in".

-- 1. Sign-up now asks first and last name, an optional website, and a newsletter box (unticked).
--    CASL needs express consent, so the date, time and the exact wording are kept.
create table newsletter_consents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  consented_at timestamptz not null default now(),
  wording text not null check (char_length(wording) between 1 and 400),
  source text not null default 'sign_up'
);
alter table newsletter_consents enable row level security;
create policy newsletter_consents_own on newsletter_consents for select using (user_id = auth.uid());
-- nobody writes it from the website: the sign-up trigger below does

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  md jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  nm text;
begin
  nm := coalesce(
    nullif(btrim(coalesce(md ->> 'first_name', '') || ' ' || coalesce(md ->> 'last_name', '')), ''),
    nullif(md ->> 'full_name', ''),
    split_part(new.email, '@', 1));
  insert into profiles (id, full_name, website)
  values (new.id, left(nm, 80), left(btrim(coalesce(md ->> 'website', '')), 200));
  if md ->> 'newsletter' = 'true' then
    insert into newsletter_consents (user_id, wording)
    values (new.id, left(coalesce(nullif(md ->> 'newsletter_wording', ''), 'Weekly CanadianSME newsletter'), 400));
  end if;
  return new;
end $$;

-- 2. Five wrong passwords pause log-ins for that email for 15 minutes.
create table login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  at timestamptz not null default now()
);
create index login_attempts_email_at on login_attempts (email, at desc);
alter table login_attempts enable row level security;
-- no policies: only the functions below touch it

create function login_state(p_email text) returns table (locked_until timestamptz, failed int)
language plpgsql security definer set search_path = '' as $$
declare
  n int; last_at timestamptz;
begin
  select count(*), max(at) into n, last_at
  from public.login_attempts
  where email = lower(btrim(p_email)) and at > now() - interval '15 minutes';
  return query select case when n >= 5 then last_at + interval '15 minutes' end, n;
end $$;

create function login_failed(p_email text) returns table (locked boolean, remaining int, has_account boolean)
language plpgsql security definer set search_path = '' as $$
declare
  e text := lower(btrim(p_email)); n int;
begin
  if char_length(e) not between 3 and 254 then
    return query select false, 5, false;
    return;
  end if;
  delete from public.login_attempts where at < now() - interval '1 day';
  insert into public.login_attempts (email) values (e);
  select count(*) into n from public.login_attempts where email = e and at > now() - interval '15 minutes';
  return query select n >= 5, greatest(5 - n, 0), exists (select 1 from auth.users u where lower(u.email) = e);
end $$;

-- called by the signed-in member right after a good log-in: clears their own count (never anyone else's)
create function login_succeeded() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  delete from public.login_attempts where email = (select lower(u.email) from auth.users u where u.id = auth.uid());
end $$;

revoke all on function login_state(text), login_failed(text), login_succeeded() from public, anon, authenticated;
grant execute on function login_state(text), login_failed(text) to anon, authenticated;
grant execute on function login_succeeded() to authenticated;

-- 3. At most 5 password-reset requests an hour for each email address and each IP address.
create table rate_hits (
  key text not null,
  at timestamptz not null default now()
);
create index rate_hits_key_at on rate_hits (key, at desc);
alter table rate_hits enable row level security;

create function rate_hit(p_key text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if p_key is null or char_length(p_key) not between 1 and 300 or p_max < 1 or p_window > interval '1 day' then
    return false;
  end if;
  delete from public.rate_hits where at < now() - interval '1 day';
  select count(*) into n from public.rate_hits where key = p_key and at > now() - p_window;
  if n >= p_max then return false; end if;
  insert into public.rate_hits (key) values (p_key);
  return true;
end $$;
revoke all on function rate_hit(text, int, interval) from public, anon, authenticated;
grant execute on function rate_hit(text, int, interval) to anon, authenticated;

-- 4. "Where you're logged in": a member sees and ends only their own sessions.
create function my_sessions() returns table (id uuid, user_agent text, ip text, created_at timestamptz, last_seen timestamptz, is_current boolean)
language plpgsql security definer set search_path = '' as $$
declare
  cur uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if auth.uid() is null then return; end if;
  return query
    select s.id, s.user_agent, host(s.ip), s.created_at, coalesce(s.refreshed_at, s.updated_at, s.created_at), s.id = cur
    from auth.sessions s
    where s.user_id = auth.uid() and (s.not_after is null or s.not_after > now())
    order by (s.id = cur) desc, coalesce(s.refreshed_at, s.updated_at, s.created_at) desc
    limit 20;
end $$;

create function end_session(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if auth.uid() is null then return; end if;
  delete from auth.sessions where id = p_id and user_id = auth.uid() and id is distinct from cur;
end $$;

create function end_other_sessions() returns int
language plpgsql security definer set search_path = '' as $$
declare
  cur uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid; n int;
begin
  if auth.uid() is null then return 0; end if;
  delete from auth.sessions where user_id = auth.uid() and id is distinct from cur;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function my_sessions(), end_session(uuid), end_other_sessions() from public, anon, authenticated;
grant execute on function my_sessions(), end_session(uuid), end_other_sessions() to authenticated;

-- 5. "Email code on new devices": on by default, the member can switch it off on the security page.
create table user_security (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_code boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table user_security enable row level security;
create policy user_security_own_read on user_security for select using (user_id = auth.uid());
create policy user_security_own_write on user_security for insert with check (user_id = auth.uid());
create policy user_security_own_update on user_security for update using (user_id = auth.uid()) with check (user_id = auth.uid());
