-- Advisor booking (handoff: advSections). On an SMB Advisor's profile: the advisor band, "How <name> can help",
-- "Book a free 15-minute intro call" from the advisor's open times, "Next live session" with Save my seat, and
-- "What members say". Advisors (and the Hub team) set the times; a member books one; both are told in the app.

alter table advisor_profiles add column if not exists session_title text not null default '' check (char_length(session_title) <= 120);
alter table advisor_profiles add column if not exists session_at timestamptz;
alter table advisor_profiles add column if not exists active boolean not null default true;

-- an advisor edits their own advisor profile (the Hub team can edit anyone's, see 0033)
create policy advisor_profiles_own on advisor_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table advisor_slots (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references profiles (id) on delete cascade,
  starts_at timestamptz not null,
  minutes int not null default 15 check (minutes in (15, 20, 30)),
  booked_by uuid references profiles (id) on delete set null,
  booked_at timestamptz,
  question text not null default '' check (char_length(question) <= 500),
  created_at timestamptz not null default now(),
  unique (advisor_id, starts_at)
);
create index advisor_slots_open on advisor_slots (advisor_id, starts_at) where booked_by is null;
create index advisor_slots_booker on advisor_slots (booked_by) where booked_by is not null;
alter table advisor_slots enable row level security;

create function is_advisor(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from advisor_profiles a join profiles p on p.id = a.user_id where a.user_id = uid and a.active and p.status = 'active');
$$;

-- members see open future times; the advisor, the booker and the team see the booking
create policy "advisor slots read" on advisor_slots for select to anon, authenticated
  using ((booked_by is null and starts_at > now() and is_advisor(advisor_id)) or advisor_id = auth.uid() or booked_by = auth.uid() or is_staff());
create policy "advisor slots add" on advisor_slots for insert to authenticated
  with check ((advisor_id = auth.uid() and is_advisor(auth.uid())) or is_staff());
create policy "advisor slots remove" on advisor_slots for delete to authenticated
  using ((advisor_id = auth.uid() or is_staff()) and booked_by is null);
revoke all on advisor_slots from anon, authenticated;
grant select on advisor_slots to anon, authenticated;
grant insert (advisor_id, starts_at, minutes) on advisor_slots to authenticated;
grant delete on advisor_slots to authenticated;

create function advisor_slot_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.starts_at < now() + interval '1 hour' then raise exception 'advisors: pick a time at least an hour from now'; end if;
  if new.starts_at > now() + interval '120 days' then raise exception 'advisors: pick a time in the next 4 months'; end if;
  if (select count(*) from advisor_slots where advisor_id = new.advisor_id and starts_at > now()) >= 60 then raise exception 'advisors: up to 60 open times'; end if;
  return new;
end $$;
create trigger advisor_slot_rules before insert on advisor_slots for each row execute function advisor_slot_rules();

-- books an open time: one person per time, at most 3 upcoming calls each and one per advisor
create function advisor_book(p_slot uuid, p_question text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s advisor_slots;
begin
  if me is null or not is_active() then raise exception 'advisors: sign in to book a call'; end if;
  select * into s from advisor_slots where id = p_slot for update;
  if s.id is null or s.starts_at <= now() or not is_advisor(s.advisor_id) then raise exception 'advisors: that time is no longer available'; end if;
  if s.booked_by is not null then raise exception 'advisors: someone just booked that time. Pick another'; end if;
  if s.advisor_id = me then raise exception 'advisors: you cannot book yourself'; end if;
  if blocked_between(me, s.advisor_id) then raise exception 'advisors: that time is no longer available'; end if;
  if exists (select 1 from advisor_slots where booked_by = me and advisor_id = s.advisor_id and starts_at > now()) then raise exception 'advisors: you already have a call booked with this advisor'; end if;
  if (select count(*) from advisor_slots where booked_by = me and starts_at > now()) >= 3 then raise exception 'advisors: you can have up to 3 upcoming calls'; end if;
  update advisor_slots set booked_by = me, booked_at = now(), question = left(btrim(coalesce(p_question, '')), 500) where id = p_slot;
  insert into notifications (user_id, actor_id, type, href, note)
  values (s.advisor_id, me, 'advisor_booking', '/messages?with=' || me::text, to_char(s.starts_at at time zone 'America/Toronto', 'Dy, Mon FMDD · FMHH12:MI am') || ' ET');
end $$;

-- the booker or the advisor cancels; the time opens again and the other person is told
create function advisor_cancel(p_slot uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s advisor_slots;
begin
  select * into s from advisor_slots where id = p_slot for update;
  if s.id is null or s.booked_by is null or (me is distinct from s.booked_by and me is distinct from s.advisor_id and not is_staff()) then raise exception 'advisors: no booking to cancel'; end if;
  update advisor_slots set booked_by = null, booked_at = null, question = '' where id = p_slot;
  insert into notifications (user_id, actor_id, type, href, note)
  values (case when me = s.booked_by then s.advisor_id else s.booked_by end, coalesce(me, s.advisor_id), 'advisor_cancel', '/smb-advisor',
          to_char(s.starts_at at time zone 'America/Toronto', 'Dy, Mon FMDD · FMHH12:MI am') || ' ET');
end $$;

-- "Save my seat" for the advisor's next live session
create table advisor_seats (
  advisor_id uuid not null references profiles (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (advisor_id, member_id)
);
alter table advisor_seats enable row level security;
create policy "my seats" on advisor_seats for select to authenticated using (member_id = auth.uid() or advisor_id = auth.uid() or is_staff());
create policy "save a seat" on advisor_seats for insert to authenticated with check (member_id = auth.uid() and is_advisor(advisor_id));
create policy "give up a seat" on advisor_seats for delete to authenticated using (member_id = auth.uid());
revoke all on advisor_seats from anon, authenticated;
grant select, insert, delete on advisor_seats to authenticated;

-- "What members say": only someone who had a call with the advisor can review them, once
create table advisor_reviews (
  advisor_id uuid not null references profiles (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 10 and 600),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  primary key (advisor_id, member_id)
);
alter table advisor_reviews enable row level security;
create policy "advisor reviews read" on advisor_reviews for select to anon, authenticated using (status = 'published' or member_id = auth.uid() or is_staff());
create policy "review an advisor" on advisor_reviews for insert to authenticated
  with check (member_id = auth.uid() and exists (select 1 from advisor_slots s where s.advisor_id = advisor_reviews.advisor_id and s.booked_by = auth.uid() and s.starts_at < now()));
create policy "hide an advisor review" on advisor_reviews for update to authenticated using (is_staff());
revoke all on advisor_reviews from anon, authenticated;
grant select on advisor_reviews to anon, authenticated;
grant insert (advisor_id, member_id, rating, body) on advisor_reviews to authenticated;
grant update (status) on advisor_reviews to authenticated;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission', 'sale_enquiry', 'deadline', 'match_booked', 'advisor_booking', 'advisor_cancel'));
alter table notifications drop constraint if exists notifications_href_check;
alter table notifications add constraint notifications_href_check check (href is null or href ~ '^/[A-Za-z0-9/_?=&-]*$');

revoke execute on function advisor_slot_rules() from public, anon, authenticated;
revoke execute on function advisor_book(uuid, text), advisor_cancel(uuid) from public, anon;
grant execute on function advisor_book(uuid, text), advisor_cancel(uuid) to authenticated;
