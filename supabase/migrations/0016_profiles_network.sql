-- V2 Phase 2: profiles and network.
-- Profile details with per-field visibility, follows, one row per connection, two-way blocks,
-- recommendations, warm introductions, who-viewed-my-profile, data export and account deletion.
-- Rules live here, in the database, so every screen and any future app follows them.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- ---------- two-way blocks ----------
-- True when either member has blocked the other. Internal: only other database functions call it.
create function blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
revoke execute on function blocked_between(uuid, uuid) from public, anon, authenticated;

create function refuse_if_blocked() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'connections' then a := new.requester_id; b := new.addressee_id;
  elsif tg_table_name = 'follows' then a := new.follower_id; b := new.followee_id;
  elsif tg_table_name = 'recommendations' then a := new.author_id; b := new.subject_id;
  elsif tg_table_name = 'recommendation_requests' then a := new.requester_id; b := new.asked_id;
  elsif tg_table_name = 'intro_requests' then a := new.requester_id; b := new.target_id;
  end if;
  if blocked_between(a, b) then raise exception 'not possible between these members'; end if;
  return new;
end $$;
revoke execute on function refuse_if_blocked() from public, anon, authenticated;

-- blocking someone ends the connection and any follows between you
create function end_ties_on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from connections where (requester_id = new.blocker_id and addressee_id = new.blocked_id) or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  delete from follows where (follower_id = new.blocker_id and followee_id = new.blocked_id) or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  delete from intro_requests where status = 'pending' and ((requester_id = new.blocker_id and target_id = new.blocked_id) or (requester_id = new.blocked_id and target_id = new.blocker_id));
  return new;
end $$;
revoke execute on function end_ties_on_block() from public, anon, authenticated;

-- ---------- one stored row per connection ----------
delete from connections c using connections d
 where c.ctid <> d.ctid
   and least(c.requester_id, c.addressee_id) = least(d.requester_id, d.addressee_id)
   and greatest(c.requester_id, c.addressee_id) = greatest(d.requester_id, d.addressee_id)
   and ((d.status = 'accepted' and c.status <> 'accepted')
     or (c.status = d.status and (c.created_at > d.created_at or (c.created_at = d.created_at and c.ctid > d.ctid))));
create unique index connections_one_per_pair on connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create trigger connections_refuse_blocked before insert on connections for each row execute function refuse_if_blocked();
create trigger blocks_end_ties after insert on blocks for each row execute function end_ties_on_block();

-- ---------- profile type and details ----------
alter table profiles add column if not exists profile_type text not null default 'owner'
  check (profile_type in ('owner', 'advisor', 'maker', 'provider', 'team'));

-- members choose owner, maker or provider; advisor and team are given by the team
create or replace function protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not is_staff() then
      new.member_type := old.member_type;
      new.status := old.status;
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

create table profile_details (
  user_id uuid primary key references profiles (id) on delete cascade,
  helps_with text[] not null default '{}' check (cardinality(helps_with) <= 12),
  needs text[] not null default '{}' check (cardinality(needs) <= 12),
  availability text[] not null default '{}' check (cardinality(availability) <= 6),
  social_links jsonb not null default '{}' check (jsonb_typeof(social_links) = 'object'),
  custom_fields jsonb not null default '{}' check (jsonb_typeof(custom_fields) = 'object'),
  -- who may see each field: public, members, conn (my connections) or only (me). Missing = public.
  visibility jsonb not null default '{}' check (jsonb_typeof(visibility) = 'object'),
  private_browsing boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table profile_details enable row level security;
create policy "details own" on profile_details for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_active());
create policy "details staff read" on profile_details for select to authenticated using (is_staff());

create function validate_profile_details() returns trigger
language plpgsql set search_path = public as $$
declare t text; k text; v text;
begin
  foreach t in array new.helps_with || new.needs || new.availability loop
    if char_length(t) < 1 or char_length(t) > 60 then raise exception 'each item must be 1 to 60 characters'; end if;
  end loop;
  if pg_column_size(new.social_links) > 3000 or pg_column_size(new.custom_fields) > 6000 or pg_column_size(new.visibility) > 1500 then
    raise exception 'too much profile data';
  end if;
  -- social links must be plain https addresses (no javascript: or data: links)
  for k, v in select key, value from jsonb_each_text(new.social_links) loop
    if v !~ '^https://[^\s<>"'']{3,200}$' then raise exception 'social links must be https addresses'; end if;
  end loop;
  for k, v in select key, value from jsonb_each_text(new.visibility) loop
    if v not in ('public', 'members', 'conn', 'only') then raise exception 'unknown visibility'; end if;
    if k not in ('location', 'website', 'bio', 'helps_with', 'needs', 'availability', 'social_links', 'custom_fields', 'followers', 'last_active') then
      raise exception 'unknown profile field';
    end if;
  end loop;
  new.updated_at := now();
  return new;
