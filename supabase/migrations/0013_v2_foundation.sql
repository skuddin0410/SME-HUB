-- V2 foundation (Phase 0): team roles in their own table, plans and their limits, the Founding
-- Member badge, one permission function, a test clock and a flag for sample data.
-- Additive only: existing columns stay, so the main branch keeps working on the same database.

-- ---------- team roles ----------
-- The source of truth for who is staff. profiles.role is kept as a mirror (admin / member) because
-- the existing CMS reads and writes it; triggers below keep the two in step in both directions.
create table team_roles (
  user_id uuid primary key references profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  granted_by uuid references profiles (id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table team_roles enable row level security;

insert into team_roles (user_id, role) select id, 'admin' from profiles where role = 'admin'
  on conflict (user_id) do nothing;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_roles where user_id = auth.uid());
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_roles where user_id = auth.uid() and role = 'admin');
$$;

create policy "team roles readable by staff" on team_roles for select to authenticated using (is_staff() or user_id = auth.uid());
create policy "team roles managed by admins" on team_roles for all to authenticated
  using (is_admin()) with check (is_admin() and user_id <> auth.uid());

-- profiles.role changed (old CMS path) -> team_roles
create function sync_role_to_team() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'admin' then
    insert into team_roles (user_id, role, granted_by) values (new.id, 'admin', auth.uid())
      on conflict (user_id) do update set role = 'admin' where team_roles.role <> 'admin';
  elsif tg_op = 'UPDATE' and old.role = 'admin' then
    delete from team_roles where user_id = new.id and role = 'admin';
  end if;
  return null;
end $$;
create trigger sync_role_to_team after insert or update of role on profiles
  for each row execute function sync_role_to_team();

-- team_roles changed -> profiles.role mirror (moderators show as members there)
create function sync_team_to_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := coalesce(new.user_id, old.user_id);
        want text := case when tg_op <> 'DELETE' and new.role = 'admin' then 'admin' else 'member' end;
begin
  update profiles set role = want where id = uid and role <> want;
  return null;
end $$;
create trigger sync_team_to_role after insert or update or delete on team_roles
  for each row execute function sync_team_to_role();

-- ---------- plans ----------
alter table profiles add column if not exists plan text not null default 'free'
  check (plan in ('free', 'plus', 'advisor'));
alter table profiles add column if not exists founding_number int unique;
alter table profiles add column if not exists is_sample boolean not null default false;
update profiles set plan = case member_type when 'plus' then 'plus' when 'elite' then 'plus' when 'advisor' then 'advisor' else 'free' end
  where plan = 'free';

-- what each plan may do; null means no limit. The Plans page comparison table is the source.
create table plan_limits (
  plan text not null check (plan in ('free', 'plus', 'advisor')),
  key text not null,
  value int,
  primary key (plan, key)
);
alter table plan_limits enable row level security;
create policy "plan limits are public" on plan_limits for select to anon, authenticated using (true);
insert into plan_limits (plan, key, value) values
  ('free', 'offers_per_month', 0),      ('plus', 'offers_per_month', 2),      ('advisor', 'offers_per_month', 4),
  ('free', 'private_groups', 0),        ('plus', 'private_groups', 1),        ('advisor', 'private_groups', 3),
  ('free', 'ai_per_month', 10),         ('plus', 'ai_per_month', 100),        ('advisor', 'ai_per_month', 100),
  ('free', 'viewer_names', 2),          ('plus', 'viewer_names', null),       ('advisor', 'viewer_names', null),
  ('free', 'daily_matches', 3),         ('plus', 'daily_matches', 5),         ('advisor', 'daily_matches', 5),
  ('free', 'blog_needs_review', 1),     ('plus', 'blog_needs_review', 0),     ('advisor', 'blog_needs_review', 0);

-- ---------- Founding Member badge: first 500, never two people with the same number ----------
create table founding_counter (
  id boolean primary key default true check (id),
  issued int not null default 0,
  cap int not null default 500
);
alter table founding_counter enable row level security;
insert into founding_counter default values;

create function claim_founding_number(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if exists (select 1 from profiles where id = p_user and (founding_number is not null or is_sample)) then
    return (select founding_number from profiles where id = p_user);
  end if;
  update founding_counter set issued = issued + 1 where id and issued < cap returning issued into n;
  if n is not null then
    update profiles set founding_number = n where id = p_user;
  end if;
  return n;
end $$;

-- existing real members first, oldest first
do $$
declare r record;
begin
  for r in select id from profiles where not is_sample and founding_number is null order by created_at, id loop
    perform claim_founding_number(r.id);
  end loop;
end $$;

-- sample accounts (seeded with app metadata sample = true) are flagged and never take a number
create function give_founding_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from auth.users where id = new.id and raw_app_meta_data ->> 'sample' = 'true') then
    update profiles set is_sample = true where id = new.id;
  else
    perform claim_founding_number(new.id);
  end if;
  return null;
end $$;
create trigger give_founding_number after insert on profiles
  for each row execute function give_founding_number();

-- members cannot change their own plan, founding number, sample flag, role or status
create or replace function protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not is_staff() then
      new.member_type := old.member_type;
      new.status := old.status;
    end if;
    if not is_admin() then
      new.role := old.role;
      new.plan := old.plan;
    end if;
    new.founding_number := old.founding_number;
    new.is_sample := old.is_sample;
  end if;
  return new;
end $$;

-- ---------- test clock ----------
-- Tests move time forward with: set app.now = '2026-01-02 10:00+00'. Only a direct database
-- session (not the website's connection) can do that, so members cannot change the clock.
create function app_now() returns timestamptz
language sql stable set search_path = public as $$
  select case
    when session_user not in ('authenticator', 'anon', 'authenticated') and nullif(current_setting('app.now', true), '') is not null
      then current_setting('app.now', true)::timestamptz
    else now()
  end;
$$;

-- ---------- one permission function ----------
-- limit_for: a member's limit for a key (null = no limit, 0 = not allowed).
create function limit_for(p_user uuid, p_key text) returns int
language sql stable security definer set search_path = public as $$
  select l.value from profiles p join plan_limits l on l.plan = p.plan and l.key = p_key where p.id = p_user;
$$;

-- can(action, used): may the signed-in member do this? `used` is how many they have already used
-- this period, for actions with a plan limit. New actions are added here as each phase lands.
create function can(p_action text, p_used int default 0) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); lim int;
begin
  if uid is null then return false; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then return false; end if;
  case p_action
    when 'cms.access' then return is_staff();
    when 'cms.admin', 'roles.manage', 'settings.manage' then return is_admin();
    when 'post.offer' then lim := limit_for(uid, 'offers_per_month');
    when 'group.private' then lim := limit_for(uid, 'private_groups');
    when 'ai.ask' then lim := limit_for(uid, 'ai_per_month');
    else return false;
  end case;
  return lim is null or coalesce(p_used, 0) < lim;
end $$;

-- ---------- grants ----------
revoke execute on function sync_role_to_team(), sync_team_to_role(), give_founding_number(),
  claim_founding_number(uuid) from public, anon, authenticated;
revoke execute on function limit_for(uuid, text) from public, anon, authenticated;
revoke execute on function can(text, int) from public, anon;
grant execute on function can(text, int) to authenticated;
grant execute on function app_now() to anon, authenticated;
grant select on plan_limits to anon, authenticated;
grant select, insert, update, delete on team_roles to authenticated;
