-- CMS (cms.smbhub.ca): everything the admin console needs, without a service key anywhere.
-- Staff (role = 'admin', see is_staff()) get read access to the hub's tables through RLS and a few
-- security-definer functions that check is_staff() first. Message text stays private: staff see who
-- wrote to whom and when, never what was said.

-- ===== 1. Activity log: every change on the hub lands here, and the CMS listens to it live =====
create table cms_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null default 'hub' check (source in ('hub', 'cms')),
  actor_id uuid,                 -- who did it (auth.uid()); no FK so the trail survives deletions
  action text not null,          -- insert | update | delete, or a CMS action such as 'member.suspend'
  entity text not null,          -- table or concept: posts, profiles, comments, ...
  entity_id text,                -- the row's id (composite keys joined with ':')
  data jsonb not null default '{}'
);
create index cms_events_at on cms_events (at desc);
create index cms_events_entity on cms_events (entity, at desc);
create index cms_events_actor on cms_events (actor_id, at desc);
alter table cms_events enable row level security;
create policy "cms events staff read" on cms_events for select using (is_staff());
-- no insert/update/delete policies: rows come only from the trigger and cms_log() below

-- Records one hub change. Strips search vectors and message text; keeps the rest small.
create function cms_track() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  key text;
  changed jsonb := '{}';
begin
  rec := rec - 'fts';
  if tg_table_name = 'messages' then rec := rec - 'body'; end if;
  if tg_table_name in ('posts', 'comments', 'company_reviews') and rec ? 'body' then
    rec := jsonb_set(rec, '{body}', to_jsonb(left(rec ->> 'body', 280)));
  end if;
  key := coalesce(
    rec ->> 'id',
    case tg_table_name
      when 'reactions' then (rec ->> 'post_id') || ':' || (rec ->> 'user_id')
      when 'reposts' then (rec ->> 'post_id') || ':' || (rec ->> 'user_id')
      when 'saved_posts' then (rec ->> 'post_id') || ':' || (rec ->> 'user_id')
      when 'connections' then (rec ->> 'requester_id') || ':' || (rec ->> 'addressee_id')
      when 'group_members' then (rec ->> 'group_id') || ':' || (rec ->> 'user_id')
      when 'group_invites' then (rec ->> 'group_id') || ':' || (rec ->> 'user_id')
      when 'company_reviews' then (rec ->> 'company_id') || ':' || (rec ->> 'author_id')
      when 'blocks' then (rec ->> 'blocker_id') || ':' || (rec ->> 'blocked_id')
      when 'welcome_emails' then rec ->> 'user_id'
    end);
  if tg_op = 'UPDATE' then
    -- only the fields that changed, so the log reads "status: active -> suspended"
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}')
      into changed
      from jsonb_each(to_jsonb(new) - 'fts') n
      join jsonb_each(to_jsonb(old) - 'fts') o on o.key = n.key
     where n.value is distinct from o.value;
    if changed = '{}' then return null; end if;
    -- long text is not copied twice: an edit is just noted
    if changed ? 'body' then changed := jsonb_set(changed - 'body', '{body}', '"edited"'); end if;
    rec := jsonb_build_object('changed', changed, 'row', rec);
  end if;
  insert into cms_events (actor_id, action, entity, entity_id, data)
  values (auth.uid(), lower(tg_op), tg_table_name, key, rec);
  return null;
end $$;
revoke execute on function cms_track() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','posts','comments','reactions','reposts','saved_posts','connections',
    'groups','group_members','group_invites','companies','company_reviews','messages','reports','blocks','welcome_emails']
  loop
    execute format('create trigger cms_track after insert or update or delete on %I for each row execute function cms_track()', t);
  end loop;
end $$;

-- live updates for the CMS: staff subscribe to this table only (RLS above limits it to staff)
alter publication supabase_realtime add table cms_events;

