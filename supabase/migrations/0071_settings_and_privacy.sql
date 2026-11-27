-- Update 33: Settings and privacy. One row of choices per member, saved as soon as they are made.
-- The rules that affect other people (directory, who can message or connect, pause, search engines) are kept
-- here so every screen follows them. Closing an account now waits 30 days, so the member can change their mind.

create table if not exists member_settings (
  member_id uuid primary key references profiles (id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'fr')),
  show_online boolean not null default true,
  in_directory boolean not null default true,
  indexable boolean not null default false,       -- "Let Google show my profile", off by default
  allow_tags boolean not null default true,
  who_message text not null default 'anyone' check (who_message in ('anyone', 'conn')),
  who_request text not null default 'everyone' check (who_request in ('everyone', 'shared')),
  digest text not null default 'weekly' check (digest in ('daily', 'weekly', 'off')),
  alert_messages boolean not null default true,
  alert_requests boolean not null default true,
  alert_leads boolean not null default true,
  alert_deadlines boolean not null default true,
  alert_news boolean not null default true,
  alert_events boolean not null default true,      -- Update 35: event reminders
  paused_at timestamptz,                           -- "Pause my profile"
  close_at timestamptz,                            -- when a closed account is deleted for good
  updated_at timestamptz not null default now()
);
alter table member_settings enable row level security;
drop policy if exists "own settings read" on member_settings;
create policy "own settings read" on member_settings for select to authenticated using (member_id = auth.uid());
drop policy if exists "own settings add" on member_settings;
create policy "own settings add" on member_settings for insert to authenticated with check (member_id = auth.uid());
drop policy if exists "own settings change" on member_settings;
create policy "own settings change" on member_settings for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

-- members can't set or clear the closing date by hand; that goes through close_my_account() / keep_my_account()
create or replace function member_settings_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.closing', true), '') <> '1' then
    if tg_op = 'INSERT' then new.close_at := null;
    else new.close_at := old.close_at; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function member_settings_guard() from public, anon, authenticated;
drop trigger if exists member_settings_guard on member_settings;
create trigger member_settings_guard before insert or update on member_settings for each row execute function member_settings_guard();

-- What others may know about a member's choices: paused, in the directory, indexable, showing online.
create or replace function member_flags(p_ids uuid[]) returns table (member_id uuid, paused boolean, in_directory boolean, indexable boolean, show_online boolean)
language sql stable security definer set search_path = public as $$
  select p.id, s.paused_at is not null, coalesce(s.in_directory, true) and s.paused_at is null, coalesce(s.indexable, false), coalesce(s.show_online, true)
  from unnest(p_ids) as i(id) join profiles p on p.id = i.id left join member_settings s on s.member_id = p.id
$$;
revoke execute on function member_flags(uuid[]) from public;
grant execute on function member_flags(uuid[]) to anon, authenticated;

-- Members who asked not to be in the directory, or who are paused
create or replace function hidden_member_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select member_id from member_settings where not in_directory or paused_at is not null
$$;
revoke execute on function hidden_member_ids() from public;
grant execute on function hidden_member_ids() to anon, authenticated;

-- "Who can message me: Connections only" and "Who can send me connection requests: Shared groups only".
create or replace function messages_respect_settings() returns trigger
language plpgsql security definer set search_path = public as $$
declare s member_settings%rowtype;
begin
  if is_staff() then return new; end if;
  select * into s from member_settings where member_id = new.recipient_id;
  if not found then return new; end if;
  if s.who_message = 'conn' and not exists (
    select 1 from connections c where c.status = 'accepted'
      and ((c.requester_id = new.sender_id and c.addressee_id = new.recipient_id) or (c.requester_id = new.recipient_id and c.addressee_id = new.sender_id))
  ) and not exists (select 1 from messages m where m.sender_id = new.recipient_id and m.recipient_id = new.sender_id) then
    raise exception 'only_connections' using hint = 'This member only takes messages from their connections.';
  end if;
  return new;
end $$;
revoke execute on function messages_respect_settings() from public, anon, authenticated;
drop trigger if exists messages_respect_settings on messages;
create trigger messages_respect_settings before insert on messages for each row execute function messages_respect_settings();

create or replace function connections_respect_settings() returns trigger
language plpgsql security definer set search_path = public as $$
declare s member_settings%rowtype;
begin
  if is_staff() then return new; end if;
  select * into s from member_settings where member_id = new.addressee_id;
  if not found then return new; end if;
  if s.paused_at is not null then raise exception 'member_paused' using hint = 'This member is taking a break.'; end if;
  if s.who_request = 'shared' and not exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id where a.user_id = new.requester_id and b.user_id = new.addressee_id
  ) then
    raise exception 'shared_groups_only' using hint = 'This member only takes requests from people in the same groups.';
  end if;
  return new;