end $$;
create trigger details_validate before insert or update on profile_details for each row execute function validate_profile_details();

-- may the signed-in viewer (or the public) see this field of this member?
create function field_visible(p_owner uuid, p_field text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare viewer uuid := auth.uid(); lvl text;
begin
  if viewer is not null and (viewer = p_owner or is_staff()) then return true; end if;
  if viewer is not null and blocked_between(viewer, p_owner) then return false; end if;
  select coalesce(visibility ->> p_field, 'public') into lvl from profile_details where user_id = p_owner;
  lvl := coalesce(lvl, 'public');
  return case lvl
    when 'public' then true
    when 'members' then viewer is not null
    when 'conn' then viewer is not null and exists (
      select 1 from connections where status = 'accepted'
        and ((requester_id = viewer and addressee_id = p_owner) or (requester_id = p_owner and addressee_id = viewer)))
    else false end;
end $$;
revoke execute on function field_visible(uuid, text) from public, anon, authenticated;

-- what the viewer is allowed to see of these members' details (hidden fields come back empty)
create function get_profile_details(p_ids uuid[]) returns table (
  user_id uuid, helps_with text[], needs text[], availability text[], social_links jsonb, custom_fields jsonb
) language sql stable security definer set search_path = public as $$
  select d.user_id,
    case when field_visible(d.user_id, 'helps_with') then d.helps_with else '{}' end,
    case when field_visible(d.user_id, 'needs') then d.needs else '{}' end,
    case when field_visible(d.user_id, 'availability') then d.availability else '{}' end,
    case when field_visible(d.user_id, 'social_links') then d.social_links else '{}'::jsonb end,
    case when field_visible(d.user_id, 'custom_fields') then d.custom_fields else '{}'::jsonb end
  from profile_details d join profiles p on p.id = d.user_id and p.status = 'active'
  where d.user_id = any (p_ids[1:100]);
$$;
grant execute on function get_profile_details(uuid[]) to anon, authenticated;

-- ---------- follows ----------
create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followee_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on follows (followee_id);
alter table follows enable row level security;
create policy "follows own" on follows for select to authenticated using (follower_id = auth.uid() or followee_id = auth.uid());
create policy "follow" on follows for insert to authenticated with check (follower_id = auth.uid() and is_active());
create policy "unfollow" on follows for delete to authenticated using (follower_id = auth.uid());
create trigger follows_refuse_blocked before insert on follows for each row execute function refuse_if_blocked();

create function follower_count(member uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when field_visible(member, 'followers') then (select count(*)::int from follows where followee_id = member) else null end;
$$;
grant execute on function follower_count(uuid) to anon, authenticated;

-- ---------- recommendations ----------
create table recommendations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  subject_id uuid not null references profiles (id) on delete cascade,
  relationship text not null check (relationship in ('client', 'referral_partner', 'colleague', 'supplier', 'other')),
  body text not null check (char_length(body) between 20 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (author_id, subject_id),
  check (author_id <> subject_id)
);
create index recommendations_subject on recommendations (subject_id) where not hidden;
alter table recommendations enable row level security;
create policy "recommendations read" on recommendations for select
  using (not hidden or author_id = auth.uid() or subject_id = auth.uid() or is_staff());
create policy "recommend a connection" on recommendations for insert to authenticated
  with check (author_id = auth.uid() and is_active() and is_connected(subject_id) and hidden = false);
create policy "recommendations edit" on recommendations for update to authenticated
  using (author_id = auth.uid() or subject_id = auth.uid()) with check (author_id = auth.uid() or subject_id = auth.uid());
create policy "recommendations delete" on recommendations for delete to authenticated
  using (author_id = auth.uid() or is_staff());
create trigger recommendations_refuse_blocked before insert on recommendations for each row execute function refuse_if_blocked();

-- the author edits the words; the person recommended can only hide or show it
create function limit_recommendation_edits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_id := old.author_id; new.subject_id := old.subject_id; new.created_at := old.created_at;
  if auth.uid() = old.author_id then new.hidden := old.hidden;
  else new.body := old.body; new.relationship := old.relationship; end if;
  return new;
end $$;
revoke execute on function limit_recommendation_edits() from public, anon, authenticated;
create trigger recommendations_limit_edits before update on recommendations for each row execute function limit_recommendation_edits();

create table recommendation_requests (
  requester_id uuid not null references profiles (id) on delete cascade,
  asked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (requester_id, asked_id),
  check (requester_id <> asked_id)
);
alter table recommendation_requests enable row level security;
create policy "rec requests read" on recommendation_requests for select to authenticated using (requester_id = auth.uid() or asked_id = auth.uid());
create policy "ask for a recommendation" on recommendation_requests for insert to authenticated
  with check (requester_id = auth.uid() and is_active() and is_connected(asked_id));
create policy "rec requests delete" on recommendation_requests for delete to authenticated using (requester_id = auth.uid() or asked_id = auth.uid());
create trigger rec_requests_refuse_blocked before insert on recommendation_requests for each row execute function refuse_if_blocked();

-- ---------- warm introductions ----------
create table intro_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  via_id uuid not null references profiles (id) on delete cascade,
  target_id uuid not null references profiles (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, via_id, target_id),
  check (requester_id <> via_id and requester_id <> target_id and via_id <> target_id)
);
alter table intro_requests enable row level security;
create policy "intros read" on intro_requests for select to authenticated using (requester_id = auth.uid() or via_id = auth.uid());
-- you can only ask someone you are connected to, to introduce you to one of their connections you are not yet connected to.
-- Checked by a function because the member cannot read other people's connections directly.
create function can_ask_intro(p_via uuid, p_target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and is_active()
    and exists (select 1 from connections c where c.status = 'accepted'
        and ((c.requester_id = auth.uid() and c.addressee_id = p_via) or (c.requester_id = p_via and c.addressee_id = auth.uid())))
    and exists (select 1 from connections c where c.status = 'accepted'
        and ((c.requester_id = p_via and c.addressee_id = p_target) or (c.requester_id = p_target and c.addressee_id = p_via)))
    and not exists (select 1 from connections c
        where (c.requester_id = auth.uid() and c.addressee_id = p_target) or (c.requester_id = p_target and c.addressee_id = auth.uid()));
$$;
revoke execute on function can_ask_intro(uuid, uuid) from public, anon;
grant execute on function can_ask_intro(uuid, uuid) to authenticated;
create policy "ask for an intro" on intro_requests for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and can_ask_intro(via_id, target_id));
create policy "answer an intro" on intro_requests for update to authenticated
  using (via_id = auth.uid() and status = 'pending') with check (via_id = auth.uid() and status in ('accepted', 'declined'));
create policy "withdraw an intro" on intro_requests for delete to authenticated using (requester_id = auth.uid());
create trigger intros_refuse_blocked before insert on intro_requests for each row execute function refuse_if_blocked();

create function intro_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from intro_requests where requester_id = new.requester_id and created_at > app_now() - interval '1 day') >= 5 then
      raise exception 'at most 5 introductions a day';
    end if;
    return new;
  end if;
  -- only the answer can change; accepting sends the connection request to the person being introduced to
  new.requester_id := old.requester_id; new.via_id := old.via_id; new.target_id := old.target_id; new.note := old.note; new.created_at := old.created_at;
  if new.status = 'accepted' and old.status = 'pending' then
    insert into connections (requester_id, addressee_id, status) values (old.requester_id, old.target_id, 'pending') on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function intro_rules() from public, anon, authenticated;
