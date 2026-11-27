-- Update 36: Zoom for SME Advisors, and free consultations.
--   1. An SME Advisor connects their own Zoom once (and, if they want, Google Calendar busy times).
--   2. Online events they host can run on that Zoom: a meeting per event, a personal join link per person,
--      a green room before and a wrap-up after.
--   3. Members book a free consultation from the Advisor's profile. Each booking gets its own Zoom meeting and
--      both people get an email with the link and a calendar invite.
-- Tokens are encrypted by the server before they are stored, and no member (not even the Advisor) can read them:
-- only the server, with the service key, uses them. Bookings are written by the server too, so the busy times in
-- the Advisor's Google Calendar are always checked before a time is taken.

-- ---------- connected apps (server only) ----------
create table if not exists advisor_zoom (
  user_id uuid primary key references profiles (id) on delete cascade,
  zoom_user_id text not null check (char_length(zoom_user_id) <= 64),
  email text not null check (char_length(email) <= 254),
  account_type int not null default 1,          -- Zoom: 1 Basic (40-minute limit), 2 Licensed, 3+ other paid
  refresh_enc text not null,
  access_enc text,
  access_expires timestamptz,
  lease_until timestamptz,                      -- one server refreshes the token at a time
  connected_at timestamptz not null default now()
);
alter table advisor_zoom enable row level security;
revoke all on advisor_zoom from anon, authenticated;

create table if not exists advisor_gcal (
  user_id uuid primary key references profiles (id) on delete cascade,
  email text not null default '' check (char_length(email) <= 254),
  refresh_enc text not null,
  connected_at timestamptz not null default now()
);
alter table advisor_gcal enable row level security;
revoke all on advisor_gcal from anon, authenticated;

-- what the Advisor sees in Settings: connected or not, and as whom (never the tokens)
create or replace function my_apps() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'zoom', (select jsonb_build_object('email', z.email, 'type', z.account_type) from advisor_zoom z where z.user_id = auth.uid()),
    'gcal', (select jsonb_build_object('email', g.email) from advisor_gcal g where g.user_id = auth.uid()))
$$;
revoke execute on function my_apps() from public, anon;
grant execute on function my_apps() to authenticated;

