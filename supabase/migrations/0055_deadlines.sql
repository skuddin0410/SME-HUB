-- Update 13: My deadlines. Private to each member: their answers (which CRA dates apply), the deadlines they add,
-- what they marked done and how they want reminders. Never shown on the profile; nobody else can read it.

create table if not exists deadline_settings (
  user_id uuid primary key references profiles (id) on delete cascade,
  setup jsonb not null check (jsonb_typeof(setup) = 'object' and pg_column_size(setup) < 1000),
  done jsonb not null default '{}' check (jsonb_typeof(done) = 'object' and pg_column_size(done) < 20000),
  rem jsonb not null default '{"email":true,"bell":true,"d14":false,"d7":true,"d1":true,"weekly":true}' check (jsonb_typeof(rem) = 'object' and pg_column_size(rem) < 500),
  updated_at timestamptz not null default now()
);
create table if not exists deadline_custom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  due date not null,
  rep text not null default 'none' check (rep in ('none', 'month', 'quarter', 'year')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists deadline_custom_user on deadline_custom (user_id, due);

-- reminders already sent, so the daily job sends each one once
create table if not exists deadline_sent (
  user_id uuid not null references profiles (id) on delete cascade,
  key text not null,
  lead smallint not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key, lead)
);

alter table deadline_settings enable row level security;
alter table deadline_custom enable row level security;
alter table deadline_sent enable row level security;
create policy "own deadline settings" on deadline_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own deadlines" on deadline_custom for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- deadline_sent is written by the server's daily job only (service role); no member policies
revoke all on deadline_settings, deadline_custom, deadline_sent from anon, authenticated;
grant select, insert, update, delete on deadline_settings, deadline_custom to authenticated;

-- each member may keep up to 100 of their own deadlines
create or replace function deadline_custom_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from deadline_custom where user_id = new.user_id) >= 100 then raise exception 'you can keep up to 100 of your own deadlines'; end if;
  return new;
end $$;
create trigger deadline_custom_limit before insert on deadline_custom for each row execute function deadline_custom_limit();
revoke execute on function deadline_custom_limit() from public, anon, authenticated;

-- the bell: a "deadline" reminder links to My deadlines
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission', 'sale_enquiry', 'deadline'));
alter table notifications add column if not exists note text check (note is null or char_length(note) <= 200);

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on deadline_settings, deadline_custom, deadline_sent to service_role;
  end if;
end $$;
