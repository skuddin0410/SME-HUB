-- What the SMB Advisors page shows beyond the profile: field, experience, rating, services.
-- The team fills these in when it gives a member the Advisor plan; members can read them.
create table advisor_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  field text not null default '',
  years int not null default 0 check (years >= 0),
  helped int not null default 0 check (helped >= 0),
  rating numeric(2,1) check (rating between 0 and 5),
  reply text not null default '',
  langs text not null default '',
  about text not null default '',
  creds text[] not null default '{}',
  services jsonb not null default '[]',   -- [{ "name": "...", "text": "..." }]
  updated_at timestamptz not null default now()
);
alter table advisor_profiles enable row level security;
create policy advisor_profiles_read on advisor_profiles for select using (true);
create policy advisor_profiles_staff on advisor_profiles for all using (is_staff()) with check (is_staff());
grant select on advisor_profiles to anon, authenticated;
grant insert, update, delete on advisor_profiles to authenticated;
