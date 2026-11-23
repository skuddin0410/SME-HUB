-- Hub events: the live sessions and CanadianSME events shown on the Events page, with seat saving.
create table hub_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 1 and 200),
  when_label text not null default '',           -- shown as written, for example "Date to be announced"
  starts_at timestamptz,                         -- null while the date is not set
  location text not null default '',
  note text not null default '',
  status text not null default 'published' check (status in ('draft', 'published')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table event_rsvps (
  event_id uuid not null references hub_events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table hub_events enable row level security;
alter table event_rsvps enable row level security;
create policy hub_events_read on hub_events for select using (status = 'published' or is_staff());
create policy hub_events_staff on hub_events for all using (is_staff()) with check (is_staff());
create policy event_rsvps_own_read on event_rsvps for select to authenticated using (user_id = auth.uid() or is_staff());
create policy event_rsvps_own_add on event_rsvps for insert to authenticated with check (user_id = auth.uid());
create policy event_rsvps_own_remove on event_rsvps for delete to authenticated using (user_id = auth.uid());
grant select on hub_events to anon, authenticated;
grant insert, update, delete on hub_events to authenticated;
revoke all on event_rsvps from anon;
grant select, insert, delete on event_rsvps to authenticated;

insert into hub_events (slug, title, when_label, starts_at, location, note, position) values
  ('welcome', 'Founding members welcome call', 'Tue, Jan 12, 2027 · 12:00 pm ET', '2027-01-12 17:00+00', 'Online', 'Meet the team and the first members.', 1),
  ('expert1', 'Ask an expert: landing your first wholesale account', 'Wed, Jan 13, 2027 · 12:00 pm ET', '2027-01-13 17:00+00', 'Online · with Priya Raman', 'Bring one question. Sessions run every Wednesday.', 2),
  ('show', 'Small Business Show 2027', 'Date to be announced', null, 'In person', 'Members get early access and a discount.', 3);