-- ---------- free consultation settings (the Advisor's own) ----------
create or replace function consult_hours_ok(h jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(h) = 'object'
    and (select count(*) from jsonb_object_keys(h) k where k in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')) = 7
    and (select count(*) from jsonb_object_keys(h)) = 7
    and not exists (
      select 1 from jsonb_each(h) d
      where jsonb_typeof(d.value) <> 'object' or jsonb_typeof(d.value -> 'am') <> 'boolean' or jsonb_typeof(d.value -> 'pm') <> 'boolean')
$$;

create table if not exists consult_settings (
  advisor_id uuid primary key references profiles (id) on delete cascade,
  len int not null default 30 check (len in (15, 30, 45)),
  gap int not null default 15 check (gap in (0, 15, 30)),
  max_day int not null default 3 check (max_day in (0, 2, 3, 5)),          -- 0 = no limit
  ahead int not null default 30 check (ahead in (14, 30, 60)),             -- days
  notice int not null default 12 check (notice in (4, 12, 24)),            -- hours
  hours jsonb not null default '{"mon":{"am":true,"pm":false},"tue":{"am":true,"pm":true},"wed":{"am":false,"pm":false},"thu":{"am":false,"pm":true},"fri":{"am":true,"pm":false},"sat":{"am":false,"pm":false},"sun":{"am":false,"pm":false}}'
    check (consult_hours_ok(hours)),
  q_biz boolean not null default true,     -- required?
  q_topic boolean not null default true,
  q_web boolean not null default false,
  reg_mail text not null default 'each' check (reg_mail in ('each', 'daily')),
  gcal boolean not null default false,
  tz text not null default 'America/Toronto' check (tz = 'America/Toronto'),
  updated_at timestamptz not null default now()
);
alter table consult_settings enable row level security;
drop policy if exists "own consult settings" on consult_settings;
create policy "own consult settings" on consult_settings for all to authenticated
  using (advisor_id = auth.uid()) with check (advisor_id = auth.uid() and can_host_events(auth.uid()));
revoke all on consult_settings from anon, authenticated;
grant select, insert, update on consult_settings to authenticated;

-- ---------- bookings ----------
create table if not exists consult_bookings (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references profiles (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  starts_at timestamptz not null,
  minutes int not null check (minutes in (15, 30, 45)),
  biz text not null default '' check (char_length(biz) <= 160),
  topic text not null default '' check (char_length(topic) <= 600),
  web text not null default '' check (web = '' or (char_length(web) <= 200 and web ~ '^https?://[^\s<>"]+$')),
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  seq int not null default 0,                    -- calendar invite sequence: +1 on every move
  meeting_id text,
  join_url text,
  cancelled_by uuid references profiles (id) on delete set null,
  cancelled_at timestamptz,
  reminded_day timestamptz,
  reminded_hour timestamptz,
  created_at timestamptz not null default now(),
  check (advisor_id <> member_id)
);
-- one booking per Advisor per start time
create unique index if not exists consult_bookings_slot on consult_bookings (advisor_id, starts_at) where status = 'booked';
create index if not exists consult_bookings_member on consult_bookings (member_id, starts_at) where status = 'booked';
create index if not exists consult_bookings_due on consult_bookings (starts_at) where status = 'booked';
alter table consult_bookings enable row level security;
drop policy if exists "both people see the booking" on consult_bookings;
create policy "both people see the booking" on consult_bookings for select to authenticated
  using (advisor_id = auth.uid() or member_id = auth.uid() or is_staff());
revoke all on consult_bookings from anon, authenticated;
grant select on consult_bookings to authenticated;

-- a time is held for 5 minutes while a member fills in the short form
create table if not exists consult_holds (
  advisor_id uuid not null references profiles (id) on delete cascade,
  starts_at timestamptz not null,
  member_id uuid not null references profiles (id) on delete cascade,
  expires_at timestamptz not null,
  primary key (advisor_id, starts_at)
);
alter table consult_holds enable row level security;
revoke all on consult_holds from anon, authenticated;

-- is this Advisor taking bookings? (an SME Advisor with Zoom connected and at least one block open)
create or replace function consult_open(p_advisor uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_host_events(p_advisor)
    and exists (select 1 from advisor_zoom z where z.user_id = p_advisor)
    and exists (select 1 from consult_settings s, jsonb_each(s.hours) d where s.advisor_id = p_advisor and ((d.value ->> 'am')::boolean or (d.value ->> 'pm')::boolean))
$$;
revoke execute on function consult_open(uuid) from public;
grant execute on function consult_open(uuid) to anon, authenticated;

-- what the booking calendar needs: the Advisor's rules and the times already taken (no names, no questions)
create or replace function consult_public(p_advisor uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not consult_open(p_advisor) then jsonb_build_object('open', false) else jsonb_build_object(
    'open', true,
    'len', s.len, 'gap', s.gap, 'max_day', s.max_day, 'ahead', s.ahead, 'notice', s.notice, 'hours', s.hours, 'tz', s.tz,
    'q_biz', s.q_biz, 'q_topic', s.q_topic, 'q_web', s.q_web,
    'taken', coalesce((select jsonb_agg(jsonb_build_array(b.starts_at, b.minutes) order by b.starts_at) from consult_bookings b
                       where b.advisor_id = p_advisor and b.status = 'booked' and b.starts_at > now() - interval '1 day'), '[]'::jsonb),
    'held', coalesce((select jsonb_agg(h.starts_at) from consult_holds h
                      where h.advisor_id = p_advisor and h.expires_at > now() and h.member_id is distinct from auth.uid()), '[]'::jsonb)
  ) end
  from consult_settings s where s.advisor_id = p_advisor
$$;
revoke execute on function consult_public(uuid) from public;
grant execute on function consult_public(uuid) to anon, authenticated;

-- the rules every booking must meet (Google Calendar busy times are checked by the server before this runs)
create or replace function consult_check(p_advisor uuid, p_member uuid, p_start timestamptz, p_ignore uuid) returns consult_settings
language plpgsql stable security definer set search_path = public as $$
declare s consult_settings; loc timestamp; m int; dk text; blk_start int; blk_end int; ok boolean := false;
begin
  if p_member is null or p_advisor is null or p_member = p_advisor then raise exception 'consult: you can’t book yourself'; end if;
  if not consult_open(p_advisor) then raise exception 'consult: this Advisor isn’t taking bookings right now'; end if;
  if not exists (select 1 from profiles where id = p_member and status = 'active') then raise exception 'consult: sign in to book a call'; end if;
  if blocked_between(p_member, p_advisor) then raise exception 'consult: that time is no longer available'; end if;
  select * into s from consult_settings where advisor_id = p_advisor;
  if p_start < now() + make_interval(hours => s.notice) then raise exception 'consult: that time is too soon. Pick a later one'; end if;
  if p_start > now() + make_interval(days => s.ahead) then raise exception 'consult: that time is too far ahead'; end if;
  loc := p_start at time zone s.tz;
  m := extract(hour from loc)::int * 60 + extract(minute from loc)::int;
  if extract(second from loc) <> 0 then raise exception 'consult: that time is no longer available'; end if;
  dk := (array['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])[extract(dow from loc)::int + 1];
  foreach blk_start in array array[540, 780] loop
    blk_end := case when blk_start = 540 then 720 else 1020 end;
    if ((s.hours -> dk ->> case when blk_start = 540 then 'am' else 'pm' end)::boolean)
       and m >= blk_start and m + s.len <= blk_end and (m - blk_start) % (s.len + s.gap) = 0 then ok := true; end if;
  end loop;
  if not ok then raise exception 'consult: that time is no longer available'; end if;
  if exists (select 1 from consult_bookings b where b.advisor_id = p_advisor and b.status = 'booked' and b.id is distinct from p_ignore
             and b.starts_at < p_start + make_interval(mins => s.len + s.gap)
             and b.starts_at + make_interval(mins => b.minutes + s.gap) > p_start) then
    raise exception 'consult: someone just booked that time. Pick another';
  end if;
  if s.max_day > 0 and (select count(*) from consult_bookings b where b.advisor_id = p_advisor and b.status = 'booked' and b.id is distinct from p_ignore
                        and (b.starts_at at time zone s.tz)::date = loc::date) >= s.max_day then
    raise exception 'consult: that day is full. Pick another day';
  end if;
  if exists (select 1 from consult_holds h where h.advisor_id = p_advisor and h.starts_at = p_start and h.expires_at > now() and h.member_id <> p_member) then
    raise exception 'consult: someone is booking that time right now. Pick another, or try again in 5 minutes';
  end if;
  return s;
end $$;
revoke execute on function consult_check(uuid, uuid, timestamptz, uuid) from public, anon, authenticated;

-- "Next": hold the time for 5 minutes
create or replace function consult_hold(p_member uuid, p_advisor uuid, p_start timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from consult_holds where expires_at < now() or (member_id = p_member and advisor_id = p_advisor);
  perform consult_check(p_advisor, p_member, p_start, null);
  insert into consult_holds (advisor_id, starts_at, member_id, expires_at) values (p_advisor, p_start, p_member, now() + interval '5 minutes')
    on conflict (advisor_id, starts_at) do update set member_id = excluded.member_id, expires_at = excluded.expires_at
    where consult_holds.expires_at < now() or consult_holds.member_id = excluded.member_id;
end $$;
revoke execute on function consult_hold(uuid, uuid, timestamptz) from public, anon, authenticated;

-- "Book my free call" (or, with p_move, a new time for an existing booking)
create or replace function consult_book(p_member uuid, p_advisor uuid, p_start timestamptz, p_biz text, p_topic text, p_web text, p_move uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare s consult_settings; v_id uuid; v_old consult_bookings; v_name text; v_when text;
begin
  if p_move is not null then
    select * into v_old from consult_bookings where id = p_move and status = 'booked' for update;
    if v_old.id is null or (p_member <> v_old.member_id and p_member <> v_old.advisor_id) then raise exception 'consult: no booking to move'; end if;
    s := consult_check(v_old.advisor_id, v_old.member_id, p_start, v_old.id);
    update consult_bookings set starts_at = p_start, seq = seq + 1, reminded_day = null, reminded_hour = null where id = v_old.id;
    delete from consult_holds where advisor_id = v_old.advisor_id and starts_at = p_start;
    return v_old.id;
  end if;
  s := consult_check(p_advisor, p_member, p_start, null);
  if s.q_biz and btrim(coalesce(p_biz, '')) = '' then raise exception 'consult: add your business'; end if;
  if s.q_topic and btrim(coalesce(p_topic, '')) = '' then raise exception 'consult: Write a sentence about what you would like to talk about.'; end if;
  if s.q_web and btrim(coalesce(p_web, '')) = '' then raise exception 'consult: add your website'; end if;
  if exists (select 1 from consult_bookings where member_id = p_member and advisor_id = p_advisor and status = 'booked' and starts_at > now()) then
    raise exception 'consult: you already have a free call booked with this Advisor';
  end if;
  if (select count(*) from consult_bookings where member_id = p_member and status = 'booked' and starts_at > now()) >= 3 then
    raise exception 'consult: you can have up to 3 upcoming free calls';
  end if;
  insert into consult_bookings (advisor_id, member_id, starts_at, minutes, biz, topic, web)
  values (p_advisor, p_member, p_start, s.len, left(btrim(coalesce(p_biz, '')), 160), left(btrim(coalesce(p_topic, '')), 600), left(btrim(coalesce(p_web, '')), 200))
  returning id into v_id;
  delete from consult_holds where advisor_id = p_advisor and starts_at = p_start;
  v_when := to_char(p_start at time zone s.tz, 'Dy, Mon FMDD · FMHH12:MI am') || ' ET';
  select split_part(coalesce(full_name, 'Someone'), ' ', 1) into v_name from profiles where id = p_member;
  insert into notifications (user_id, actor_id, type, href, note) values (p_advisor, p_member, 'consult', '/settings/consultations', left('Free consultation booked: ' || v_when, 200));
  -- the member goes into the Advisor's My leads (Update 30)
  perform lead_upsert(p_advisor, p_member, null, null, 'consult', nullif(left(btrim(coalesce(p_topic, '')), 160), ''), coalesce(v_name, 'Someone') || ' booked a free consultation for ' || v_when);
  return v_id;
end $$;
revoke execute on function consult_book(uuid, uuid, timestamptz, text, text, text, uuid) from public, anon, authenticated;

create or replace function consult_cancel(p_by uuid, p_id uuid) returns consult_bookings
language plpgsql security definer set search_path = public as $$
declare b consult_bookings;
begin
  select * into b from consult_bookings where id = p_id and status = 'booked' for update;
  if b.id is null or (p_by <> b.member_id and p_by <> b.advisor_id) then raise exception 'consult: no booking to cancel'; end if;
  if b.starts_at + make_interval(mins => b.minutes) < now() then raise exception 'consult: this call has already happened'; end if;
  update consult_bookings set status = 'cancelled', cancelled_by = p_by, cancelled_at = now(), seq = seq + 1 where id = p_id returning * into b;
  insert into notifications (user_id, actor_id, type, href, note)
  values (case when p_by = b.member_id then b.advisor_id else b.member_id end, p_by, 'consult',
          case when p_by = b.member_id then '/settings/consultations' else '/members/' || b.advisor_id::text end,
          left('Free consultation cancelled: ' || to_char(b.starts_at at time zone 'America/Toronto', 'Dy, Mon FMDD · FMHH12:MI am') || ' ET', 200));
  return b;
end $$;
revoke execute on function consult_cancel(uuid, uuid) from public, anon, authenticated;

-- "What members say": a member who had a free consultation can review the Advisor too (as with intro calls)
drop policy if exists "review an advisor" on advisor_reviews;
create policy "review an advisor" on advisor_reviews for insert to authenticated
  with check (member_id = auth.uid() and (
    exists (select 1 from advisor_slots s where s.advisor_id = advisor_reviews.advisor_id and s.booked_by = auth.uid() and s.starts_at < now())
    or exists (select 1 from consult_bookings b where b.advisor_id = advisor_reviews.advisor_id and b.member_id = auth.uid() and b.status = 'booked' and b.starts_at < now())));

-- ---------- My leads: two new sources ----------
alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check check (source in ('message', 'page', 'quote', 'request', 'consult', 'event'));

-- A message the Hub sends for a booking (from the Advisor to the member) is not a reply to a lead
create or replace function public.lead_from_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text; v_lead leads;
begin
  if current_setting('app.system_message', true) = '1' then return null; end if;
  perform set_config('app.lead_system', '1', true);
  begin
    select * into v_lead from leads where owner_id = new.sender_id and contact_id = new.recipient_id;
    if found then
      if v_lead.replied_at is null then
        update leads set replied_at = now() where id = v_lead.id;
        insert into lead_events (lead_id, body) values (v_lead.id, 'You replied on SME Hub');
      end if;
      return null;
    end if;
    if exists (select 1 from leads where owner_id = new.recipient_id and contact_id = new.sender_id) then
      update leads set last_contact_at = now() where owner_id = new.recipient_id and contact_id = new.sender_id;
      return null;
    end if;
    if not exists (select 1 from companies where owner_id = new.recipient_id) then return null; end if;
    if exists (select 1 from messages m where m.id <> new.id and ((m.sender_id = new.sender_id and m.recipient_id = new.recipient_id) or (m.sender_id = new.recipient_id and m.recipient_id = new.sender_id))) then
      return null;
    end if;
    select split_part(coalesce(full_name, 'Someone'), ' ', 1) into v_name from profiles where id = new.sender_id;
    perform lead_upsert(new.recipient_id, new.sender_id, null, null, 'message', new.body, coalesce(v_name, 'Someone') || ' sent you a message on SME Hub');
  exception when others then
    raise warning 'lead_from_message: %', sqlerrm;
  end;
  perform set_config('app.lead_system', '', true);
  return null;
end $$;

-- the booking note in the member's inbox, "from" the Advisor
create or replace function consult_message(p_from uuid, p_to uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.system_message', '1', true);
  begin
    insert into messages (sender_id, recipient_id, body) values (p_from, p_to, left(p_body, 4000));
  exception when others then
    raise warning 'consult_message: %', sqlerrm; -- a note must never stop a booking
  end;
  perform set_config('app.system_message', '', true);
end $$;
revoke execute on function consult_message(uuid, uuid, text) from public, anon, authenticated;

-- ---------- events on the host's Zoom ----------
alter table hub_events
  add column if not exists join_mode text not null default 'link' check (join_mode in ('link', 'zoom')),
  add column if not exists zoom_wr boolean not null default true,
  add column if not exists zoom_reg boolean not null default true,
  add column if not exists zoom_rec boolean not null default false;

alter table hub_event_private
  add column if not exists zoom_meeting_id text,
  add column if not exists zoom_status text not null default '' check (zoom_status in ('', 'ok', 'pending')),
  add column if not exists wrap jsonb;          -- after the event: attendance, minutes, recording (from Zoom, once)

-- each person's own join link (Zoom registrant link). Only they can read it.
create table if not exists event_join_links (
  event_id uuid not null references hub_events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  join_url text not null check (char_length(join_url) <= 600 and join_url ~ '^https://'),
  registrant_id text,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table event_join_links enable row level security;
drop policy if exists "own join link" on event_join_links;
create policy "own join link" on event_join_links for select to authenticated using (user_id = auth.uid());
revoke all on event_join_links from anon, authenticated;
grant select on event_join_links to authenticated;

-- "I'd like to talk to the host about this": after the event, people who registered tick it; they go into My leads
create table if not exists event_talk (
  event_id uuid not null references hub_events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table event_talk enable row level security;
drop policy if exists "own talk" on event_talk;
create policy "own talk" on event_talk for select to authenticated using (user_id = auth.uid() or exists (select 1 from hub_events e where e.id = event_id and e.host_id = auth.uid()));
drop policy if exists "ask to talk" on event_talk;
create policy "ask to talk" on event_talk for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from event_rsvps r where r.event_id = event_talk.event_id and r.user_id = auth.uid())
  and exists (select 1 from hub_events e where e.id = event_talk.event_id and e.host_id is not null and e.host_id <> auth.uid()
              and coalesce(e.ends_at, e.starts_at) < now() and e.cancelled_at is null));
revoke all on event_talk from anon, authenticated;
grant select, insert on event_talk to authenticated;

create or replace function event_talk_lead() returns trigger
language plpgsql security definer set search_path = public as $$
declare e hub_events; v_name text;
begin
  select * into e from hub_events where id = new.event_id;
  select split_part(coalesce(full_name, 'Someone'), ' ', 1) into v_name from profiles where id = new.user_id;
  perform lead_upsert(e.host_id, new.user_id, null, null, 'event', left('Event: ' || e.title, 160), coalesce(v_name, 'Someone') || ' asked to talk after ' || e.title);
  insert into notifications (user_id, actor_id, type, href, note) values (e.host_id, new.user_id, 'lead', '/leads', left('Asked to talk after ' || e.title, 200));
  return null;
end $$;
revoke execute on function event_talk_lead() from public, anon, authenticated;
drop trigger if exists event_talk_lead on event_talk;
create trigger event_talk_lead after insert on event_talk for each row execute function event_talk_lead();

-- the green room: who is registered (faces) and how many set a reminder, for the host only
create or replace function event_host_room(p_event uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not exists (select 1 from hub_events e where e.id = p_event and (e.host_id = auth.uid() or is_staff())) then null else jsonb_build_object(
    'registered', (select count(*) from event_rsvps r where r.event_id = p_event),
    'reminders', (select count(*) from event_rsvps r join event_reminders m on m.event_id = r.event_id and m.user_id = r.user_id
                  where r.event_id = p_event and (m.day or m.hour or m.week)) +
                 (select count(*) from event_rsvps r where r.event_id = p_event
                  and not exists (select 1 from event_reminders m where m.event_id = r.event_id and m.user_id = r.user_id)),
    'talk', (select count(*) from event_talk t where t.event_id = p_event),
    'faces', coalesce((select jsonb_agg(jsonb_build_object('name', p.full_name, 'avatar', p.avatar_url)) from (
        select p.full_name, p.avatar_url from event_rsvps r join profiles p on p.id = r.user_id where r.event_id = p_event order by r.created_at limit 4) p), '[]'::jsonb))
  end
$$;
revoke execute on function event_host_room(uuid) from public, anon;
grant execute on function event_host_room(uuid) to authenticated;

-- emails already sent for events and calls (so each goes once), and the host's daily summary
create table if not exists mail_sent (
  key text primary key check (char_length(key) <= 200),
  sent_at timestamptz not null default now()
);
alter table mail_sent enable row level security;
revoke all on mail_sent from anon, authenticated;

-- ---------- notifications ----------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission', 'sale_enquiry', 'deadline', 'match_booked', 'advisor_booking', 'advisor_cancel', 'lead', 'event', 'consult'));

-- ---------- the event and consultation emails run every 10 minutes ----------
-- The server address and its CRON_SECRET live in this table (only the database reads it), so moving from
-- test.smehub.ca to smehub.ca is a row change:  insert into cron_targets values ('https://test.smehub.ca/api/cron/events', '<CRON_SECRET>');
create table if not exists cron_targets (
  url text primary key check (url ~ '^https://[a-z0-9.-]+/api/cron/[a-z-]+$'),
  secret text not null check (char_length(secret) >= 16)
);
alter table cron_targets enable row level security;
revoke all on cron_targets from anon, authenticated;

create or replace function cron_targets_ping() returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  for t in select url, secret from cron_targets loop
    perform net.http_get(url := t.url, headers := jsonb_build_object('Authorization', 'Bearer ' || t.secret), timeout_milliseconds := 25000);
  end loop;
end $$;
revoke all on function cron_targets_ping() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
    perform cron.schedule('cron-targets', '*/10 * * * *', 'select public.cron_targets_ping()');
  end if;
exception when others then
  raise notice 'cron-targets not scheduled: %', sqlerrm;
end $$;