-- ===== 2. CMS actions are logged too, with who did them =====
create function cms_log(p_action text, p_entity text, p_entity_id text, p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into cms_events (source, actor_id, action, entity, entity_id, data)
  values ('cms', auth.uid(), left(p_action, 60), left(p_entity, 40), left(p_entity_id, 120), coalesce(p_data, '{}'));
end $$;

-- ===== 3. Staff read access to tables they could not see before =====
create policy "connections staff read" on connections for select using (is_staff());
create policy "connections staff remove" on connections for delete using (is_staff());
create policy "notifications staff read" on notifications for select using (is_staff());
create policy "blocks staff read" on blocks for select using (is_staff());
create policy "welcome emails staff read" on welcome_emails for select using (is_staff());
create policy "group members staff manage" on group_members for update using (is_staff()) with check (is_staff());
create policy "comments staff read" on comments for select using (is_staff());
-- messages: no staff policy on purpose. Staff use cms_conversations() below, which has no text.

-- ===== 4. Functions the CMS calls =====
create or replace function cms_require_staff() returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
end $$;

-- Accounts with their sign-in details from auth.users (emails are not on profiles)
create function cms_users(p_search text default '', p_status text default '', p_role text default '',
                          p_plan text default '', p_limit int default 25, p_offset int default 0, p_id uuid default null,
                          p_confirmed text default '')
returns table (id uuid, email text, full_name text, headline text, location text, avatar_url text,
               member_type text, role text, status text, created_at timestamptz, last_sign_in_at timestamptz,
               email_confirmed_at timestamptz, provider text, posts bigint, connections bigint, total bigint)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform cms_require_staff();
  return query
  with base as (
    select p.*, u.email::text as email, u.last_sign_in_at, u.email_confirmed_at,
           coalesce(u.raw_app_meta_data ->> 'provider', 'email') as provider
      from profiles p join auth.users u on u.id = p.id
     where (p_id is null or p.id = p_id)
       and (coalesce(p_search, '') = '' or p.full_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%'
            or p.headline ilike '%' || p_search || '%' or p.location ilike '%' || p_search || '%')
       and (coalesce(p_status, '') = '' or p.status = p_status)
       and (coalesce(p_role, '') = '' or p.role = p_role)
       and (coalesce(p_plan, '') = '' or p.member_type = p_plan)
       and (coalesce(p_confirmed, '') = '' or (p_confirmed = 'yes') = (u.email_confirmed_at is not null))
  )
  select b.id, b.email, b.full_name, b.headline, b.location, b.avatar_url, b.member_type, b.role, b.status,
         b.created_at, b.last_sign_in_at, b.email_confirmed_at, b.provider,
         (select count(*) from posts x where x.author_id = b.id),
         (select count(*) from connections c where c.status = 'accepted' and (c.requester_id = b.id or c.addressee_id = b.id)),
         count(*) over ()
    from base b
   order by b.created_at desc
   limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end $$;

-- Headline numbers and 30-day series for the dashboard
create function cms_overview() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare res jsonb;
begin
  perform cms_require_staff();
  select jsonb_build_object(
    'members', (select count(*) from profiles),
    'active', (select count(*) from profiles where status = 'active'),
    'suspended', (select count(*) from profiles where status = 'suspended'),
    'admins', (select count(*) from profiles where role = 'admin'),
    'unconfirmed', (select count(*) from auth.users where email_confirmed_at is null),
    'signed_in_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'posts', (select count(*) from posts),
    'comments', (select count(*) from comments),
    'reactions', (select count(*) from reactions),
    'reposts', (select count(*) from reposts),
    'saves', (select count(*) from saved_posts),
    'groups', (select count(*) from groups),
    'group_members', (select count(*) from group_members),
    'connections', (select count(*) from connections where status = 'accepted'),
    'pending_connections', (select count(*) from connections where status = 'pending'),
    'messages', (select count(*) from messages),
    'companies', (select count(*) from companies),
    'reviews', (select count(*) from company_reviews),
    'open_reports', (select count(*) from reports where status = 'open'),
    'plans', (select coalesce(jsonb_object_agg(member_type, n), '{}') from (select member_type, count(*) n from profiles group by 1) x),
    'kinds', (select coalesce(jsonb_object_agg(kind, n), '{}') from (select kind, count(*) n from posts group by 1) x),
    'series', (
      select jsonb_agg(jsonb_build_object(
               'day', d::date,
               'signups', (select count(*) from profiles where created_at::date = d::date),
               'posts', (select count(*) from posts where created_at::date = d::date),
               'comments', (select count(*) from comments where created_at::date = d::date),
               'reactions', (select count(*) from reactions where created_at::date = d::date)) order by d)
        from generate_series(current_date - 29, current_date, interval '1 day') d)
  ) into res;
  return res;
end $$;

-- Who is talking to whom: counts and dates only, never message text
create function cms_conversations(p_member uuid default null, p_limit int default 50, p_offset int default 0)
returns table (member_a uuid, member_b uuid, messages bigint, unread bigint, first_at timestamptz, last_at timestamptz, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform cms_require_staff();
  return query
  select least(m.sender_id, m.recipient_id), greatest(m.sender_id, m.recipient_id),
         count(*), count(*) filter (where m.read_at is null), min(m.created_at), max(m.created_at), count(*) over ()
    from messages m
   where p_member is null or p_member in (m.sender_id, m.recipient_id)
   group by 1, 2
   order by max(m.created_at) desc
   limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end $$;

-- Saves per post (bookmarks stay private: counts only)
create function cms_post_stats(p_ids uuid[])
returns table (post_id uuid, reactions bigint, comments bigint, reposts bigint, saves bigint, reports bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform cms_require_staff();
  return query
  select i, (select count(*) from reactions r where r.post_id = i), (select count(*) from comments c where c.post_id = i),
         (select count(*) from reposts r where r.post_id = i), (select count(*) from saved_posts s where s.post_id = i),
         (select count(*) from reports r where r.post_id = i)
    from unnest(p_ids) i;
end $$;

-- Delete an account for good (admins only, never yourself). Cascades to everything they made.
create function cms_delete_account(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare who text;
begin
  perform cms_require_staff();
  if p_user = auth.uid() then raise exception 'You cannot delete your own account here' using errcode = '42501'; end if;
  if exists (select 1 from profiles where id = p_user and role = 'admin') then
    raise exception 'Remove admin access before deleting this account' using errcode = '42501';
  end if;
  select full_name into who from profiles where id = p_user;
  insert into cms_events (source, actor_id, action, entity, entity_id, data)
  values ('cms', auth.uid(), 'member.delete', 'profiles', p_user::text, jsonb_build_object('name', who));
  delete from auth.users where id = p_user;
end $$;

revoke execute on function cms_users, cms_overview, cms_conversations, cms_post_stats, cms_delete_account, cms_log, cms_require_staff from anon;