end $$;
revoke execute on function connections_respect_settings() from public, anon, authenticated;
drop trigger if exists connections_respect_settings on connections;
create trigger connections_respect_settings before insert on connections for each row execute function connections_respect_settings();

-- ---------- closing an account: 30 days to change your mind ----------
create or replace function close_my_account() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare d timestamptz := now() + interval '30 days';
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if (select role from team_roles where user_id = auth.uid()) = 'admin'
     and (select count(*) from team_roles where role = 'admin') <= 1 then
    raise exception 'the last admin cannot delete the account';
  end if;
  perform set_config('app.closing', '1', true);
  insert into member_settings (member_id, paused_at, close_at) values (auth.uid(), now(), d)
    on conflict (member_id) do update set paused_at = coalesce(member_settings.paused_at, now()), close_at = d;
  perform set_config('app.closing', '', true);
  return d;
end $$;
revoke execute on function close_my_account() from public, anon;
grant execute on function close_my_account() to authenticated;

create or replace function keep_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  perform set_config('app.closing', '1', true);
  update member_settings set close_at = null, paused_at = null where member_id = auth.uid() and close_at is not null;
  perform set_config('app.closing', '', true);
end $$;
revoke execute on function keep_my_account() from public, anon;
grant execute on function keep_my_account() to authenticated;

-- deletes accounts whose 30 days have passed (daily)
create or replace function close_due_accounts() returns int
language plpgsql security definer set search_path = public, auth as $$
declare n int;
begin
  with gone as (delete from auth.users u using member_settings s where s.member_id = u.id and s.close_at is not null and s.close_at <= now() returning u.id)
  select count(*) into n from gone;
  return n;
end $$;
revoke execute on function close_due_accounts() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('close-due-accounts', '23 3 * * *', 'select public.close_due_accounts()');
  end if;
exception when others then
  raise notice 'pg_cron not set up: %', sqlerrm;
end $$;

-- ---------- the business card follows the pause ----------
-- card_public (Update 31) now answers {"paused": true, ...} for a paused member, so the page can say so
create or replace function card_public(p_handle text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; c business_cards%rowtype; core jsonb; biz record; title text; bizname text;
begin
  select * into p from profiles where handle = lower(p_handle);
  if not found then
    select pr.* into p from handle_redirects r join profiles pr on pr.id = r.member_id where r.old_handle = lower(p_handle) and r.expires_at > now();
  end if;
  if not found or p.status <> 'active' then return null; end if;
  select * into c from business_cards where member_id = p.id;
  if not found or not c.active then return null; end if;
  if exists (select 1 from member_settings s where s.member_id = p.id and s.paused_at is not null) then
    return jsonb_build_object('paused', true, 'id', p.id, 'handle', p.handle, 'name', p.full_name);
  end if;
  select d.core into core from profile_details d where d.user_id = p.id;
  select co.id, co.slug, co.name,
         (select round(avg(r.rating)::numeric, 1) from company_reviews r where r.company_id = co.id) as rating,
         (select count(*) from company_reviews r where r.company_id = co.id) as reviews
    into biz from companies co where co.owner_id = p.id and co.status = 'published' order by co.created_at limit 1;
  title := coalesce(nullif(btrim(c.title), ''), nullif(btrim(split_part(coalesce(p.headline, ''), ',', 1)), ''));
  bizname := coalesce(biz.name, nullif(btrim(substr(coalesce(p.headline, ''), char_length(split_part(coalesce(p.headline, ''), ',', 1)) + 2)), ''));
  return jsonb_strip_nulls(jsonb_build_object(
    'id', p.id,
    'handle', p.handle,
    'name', p.full_name,
    'avatar', p.avatar_url,
    'style', c.style,
    'searchable', c.searchable,
    'title', case when c.show_title then title end,
    'business', case when c.show_business then bizname end,
    'city', case when c.show_city then nullif(btrim(p.location), '') end,
    'phone', case when c.show_phone then coalesce(nullif(btrim(c.phone), ''), nullif(btrim(core->>'phone'), '')) end,
    'email', case when c.show_email then coalesce(nullif(btrim(c.email), ''), nullif(btrim(core->>'email'), '')) end,
    'website', case when c.show_website then coalesce(nullif(btrim(c.website), ''), nullif(btrim(p.website), '')) end,
    'biz_slug', biz.slug,
    'biz_name', biz.name,
    'biz_rating', biz.rating,
    'biz_reviews', case when biz.id is not null then biz.reviews end
  ));
end $$;
revoke execute on function card_public(text) from public;
grant execute on function card_public(text) to anon, authenticated;
