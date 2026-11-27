-- Updates 35 and 37: Events. Every member can save events, register, get reminders and add events to their own
-- calendar. Only SME Advisors host events (Update 37 reverses Update 35's Plus hosting); the database checks the
-- plan, not just the page. Times are stored in UTC and shown in the event's own time zone.

-- ---------- the events ----------
alter table hub_events
  add column if not exists description text not null default '' check (char_length(description) <= 2000),
  add column if not exists host_kind text not null default 'hub' check (host_kind in ('hub', 'csme', 'member')),
  add column if not exists host_id uuid references profiles (id) on delete cascade,
  add column if not exists type text not null default 'Webinar' check (type in ('Webinar', 'Workshop', 'Networking', 'Live Q&A', 'Conference')),
  add column if not exists topic text not null default 'Community' check (topic in ('Money and tax', 'Marketing', 'Selling and export', 'Hiring and people', 'Tech and AI', 'Made in Canada', 'Community')),
  add column if not exists fmt text not null default 'online' check (fmt in ('online', 'inperson')),
  add column if not exists ends_at timestamptz,
  add column if not exists tz text not null default 'ET' check (tz in ('PT', 'MT', 'CT', 'ET', 'AT')),
  add column if not exists city text not null default '' check (char_length(city) <= 80),
  add column if not exists prov text not null default '' check (prov in ('', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  add column if not exists venue text not null default '' check (char_length(venue) <= 160),
  add column if not exists price int check (price is null or price between 0 and 10000), -- dollars before HST; null = to be announced
  add column if not exists cap int check (cap is null or cap between 1 and 100000),
  add column if not exists img text not null default 'awning' check (img in ('laptop', 'awning', 'bars', 'nodes', 'bakery', 'ship')),
  add column if not exists series text not null default '' check (char_length(series) <= 60),
  add column if not exists agenda text[] not null default '{}' check (cardinality(agenda) <= 12),
  add column if not exists flagship boolean not null default false,
  add column if not exists cancelled_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();
alter table hub_events drop constraint if exists hub_events_times;
alter table hub_events add constraint hub_events_times check (ends_at is null or starts_at is null or ends_at > starts_at);
alter table hub_events drop constraint if exists hub_events_host;
alter table hub_events add constraint hub_events_host check ((host_kind = 'member') = (host_id is not null));
create index if not exists hub_events_upcoming on hub_events (starts_at) where status = 'published' and cancelled_at is null;
create index if not exists hub_events_host_idx on hub_events (host_id) where host_id is not null;

-- the meeting link is only for the host and the people who registered
create table if not exists hub_event_private (
  event_id uuid primary key references hub_events (id) on delete cascade,
  meeting_link text not null default '' check (meeting_link = '' or (char_length(meeting_link) <= 300 and meeting_link ~ '^https://[^\s<>"]+$'))
);
alter table hub_event_private enable row level security;
drop policy if exists "host reads link" on hub_event_private;
create policy "host reads link" on hub_event_private for select to authenticated
  using (exists (select 1 from hub_events e where e.id = event_id and (e.host_id = auth.uid() or is_staff())));
drop policy if exists "host writes link" on hub_event_private;
create policy "host writes link" on hub_event_private for all to authenticated
  using (exists (select 1 from hub_events e where e.id = event_id and e.host_id = auth.uid()))
  with check (exists (select 1 from hub_events e where e.id = event_id and e.host_id = auth.uid()));

-- who may host: SME Advisors (Update 37), and the Hub team
create or replace function can_host_events(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = uid and p.status = 'active' and (p.plan = 'advisor' or p.profile_type = 'advisor'))
$$;
revoke execute on function can_host_events(uuid) from public, anon;
grant execute on function can_host_events(uuid) to authenticated;

drop policy if exists "advisors host events" on hub_events;
create policy "advisors host events" on hub_events for insert to authenticated
  with check (host_kind = 'member' and host_id = auth.uid() and can_host_events(auth.uid()) and status = 'published' and not flagship);
drop policy if exists "hosts change their events" on hub_events;
create policy "hosts change their events" on hub_events for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid() and host_kind = 'member' and not flagship);
drop policy if exists "hosts see their events" on hub_events;
create policy "hosts see their events" on hub_events for select to authenticated using (host_id = auth.uid());

-- hosts can't move an event to someone else or make it a CanadianSME flagship
create or replace function hub_events_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and auth.uid() is not null and not is_staff() then
    new.host_id := old.host_id; new.host_kind := old.host_kind; new.flagship := old.flagship; new.slug := old.slug; new.position := old.position;
  end if;
  return new;
end $$;
revoke execute on function hub_events_guard() from public, anon, authenticated;
drop trigger if exists hub_events_guard on hub_events;
create trigger hub_events_guard before insert or update on hub_events for each row execute function hub_events_guard();

-- ---------- saving, registering, reminders ----------
create table if not exists event_saves (
  event_id uuid not null references hub_events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table event_saves enable row level security;
drop policy if exists "own saves" on event_saves;
create policy "own saves" on event_saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- per event: 1 week, 1 day, 1 hour before (default 1 day and 1 hour)
create table if not exists event_reminders (
  event_id uuid not null references hub_events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  week boolean not null default false,
  day boolean not null default true,
  hour boolean not null default true,
  primary key (event_id, user_id)
);
alter table event_reminders enable row level security;
drop policy if exists "own reminders" on event_reminders;
create policy "own reminders" on event_reminders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reminders already sent, so each goes once
create table if not exists event_reminders_sent (
  event_id uuid not null references hub_events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('week', 'day', 'hour', 'date')),
  sent_at timestamptz not null default now(),
  primary key (event_id, user_id, kind)
);
alter table event_reminders_sent enable row level security;

-- registrations: paid events are added by the payment webhook only; a full event takes no more
alter table event_rsvps add column if not exists paid_cents int, add column if not exists payment_id text unique;
create or replace function event_rsvps_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare e hub_events%rowtype; n int;
begin
  select * into e from hub_events where id = new.event_id;
  if not found or e.status <> 'published' or e.cancelled_at is not null then raise exception 'event_unavailable'; end if;
  if e.starts_at is null then raise exception 'event_no_date'; end if;
  if e.starts_at < now() then raise exception 'event_past'; end if;
  if coalesce(e.price, 0) > 0 and new.payment_id is null and coalesce(current_setting('app.event_paid', true), '') <> '1' then
    raise exception 'event_needs_payment';
  end if;
  if e.cap is not null then
    select count(*) into n from event_rsvps where event_id = new.event_id;
    if n >= e.cap then raise exception 'event_full'; end if;
  end if;
  insert into event_saves (event_id, user_id) values (new.event_id, new.user_id) on conflict do nothing;
  return new;
end $$;
revoke execute on function event_rsvps_guard() from public, anon, authenticated;
drop trigger if exists event_rsvps_guard on event_rsvps;
create trigger event_rsvps_guard before insert on event_rsvps for each row execute function event_rsvps_guard();

-- the webhook registers someone after Stripe confirms payment (once per payment)
create or replace function register_paid_event(p_member uuid, p_event uuid, p_payment text, p_cents int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.event_paid', '1', true);
  insert into event_rsvps (event_id, user_id, paid_cents, payment_id) values (p_event, p_member, p_cents, p_payment)
    on conflict (event_id, user_id) do nothing;
  perform set_config('app.event_paid', '', true);
end $$;
revoke execute on function register_paid_event(uuid, uuid, text, int) from public, anon, authenticated;

-- how many are going (people can't read others' registrations)
create or replace function event_going(p_ids uuid[]) returns table (event_id uuid, going int)
language sql stable security definer set search_path = public as $$
  select i.id, (select count(*)::int from event_rsvps r where r.event_id = i.id) from unnest(p_ids) as i(id)
$$;
revoke execute on function event_going(uuid[]) from public;
grant execute on function event_going(uuid[]) to anon, authenticated;

-- the meeting link, for the host and the people who registered only
create or replace function event_link(p_event uuid) returns text
language sql stable security definer set search_path = public as $$
  select p.meeting_link from hub_event_private p join hub_events e on e.id = p.event_id
  where p.event_id = p_event and (e.host_id = auth.uid() or is_staff() or exists (select 1 from event_rsvps r where r.event_id = p_event and r.user_id = auth.uid()))
$$;
revoke execute on function event_link(uuid) from public, anon;
grant execute on function event_link(uuid) to authenticated;

-- ---------- reminders in the bell (hourly) ----------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission', 'sale_enquiry', 'deadline', 'match_booked', 'advisor_booking', 'advisor_cancel', 'lead', 'event'));

create or replace function event_reminders_due() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select e.id, e.slug, e.title, e.starts_at, coalesce(e.host_id, w.user_id) as actor, w.user_id,
           coalesce(m.week, false) as wk, coalesce(m.day, true) as dy, coalesce(m.hour, true) as hr
    from hub_events e
    join event_saves w on w.event_id = e.id
    left join event_reminders m on m.event_id = e.id and m.user_id = w.user_id
    left join member_settings s on s.member_id = w.user_id
    where e.status = 'published' and e.cancelled_at is null and e.starts_at > now() and e.starts_at < now() + interval '8 days'
      and coalesce(s.alert_events, true)
  loop
    if r.hr and r.starts_at <= now() + interval '1 hour' then
      insert into event_reminders_sent (event_id, user_id, kind) values (r.id, r.user_id, 'hour') on conflict do nothing;
      if found then insert into notifications (user_id, actor_id, type, href, note) values (r.user_id, r.actor, 'event', '/events/' || r.slug, left('Starting within the hour: ' || r.title, 200)); n := n + 1; end if;
    elsif r.dy and r.starts_at <= now() + interval '1 day' and r.starts_at > now() + interval '1 hour' then
      insert into event_reminders_sent (event_id, user_id, kind) values (r.id, r.user_id, 'day') on conflict do nothing;
      if found then insert into notifications (user_id, actor_id, type, href, note) values (r.user_id, r.actor, 'event', '/events/' || r.slug, left('Tomorrow: ' || r.title, 200)); n := n + 1; end if;
    elsif r.wk and r.starts_at <= now() + interval '7 days' and r.starts_at > now() + interval '1 day' then
      insert into event_reminders_sent (event_id, user_id, kind) values (r.id, r.user_id, 'week') on conflict do nothing;
      if found then insert into notifications (user_id, actor_id, type, href, note) values (r.user_id, r.actor, 'event', '/events/' || r.slug, left('Next week: ' || r.title, 200)); n := n + 1; end if;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function event_reminders_due() from public, anon, authenticated;

-- "Tell me the date": when a date is set, everyone who saved the event hears about it (once)
create or replace function hub_events_dated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.starts_at is null and new.starts_at is not null and new.status = 'published' then
    insert into notifications (user_id, actor_id, type, href, note)
      select w.user_id, coalesce(new.host_id, w.user_id), 'event', '/events/' || new.slug, left('Date announced: ' || new.title, 200)
      from event_saves w where w.event_id = new.id;
    insert into event_reminders_sent (event_id, user_id, kind) select new.id, w.user_id, 'date' from event_saves w where w.event_id = new.id on conflict do nothing;
  end if;
  -- a cancelled event: tell everyone who registered or saved it
  if old.cancelled_at is null and new.cancelled_at is not null then
    insert into notifications (user_id, actor_id, type, href, note)
      select w.user_id, coalesce(new.host_id, w.user_id), 'event', '/events/' || new.slug, left('Cancelled: ' || new.title, 200)
      from event_saves w where w.event_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function hub_events_dated() from public, anon, authenticated;
drop trigger if exists hub_events_dated on hub_events;
create trigger hub_events_dated after update of starts_at, cancelled_at on hub_events for each row execute function hub_events_dated();

do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('event-reminders', '*/10 * * * *', 'select public.event_reminders_due()');
  end if;
exception when others then
  raise notice 'pg_cron not set up: %', sqlerrm;
end $$;

-- ---------- the existing events, filled in; the second CanadianSME flagship ----------
update hub_events set description = 'Meet the SME Hub team and the first members. We show what is coming in 2027 and answer your questions live.',
  host_kind = 'hub', type = 'Live Q&A', topic = 'Community', fmt = 'online', ends_at = '2027-01-12 18:00+00', tz = 'ET', price = 0, cap = 500, img = 'bars',
  agenda = array['What SME Hub is for', 'What is coming in 2027', 'Open questions']
  where slug = 'welcome';
update hub_events set description = 'Bring one question about wholesale pricing, sell sheets or buyer meetings.',
  host_kind = 'hub', type = 'Live Q&A', topic = 'Selling and export', fmt = 'online', ends_at = '2027-01-13 17:45+00', tz = 'ET', price = 0, cap = 150, img = 'bakery',
  series = 'Every Wednesday', agenda = array['How to land a first wholesale account', 'Your questions']
  where slug = 'expert1';
update hub_events set description = 'CanadianSME’s yearly show for small business owners: talks, exhibitors and networking. Members get early access and a discount. Save it to hear first when the date is announced.',
  host_kind = 'csme', type = 'Conference', topic = 'Community', fmt = 'inperson', price = null, cap = null, img = 'awning', flagship = true
  where slug = 'show';
insert into hub_events (slug, title, when_label, starts_at, location, note, position, description, host_kind, type, topic, fmt, price, img, flagship)
values ('summit', 'Small Business Summit 2027', 'Date to be announced', null, 'In person', 'CanadianSME’s autumn summit.', 4,
  'CanadianSME’s autumn summit with speakers from across Canada. Save it to hear first when the date is announced.', 'csme', 'Conference', 'Community', 'inperson', null, 'bars', false)
on conflict (slug) do nothing;