create trigger intros_rules before insert or update on intro_requests for each row execute function intro_rules();

-- ---------- who viewed my profile ----------
insert into plan_limits (plan, key, value) values
  ('free', 'profile_viewers_visible', 2), ('plus', 'profile_viewers_visible', 1000), ('advisor', 'profile_viewers_visible', 1000);

create table profile_views (
  viewer_id uuid not null references profiles (id) on delete cascade,
  viewed_id uuid not null references profiles (id) on delete cascade,
  viewed_on date not null,
  last_at timestamptz not null,
  primary key (viewer_id, viewed_id, viewed_on)
);
create index profile_views_viewed on profile_views (viewed_id, last_at desc);
alter table profile_views enable row level security; -- no policies: only the functions below read or write it

create function record_profile_view(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or me = p_id or not is_active() then return; end if;
  if blocked_between(me, p_id) then return; end if;
  if exists (select 1 from profile_details where user_id = me and private_browsing) then return; end if;
  if not exists (select 1 from profiles where id = p_id and status = 'active') then return; end if;
  insert into profile_views (viewer_id, viewed_id, viewed_on, last_at) values (me, p_id, (app_now() at time zone 'utc')::date, app_now())
  on conflict (viewer_id, viewed_id, viewed_on) do update set last_at = excluded.last_at;
end $$;
grant execute on function record_profile_view(uuid) to authenticated;

-- recent viewers: everyone gets the list, but names past the plan's limit come back hidden
create function my_profile_viewers() returns table (viewer_id uuid, last_at timestamptz, shown boolean)
language sql stable security definer set search_path = public as $$
  with recent as (
    select v.viewer_id, max(v.last_at) as last_at
    from profile_views v join profiles p on p.id = v.viewer_id and p.status = 'active'
    where v.viewed_id = auth.uid() and v.last_at > app_now() - interval '30 days' and not blocked_between(auth.uid(), v.viewer_id)
    group by v.viewer_id
  ), ranked as (select r.*, row_number() over (order by r.last_at desc) as n from recent r)
  select case when n <= coalesce(limit_for(auth.uid(), 'profile_viewers_visible'), 0) then viewer_id end, last_at,
         n <= coalesce(limit_for(auth.uid(), 'profile_viewers_visible'), 0)
  from ranked where not exists (select 1 from profile_details where user_id = auth.uid() and private_browsing)
  order by last_at desc limit 50;
$$;
grant execute on function my_profile_viewers() to authenticated;

create function my_profile_view_days() returns table (day date, views int)
language sql stable security definer set search_path = public as $$
  select d::date, coalesce(count(v.viewer_id), 0)::int
  from generate_series((app_now() at time zone 'utc')::date - 29, (app_now() at time zone 'utc')::date, interval '1 day') d
  left join profile_views v on v.viewed_id = auth.uid() and v.viewed_on = d::date
  where auth.uid() is not null
  group by d order by d;
$$;
grant execute on function my_profile_view_days() to authenticated;

-- ---------- member directory ----------
-- Search ignores accents and case (Montreal finds Montréal). Hidden fields are not searchable.
create function search_members(
  q text default '', p_type text default null, p_province text default null, p_help text default null, p_avail text default null,
  p_limit int default 24, p_offset int default 0
) returns table (id uuid, full_name text, headline text, location text, avatar_url text, profile_type text, founding_number int, helps_with text[])
language plpgsql stable security definer set search_path = public, extensions as $$
declare needle text := '%' || replace(replace(replace(extensions.unaccent(lower(coalesce(q, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  return query
  select p.id, p.full_name, p.headline,
         case when field_visible(p.id, 'location') then p.location else '' end,
         p.avatar_url, p.profile_type, p.founding_number,
         case when d.user_id is not null and field_visible(p.id, 'helps_with') then d.helps_with else '{}' end
  from profiles p left join profile_details d on d.user_id = p.id
  where p.status = 'active'
    and (auth.uid() is null or not blocked_between(auth.uid(), p.id))
    and (p_type is null or p.profile_type = p_type)
    and (p_province is null or (field_visible(p.id, 'location') and p.location ilike '%, ' || replace(replace(p_province, '%', ''), '_', '') ))
    and (p_help is null or (d.user_id is not null and field_visible(p.id, 'helps_with') and p_help = any (d.helps_with)))
    and (p_avail is null or (d.user_id is not null and field_visible(p.id, 'availability') and p_avail = any (d.availability)))
    and (coalesce(q, '') = '' or extensions.unaccent(lower(p.full_name || ' ' || p.headline || ' ' || case when field_visible(p.id, 'location') then p.location else '' end)) like needle)
  order by p.founding_number nulls last, p.full_name
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
end $$;
grant execute on function search_members(text, text, text, text, text, int, int) to anon, authenticated;

-- ---------- your data: export and delete ----------
create function export_my_data() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in first'; end if;
  return jsonb_build_object(
    'exported_at', app_now(),
    'profile', (select to_jsonb(p) - 'fts' from profiles p where p.id = me),
    'details', (select to_jsonb(d) from profile_details d where d.user_id = me),
    'posts', coalesce((select jsonb_agg(to_jsonb(x) - 'fts') from posts x where x.author_id = me), '[]'),
    'comments', coalesce((select jsonb_agg(to_jsonb(x)) from comments x where x.author_id = me), '[]'),
    'connections', coalesce((select jsonb_agg(to_jsonb(x)) from connections x where me in (x.requester_id, x.addressee_id)), '[]'),
    'follows', coalesce((select jsonb_agg(to_jsonb(x)) from follows x where me in (x.follower_id, x.followee_id)), '[]'),
    'recommendations_written', coalesce((select jsonb_agg(to_jsonb(x)) from recommendations x where x.author_id = me), '[]'),
    'recommendations_received', coalesce((select jsonb_agg(to_jsonb(x)) from recommendations x where x.subject_id = me), '[]'),
    'messages', coalesce((select jsonb_agg(to_jsonb(x)) from messages x where me in (x.sender_id, x.recipient_id)), '[]'),
    'blocked', coalesce((select jsonb_agg(to_jsonb(x)) from blocks x where x.blocker_id = me), '[]')
  );
end $$;
grant execute on function export_my_data() to authenticated;

-- deletes the signed-in member's account and everything tied to it. No secret key is needed in the website.
create function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if (select role from team_roles where user_id = auth.uid()) = 'admin'
     and (select count(*) from team_roles where role = 'admin') <= 1 then
    raise exception 'the last admin cannot delete the account';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
grant execute on function delete_my_account() to authenticated;

-- the website calls these as signed-in members only (default grants would also give them to visitors)
revoke execute on function record_profile_view(uuid), my_profile_viewers(), my_profile_view_days(), export_my_data(), delete_my_account() from public, anon;
