-- Moderation: hidden posts, team settings, report categories, and the automatic limits
-- (hide after N reports, suspend after N blocks or reports).

alter table posts add column if not exists hidden_at timestamptz;

-- hidden posts are visible to the team and to their author only
drop policy if exists "posts readable" on posts;
create policy "posts readable" on posts for select using (
  is_staff()
  or author_id = auth.uid()
  or (
    status = 'published'
    and hidden_at is null
    and not has_blocked(author_id)
    and (group_id is null or not is_private_group(group_id) or is_group_member(group_id))
    and (
      visibility = 'public'
      or (visibility = 'members' and auth.uid() is not null)
      or (visibility = 'connections' and is_connected(author_id))
    )
  )
);


-- one row of settings
create table mod_settings (
  id boolean primary key default true check (id),
  types jsonb not null default '{
    "post":{"on":true,"auto":true,"hide":3},
    "comment":{"on":true,"auto":true,"hide":3},
    "photo":{"on":true,"auto":true,"hide":2},
    "group":{"on":true,"auto":false,"hide":5},
    "blog":{"on":true,"auto":true,"hide":3},
    "blogc":{"on":true,"auto":true,"hide":3}}'::jsonb,
  member_report boolean not null default true,
  blocking boolean not null default true,
  sus_blocks jsonb not null default '{"on":true,"n":5}',
  sus_reports jsonb not null default '{"on":true,"n":10}',
  email_on boolean not null default true,
  email_subject text not null default '[SMB Hub] {{user.name}} was suspended automatically',
  email_body text not null default E'{{user.name}} was suspended because they crossed a limit.\nReview the member in Moderation and lift the suspension if it was a mistake.',
  updated_at timestamptz not null default now()
);
insert into mod_settings default values;
alter table mod_settings enable row level security;
revoke all on mod_settings from anon;
create policy "team reads moderation settings" on mod_settings for select to authenticated using (is_staff());
create policy "team changes moderation settings" on mod_settings for update to authenticated using (is_staff()) with check (is_staff());

-- the reasons members pick when they report
create table report_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 200),
  show text not null default 'both' check (show in ('content', 'member', 'both')),
  position int not null default 0
);
insert into report_categories (name, description, show, position) values
  ('Spam or disguised advertising', 'Sales pitches posted as questions, wins or comments.', 'both', 1),
  ('Scam or fraud', 'Fake offers, requests for money or deposits.', 'both', 2),
  ('Harassment', 'Bullying, threats or repeated unwanted contact.', 'both', 3),
  ('Fake business or impersonation', 'Pretending to be a person or company they are not.', 'member', 4),
  ('Misinformation', 'Misleading or false information.', 'content', 5),
  ('Offensive', 'Abusive or derogatory content.', 'content', 6),
  ('Inappropriate', 'Content that does not belong in a business community.', 'content', 7),
  ('Other', 'Something else the team should look at.', 'both', 8);
alter table report_categories enable row level security;
create policy "anyone signed in reads report categories" on report_categories for select to authenticated using (true);
create policy "team manages report categories" on report_categories for all to authenticated using (is_staff()) with check (is_staff());

-- the automatic system may suspend a member even though the person who triggered it is not staff
create or replace function protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not is_staff() then
      new.member_type := old.member_type;
      if coalesce(current_setting('app.system', true), '') <> '1' then new.status := old.status; end if;
      if new.profile_type in ('advisor', 'team') then new.profile_type := old.profile_type; end if;
      if old.profile_type in ('advisor', 'team') then new.profile_type := old.profile_type; end if;
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

create function mod_after_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare s mod_settings; n int; t jsonb;
begin
  select * into s from mod_settings limit 1;
  if new.post_id is not null then
    t := s.types -> 'post';
    if (t ->> 'on')::boolean and (t ->> 'auto')::boolean then
      select count(*) into n from reports where post_id = new.post_id and status = 'open';
      if n >= (t ->> 'hide')::int then update posts set hidden_at = now() where id = new.post_id and hidden_at is null; end if;
    end if;
  end if;
  if new.profile_id is not null and (s.sus_reports ->> 'on')::boolean then
    select count(*) into n from reports where profile_id = new.profile_id and status = 'open';
    if n >= (s.sus_reports ->> 'n')::int then
      perform set_config('app.system', '1', true);
      update profiles set status = 'suspended' where id = new.profile_id and status = 'active';
      perform set_config('app.system', '', true);
    end if;
  end if;
  return null;
end $$;
create trigger mod_after_report after insert on reports for each row execute function mod_after_report();

create function mod_after_block() returns trigger
language plpgsql security definer set search_path = public as $$
declare s mod_settings; n int;
begin
  select * into s from mod_settings limit 1;
  if (s.sus_blocks ->> 'on')::boolean then
    select count(*) into n from blocks where blocked_id = new.blocked_id;
    if n >= (s.sus_blocks ->> 'n')::int then
      perform set_config('app.system', '1', true);
      update profiles set status = 'suspended' where id = new.blocked_id and status = 'active';
      perform set_config('app.system', '', true);
    end if;
  end if;
  return null;
end $$;
create trigger mod_after_block after insert on blocks for each row execute function mod_after_block();
