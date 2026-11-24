-- Update 3: profile completion.
-- A profile is READY when it has all five: photo, headline, city, at least one "can help with" tag, and a business page
-- (draft or published). ready_count (0-5) and ready_at are kept up to date by triggers, so a member cannot set them.
-- Soft limits are enforced here, not only in the browser: without a photo and headline a member cannot connect or ask for an
-- introduction, and members whose profile is not ready are left out of member search.
-- Additive only.

-- ---------- 1. the count on the profile ----------
alter table profiles
  add column ready_count smallint not null default 0 check (ready_count between 0 and 5),
  add column ready_at timestamptz;

-- members cannot set the count themselves; only refresh_ready() below does (it raises app.ready for its own update)
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
  if coalesce(current_setting('app.ready', true), '') <> '1' then
    new.ready_count := old.ready_count;
    new.ready_at := old.ready_at;
  end if;
  return new;
end $$;

-- the five checks for one member. Not callable from the API: the app reads them through my_ready_items() and the team functions.
create function profile_ready_items(p_user uuid) returns table (photo boolean, headline boolean, city boolean, helps boolean, biz boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(btrim(p.avatar_url), '') <> '',
         coalesce(btrim(p.headline), '') <> '',
         coalesce(btrim(p.location), '') <> '',
         exists (select 1 from profile_details d where d.user_id = p.id and cardinality(d.helps_with) > 0),
         exists (select 1 from companies c where c.owner_id = p.id and c.status in ('draft', 'pending', 'published'))
  from profiles p where p.id = p_user;
$$;

create function refresh_ready(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i record; n int;
begin
  select * into i from profile_ready_items(p_user);
  if not found then return; end if;
  n := i.photo::int + i.headline::int + i.city::int + i.helps::int + i.biz::int;
  perform set_config('app.ready', '1', true);
  update profiles
     set ready_count = n,
         ready_at = case when n = 5 then coalesce(ready_at, now()) else null end
   where id = p_user and (ready_count is distinct from n or (n = 5) is distinct from (ready_at is not null));
  perform set_config('app.ready', '', true);
end $$;

create function ready_after_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform refresh_ready(new.id); return null; end $$;
create trigger ready_after_profile after insert or update of avatar_url, headline, location on profiles
  for each row execute function ready_after_profile();

create function ready_after_details() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform refresh_ready(case when tg_op = 'DELETE' then old.user_id else new.user_id end);
  return null;
end $$;
create trigger ready_after_details after insert or update of helps_with or delete on profile_details
  for each row execute function ready_after_details();

create function ready_after_company() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'INSERT' then perform refresh_ready(old.owner_id); end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id) then perform refresh_ready(new.owner_id); end if;
  return null;
end $$;
create trigger ready_after_company after insert or update of status, owner_id or delete on companies
  for each row execute function ready_after_company();

revoke execute on function profile_ready_items(uuid), refresh_ready(uuid), ready_after_profile(), ready_after_details(), ready_after_company()
  from public, anon, authenticated;

select refresh_ready(id) from profiles;

-- the signed-in member's own five checks
create function my_ready_items() returns table (photo boolean, headline boolean, city boolean, helps boolean, biz boolean, ready_count int)
language sql stable security definer set search_path = public as $$
  select i.photo, i.headline, i.city, i.helps, i.biz, p.ready_count::int
  from profiles p, profile_ready_items(p.id) i where p.id = auth.uid();
$$;
revoke execute on function my_ready_items() from public, anon;
grant execute on function my_ready_items() to authenticated;

-- ---------- 2. soft limits ----------
-- Without a photo and a headline a member cannot ask to connect or ask for an introduction.
-- Reading, posting, groups, replying to messages, events and courses all stay open.
create function require_reachable() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if not exists (select 1 from profiles p where p.id = auth.uid() and coalesce(btrim(p.avatar_url), '') <> '' and coalesce(btrim(p.headline), '') <> '') then
    raise exception 'profile_not_ready: add a photo and headline first' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger connections_need_photo before insert on connections for each row execute function require_reachable();
create trigger intros_need_photo before insert on intro_requests for each row execute function require_reachable();
revoke execute on function require_reachable() from public, anon, authenticated;

-- Members whose profile is not ready do not show up in member search. People who are not ordinary members
-- (advisors and the team) are not affected.
create or replace function member_directory(
  q text default '', p_type text default null, p_province text default null, p_help text default null, p_avail text default null,
  p_limit int default 60, p_offset int default 0
) returns table (id uuid, full_name text, headline text, location text, avatar_url text, profile_type text, member_type text, founding_number int,
                 helps_with text[], needs text[], recommended_by int, last_active timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare needle text := '%' || replace(replace(replace(extensions.unaccent(lower(coalesce(q, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  return query
  select p.id, p.full_name, p.headline,
         case when field_visible(p.id, 'location') then p.location else '' end,
         p.avatar_url, p.profile_type, p.member_type, p.founding_number,
         case when d.user_id is not null and field_visible(p.id, 'helps_with') then d.helps_with else '{}' end,
         case when d.user_id is not null and field_visible(p.id, 'needs') then d.needs else '{}' end,
         (select count(*)::int from recommendations r where r.subject_id = p.id and not r.hidden),
         case when field_visible(p.id, 'last_active') then
           greatest(p.created_at,
                    (select max(po.created_at) from posts po where po.author_id = p.id),
                    (select max(c.created_at) from comments c where c.author_id = p.id))
         else null end
  from profiles p left join profile_details d on d.user_id = p.id
  where p.status = 'active'
    and (p.ready_count = 5 or p.profile_type not in ('owner', 'provider', 'maker'))
    and (auth.uid() is null or not blocked_between(auth.uid(), p.id))
    and (p_type is null or p.profile_type = p_type)
    and (p_province is null or (field_visible(p.id, 'location') and p.location ilike '%, ' || replace(replace(p_province, '%', ''), '_', '')))
    and (p_help is null or (d.user_id is not null and field_visible(p.id, 'helps_with') and p_help = any (d.helps_with)))
    and (p_avail is null or (d.user_id is not null and field_visible(p.id, 'availability') and p_avail = any (d.availability)))
    and (coalesce(q, '') = '' or extensions.unaccent(lower(p.full_name || ' ' || p.headline || ' ' || case when field_visible(p.id, 'location') then p.location else '' end || ' ' || case when d.user_id is not null and field_visible(p.id, 'helps_with') then array_to_string(d.helps_with, ' ') else '' end)) like needle)
  order by p.founding_number nulls last, p.full_name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

create or replace function search_members(
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
    and (p.ready_count = 5 or p.profile_type not in ('owner', 'provider', 'maker'))
    and (auth.uid() is null or not blocked_between(auth.uid(), p.id))
    and (p_type is null or p.profile_type = p_type)
    and (p_province is null or (field_visible(p.id, 'location') and p.location ilike '%, ' || replace(replace(p_province, '%', ''), '_', '') ))
    and (p_help is null or (d.user_id is not null and field_visible(p.id, 'helps_with') and p_help = any (d.helps_with)))
    and (p_avail is null or (d.user_id is not null and field_visible(p.id, 'availability') and p_avail = any (d.availability)))
    and (coalesce(q, '') = '' or extensions.unaccent(lower(p.full_name || ' ' || p.headline || ' ' || case when field_visible(p.id, 'location') then p.location else '' end)) like needle)
  order by p.founding_number nulls last, p.full_name
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
end $$;

create or replace function search_profiles(q text) returns setof profiles
language sql stable set search_path = public as $$
  select p.* from profiles p
  where p.fts @@ to_tsquery('english', q)
    and (p.ready_count = 5 or p.profile_type not in ('owner', 'provider', 'maker'))
  order by ts_rank(p.fts, to_tsquery('english', q)) desc, p.created_at desc
$$;

-- ---------- 3. the AI draft the member checks at sign-up ----------
-- One row per set-up attempt. Nothing is published until the member presses Save (saved_at).
create table profile_drafts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles (id) on delete cascade,
  source text not null check (source in ('web', 'questions')),
  website text not null default '' check (char_length(website) <= 300),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  created_at timestamptz not null default now(),
  saved_at timestamptz
);
create index profile_drafts_member on profile_drafts (member_id, created_at desc);
alter table profile_drafts enable row level security;
create policy "drafts own read" on profile_drafts for select to authenticated using (member_id = auth.uid());
create policy "drafts own add" on profile_drafts for insert to authenticated with check (member_id = auth.uid() and saved_at is null);
grant select, insert on profile_drafts to authenticated;

-- Saves the checked draft: headline, city, introduction and tags on the profile, and (when ticked) the business page as a DRAFT
-- with its services. Runs with the member's own rights, so every business rule (category list, page limit) still applies.
create function apply_profile_draft(p_draft_id uuid, p_draft jsonb, p_make_business boolean) returns text
language plpgsql set search_path = public as $$
declare
  me uuid := auth.uid();
  title text := left(btrim(coalesce(p_draft ->> 'title', '')), 60);
  biz text := left(btrim(coalesce(p_draft ->> 'biz', '')), 100);
  city text := left(btrim(coalesce(p_draft ->> 'city', '')), 80);
  about text := left(btrim(coalesce(p_draft ->> 'about', '')), 1000);
  helps text[] := coalesce((select array_agg(left(btrim(x), 40)) from (select jsonb_array_elements_text(coalesce(p_draft -> 'helps', '[]')) x limit 5) h where btrim(x) <> ''), '{}');
  cats text[];
  cat text;
  prov text;
  slug text;
  cid uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  if title = '' or biz = '' then raise exception 'Add your role and business name.'; end if;
  update profiles set headline = title || ', ' || biz, location = city, bio = about where id = me;
  insert into profile_details (user_id, helps_with) values (me, helps)
    on conflict (user_id) do update set helps_with = excluded.helps_with, updated_at = now();
  if p_make_business and not exists (select 1 from companies c where c.owner_id = me and c.status in ('draft', 'pending', 'published')) then
    select categories into cats from business_settings;
    cat := coalesce((select c from unnest(cats) c where c = btrim(coalesce(p_draft ->> 'category', '')) limit 1), '');
    prov := upper(btrim(split_part(city, ',', 2)));
    slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(biz), '[^a-z0-9]+', '-', 'g')), ''), 'business') || '-' || substr(md5(random()::text), 1, 4);
    cid := gen_random_uuid(); -- no RETURNING: a draft page is only readable once the owner is on its team, which an after-insert trigger sets
    insert into companies (id, owner_id, slug, name, category, city, province, description, about)
    values (cid, me, slug, biz, cat, btrim(split_part(city, ',', 1)), case when char_length(prov) = 2 then prov else '' end,
            left(btrim(coalesce(p_draft ->> 'desc', '')), 1000), left(btrim(coalesce(p_draft ->> 'desc', '')), 2000));
    insert into business_services (company_id, name, position)
      select cid, left(btrim(s.v), 80), (s.n - 1)::int
      from jsonb_array_elements_text(coalesce(p_draft -> 'services', '[]')) with ordinality as s(v, n)
      where btrim(s.v) <> '' and s.n <= 6;
  end if;
  update profile_drafts set saved_at = now() where id = p_draft_id and member_id = me;
  return slug;
end $$;
revoke execute on function apply_profile_draft(uuid, jsonb, boolean) from public, anon;
grant execute on function apply_profile_draft(uuid, jsonb, boolean) to authenticated;

-- ---------- 4. Member Spotlight ----------
create table spotlight_applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles (id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  consent_wording text not null check (char_length(consent_wording) between 1 and 500),
  consent_at timestamptz not null default now(),
  status text not null default 'received' check (status in ('received', 'chosen', 'published')),
  chosen_by uuid references profiles (id) on delete set null,
  chosen_at timestamptz,
  created_at timestamptz not null default now()
);
-- one open application per member at a time
create unique index spotlight_one_open on spotlight_applications (member_id) where status in ('received', 'chosen');
alter table spotlight_applications enable row level security;
create policy "spotlight own read" on spotlight_applications for select to authenticated using (member_id = auth.uid() or is_staff());
-- only a member whose profile is ready may apply, and only for themselves
create policy "spotlight apply" on spotlight_applications for insert to authenticated
  with check (member_id = auth.uid() and status = 'received' and chosen_by is null and chosen_at is null
              and exists (select 1 from profiles p where p.id = auth.uid() and p.ready_count = 5));
create policy "spotlight team decides" on spotlight_applications for update to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update on spotlight_applications to authenticated;

-- ---------- 5. the team's follow-up ----------
create table profile_followups (
  member_id uuid primary key references profiles (id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'called', 'left', 'setup', 'ready')),
  note text not null default '' check (char_length(note) <= 500),
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table profile_followups enable row level security;
create policy "followups team reads" on profile_followups for select to authenticated using (is_staff());
create policy "followups team writes" on profile_followups for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update on profile_followups to authenticated;

-- ordinary members, not the team
create function followup_members() returns setof profiles
language sql stable security definer set search_path = public as $$
  select p.* from profiles p
  where is_staff() and p.status = 'active' and p.profile_type in ('owner', 'provider', 'maker')
    and not exists (select 1 from team_roles t where t.user_id = p.id);
$$;
revoke execute on function followup_members() from public, anon;

-- filter: all (everyone not ready), founding, week (joined in the last 7 days), ready (ready now)
create function team_profile_followup(p_filter text default 'all') returns table (
  id uuid, full_name text, avatar_url text, headline text, location text, founding_number int, created_at timestamptz,
  last_visit timestamptz, missing text[], ready_count int, status text)
language sql stable security definer set search_path = public as $$
  select m.id, m.full_name, m.avatar_url, m.headline, m.location, m.founding_number, m.created_at,
         (select u.last_sign_in_at from auth.users u where u.id = m.id),
         array_remove(array[case when not i.photo then 'photo' end, case when not i.headline then 'headline' end,
                            case when not i.city then 'city' end, case when not i.helps then 'helps' end,
                            case when not i.biz then 'biz' end], null),
         m.ready_count::int,
         case when m.ready_count = 5 then 'ready' else coalesce(f.status, 'new') end
  from followup_members() m
  join lateral profile_ready_items(m.id) i on true
  left join profile_followups f on f.member_id = m.id
  where case coalesce(p_filter, 'all')
          when 'ready' then (m.ready_count = 5 and (f.member_id is not null or m.ready_at > now() - interval '14 days')) or f.status = 'ready'
          when 'founding' then m.founding_number is not null and m.ready_count < 5 and coalesce(f.status, 'new') <> 'ready'
          when 'week' then m.created_at > now() - interval '7 days' and m.ready_count < 5 and coalesce(f.status, 'new') <> 'ready'
          else m.ready_count < 5 and coalesce(f.status, 'new') <> 'ready' end
  order by (m.founding_number is null), m.created_at desc, m.id
  limit 1000;
$$;
revoke execute on function team_profile_followup(text) from public, anon;
grant execute on function team_profile_followup(text) to authenticated;

-- joined in the last 7 days; of those, how many are ready (ready_at is always inside their first 7 days then); not ready and older
-- than 7 days; and the last 6 weekly groups (oldest first): of each week's new members, the percent ready within 7 days of joining
create function team_profile_stats() returns table (joined_7d int, ready_7d int, older_not_ready int, trend int[])
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from followup_members() m where m.created_at > now() - interval '7 days'),
         (select count(*)::int from followup_members() m where m.created_at > now() - interval '7 days' and m.ready_at is not null),
         (select count(*)::int from followup_members() m where m.created_at <= now() - interval '7 days' and m.ready_count < 5),
         (select array_agg(pct order by k desc) from (
            select k, coalesce(round(100.0 * count(*) filter (where m.ready_at is not null and m.ready_at <= m.created_at + interval '7 days')
                                      / nullif(count(*), 0)), 0)::int as pct
            from generate_series(0, 5) k
            left join followup_members() m on m.created_at > now() - ((k + 1) * interval '7 days') and m.created_at <= now() - (k * interval '7 days')
            group by k) w);
$$;
revoke execute on function team_profile_stats() from public, anon;
grant execute on function team_profile_stats() to authenticated;

create function set_followup(p_member uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'team only'; end if;
  if p_status not in ('new', 'called', 'left', 'setup', 'ready') then raise exception 'unknown status'; end if;
  insert into profile_followups (member_id, status, updated_by) values (p_member, p_status, auth.uid())
    on conflict (member_id) do update set status = excluded.status, updated_by = auth.uid(), updated_at = now();
end $$;
revoke execute on function set_followup(uuid, text) from public, anon;
grant execute on function set_followup(uuid, text) to authenticated;

-- "I can set it up" message. Members can only be messaged by their connections, so the team goes through this.
create function team_message_member(p_member uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'team only'; end if;
  if btrim(coalesce(p_body, '')) = '' then raise exception 'empty message'; end if;
  insert into messages (sender_id, recipient_id, body) values (auth.uid(), p_member, left(btrim(p_body), 4000));
  insert into profile_followups (member_id, status, updated_by) values (p_member, 'left', auth.uid())
    on conflict (member_id) do update set status = case when profile_followups.status = 'new' then 'left' else profile_followups.status end,
                                          updated_by = auth.uid(), updated_at = now();
end $$;
revoke execute on function team_message_member(uuid, text) from public, anon;
grant execute on function team_message_member(uuid, text) to authenticated;

-- ---------- 6. real numbers for the yellow line and the emails ----------
-- Directory searches are logged (who, where, what) so "N owners near you searched" is a real count.
create table directory_searches (
  id bigint generated always as identity primary key,
  searcher_id uuid not null references profiles (id) on delete cascade,
  q text not null default '' check (char_length(q) <= 100),
  category text not null default '' check (char_length(category) <= 80),
  city text not null default '' check (char_length(city) <= 80),
  province text not null default '' check (char_length(province) <= 2),
  at timestamptz not null default now()
);
create index directory_searches_at on directory_searches (at desc);
alter table directory_searches enable row level security;
create policy "searches add own" on directory_searches for insert to authenticated with check (searcher_id = auth.uid());
grant insert on directory_searches to authenticated;

-- views of my profile and directory searches near me, last 7 days. A search counts when it could have shown a business in my city
-- (its province is mine and its city is empty or mine) and, if I have tags or a headline, when it mentions something I do.
create function my_profile_signals() returns table (views_7d int, searches_7d int)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid(); loc text; prov text; cty text; terms text[];
begin
  if me is null then return query select 0, 0; return; end if;
  select p.location, lower(btrim(split_part(p.location, ',', 1))), upper(btrim(split_part(p.location, ',', 2)))
    into loc, cty, prov from profiles p where p.id = me;
  select array_remove(array(
           select lower(btrim(t)) from unnest(coalesce((select helps_with from profile_details where user_id = me), '{}')) t
           union
           select lower(w) from regexp_split_to_table(coalesce(split_part((select headline from profiles where id = me), ', ', 2), ''), '\s+') w where char_length(w) >= 4), '')
    into terms;
  return query select
    (select count(distinct v.viewer_id)::int from profile_views v where v.viewed_id = me and v.viewed_on > current_date - 7),
    case when coalesce(prov, '') = '' then 0 else
      (select count(distinct s.searcher_id)::int from directory_searches s
        where s.at > now() - interval '7 days' and s.searcher_id <> me and s.province = prov
          and (s.city = '' or lower(s.city) = cty)
          and (cardinality(terms) = 0 or exists (select 1 from unnest(terms) t where lower(s.category) like '%' || t || '%' or lower(s.q) like '%' || t || '%')))
    end;
end $$;
revoke execute on function my_profile_signals() from public, anon;
grant execute on function my_profile_signals() to authenticated;
