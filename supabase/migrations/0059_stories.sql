-- Community Stories (handoff: Stories). Photos and short videos that stay in the feed for a set time
-- (Stories settings, "dur" hours), then live on in the author's highlights.
-- Every rule runs here, not in the browser: who may post, audiences, limits, files, approval, views, likes,
-- reports and highlights. Files sit in a private bucket and are only handed out through checked, short-lived links.

-- ---------- settings, read from the team's Stories settings page ----------
create function story_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from hub_settings where key = 'stories'), '{}'::jsonb);
$$;

create function story_int(k text, dflt int) returns int
language sql stable security definer set search_path = public as $$
  select case when (story_settings() ->> k) ~ '^[0-9]{1,4}$' then (story_settings() ->> k)::int else dflt end;
$$;

-- the boolean switches default to the handoff's defaults when the team has not saved the page yet
create function story_flag(path text[], dflt boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((story_settings() #>> path)::boolean, dflt);
$$;

-- ---------- tables ----------
create table stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  company_id uuid references companies (id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 220),
  audience text not null default 'members' check (audience in ('public', 'members', 'conn')),
  status text not null default 'published' check (status in ('published', 'pending', 'removed', 'rejected', 'deleted')),
  reports_done boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);
create index stories_live on stories (published_at desc) where status = 'published';
create index stories_author on stories (author_id, created_at desc);
create index stories_company on stories (company_id) where company_id is not null;

create table story_items (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  position smallint not null check (position between 0 and 9),
  kind text not null check (kind in ('image', 'video')),
  path text not null check (char_length(path) <= 300),
  poster_path text check (poster_path is null or char_length(poster_path) <= 300),
  seconds numeric check (seconds is null or seconds between 0 and 600),
  purged boolean not null default false,
  unique (story_id, position)
);
create index story_items_path on story_items (path);
create index story_items_poster on story_items (poster_path) where poster_path is not null;

create table story_seen (
  item_id uuid not null references story_items (id) on delete cascade,
  viewer_id uuid not null references profiles (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (item_id, viewer_id)
);
create index story_seen_viewer on story_seen (viewer_id);

create table story_likes (
  story_id uuid not null references stories (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, member_id)
);

create table story_highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  cover_item uuid references story_items (id) on delete set null,
  created_at timestamptz not null default now()
);
create index story_highlights_owner on story_highlights (owner_id, created_at);

create table story_highlight_items (
  highlight_id uuid not null references story_highlights (id) on delete cascade,
  item_id uuid not null references story_items (id) on delete cascade,
  position int not null default 0,
  primary key (highlight_id, item_id)
);
create index story_highlight_items_item on story_highlight_items (item_id);

alter table stories enable row level security;
alter table story_items enable row level security;
alter table story_seen enable row level security;
alter table story_likes enable row level security;
alter table story_highlights enable row level security;
alter table story_highlight_items enable row level security;

-- ---------- who can see a story ----------
-- the author's side: the author, the business's posting team, and the Hub team
create function story_is_mine(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from stories s where s.id = sid and auth.uid() is not null
    and (s.author_id = auth.uid() or (s.company_id is not null and biz_can(s.company_id, 'post'))));
$$;

-- a published story, for this viewer and its audience (expiry is not checked here: highlights keep expired items)
create function story_visible(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from stories s join profiles a on a.id = s.author_id
    where s.id = sid and s.status = 'published' and a.status = 'active'
      and (auth.uid() is null or not blocked_between(auth.uid(), s.author_id))
      and (s.audience = 'public'
        or (auth.uid() is not null and (s.audience = 'members'
          or s.author_id = auth.uid()
          or (s.company_id is null and is_connected(s.author_id))
          or (s.company_id is not null and (is_team(s.company_id)
            or exists (select 1 from business_follows f where f.company_id = s.company_id and f.user_id = auth.uid())))))))
$$;

-- the photo or video itself: published and visible, or the author's own pending story, or the Hub team
create function story_media_ok(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() or story_visible(sid)
    or exists (select 1 from stories s where s.id = sid and s.status = 'pending' and story_is_mine(sid));
$$;

create function story_live(published timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select published > now() - make_interval(hours => story_int('dur', 24));
$$;

-- ---------- row rules ----------
-- the author always sees their own list (a removed story shows as "Removed by the Hub"); media are checked separately
create policy "stories read" on stories for select to anon, authenticated
  using (is_staff() or (status <> 'deleted' and story_is_mine(id)) or story_visible(id));
create policy "story items read" on story_items for select to anon, authenticated
  using (not purged and (is_staff() or story_is_mine(story_id) or story_visible(story_id)));
create policy "my seen items" on story_seen for select to authenticated using (viewer_id = auth.uid());
create policy "see an item" on story_seen for insert to authenticated
  with check (viewer_id = auth.uid() and exists (select 1 from story_items i where i.id = item_id and story_visible(i.story_id)));
create policy "my likes" on story_likes for select to authenticated using (member_id = auth.uid());
create policy "like a story" on story_likes for insert to authenticated
  with check (member_id = auth.uid() and story_flag('{likes}', true) and story_visible(story_id) and not story_is_mine(story_id));
create policy "unlike a story" on story_likes for delete to authenticated using (member_id = auth.uid());
create policy "highlights read" on story_highlights for select to anon, authenticated
  using (owner_id = auth.uid() or is_staff() or exists (select 1 from profiles p where p.id = owner_id and p.status = 'active'));
create policy "highlight items read" on story_highlight_items for select to anon, authenticated
  using (exists (select 1 from story_highlights h where h.id = highlight_id));

revoke all on stories, story_items, story_seen, story_likes, story_highlights, story_highlight_items from anon, authenticated;
grant select on stories, story_items, story_highlights, story_highlight_items to anon, authenticated;
grant select, insert on story_seen to authenticated;
grant select, insert, delete on story_likes to authenticated;

-- ---------- posting ----------
-- p_items: [{"path": "<me>/<uuid>.jpg", "kind": "image"|"video", "poster": "<me>/<uuid>.jpg"|null, "seconds": 12.5|null}]
create function story_create(p_caption text, p_audience text, p_company uuid, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); staff boolean := is_staff(); s jsonb := story_settings();
  who text := coalesce(s ->> 'publish', 'all'); plan text; active int; n int; sid uuid; it jsonb; i int := 0;
  p text; ext text; kind text; poster text; secs numeric; allowed boolean;
begin
  if me is null or not is_active() then raise exception 'stories: sign in to post a story'; end if;
  select pr.plan into plan from profiles pr where pr.id = me;
  if not staff then
    if who = 'team' then raise exception 'stories.publish: only the Hub team can post stories right now'; end if;
    if who = 'paid' and coalesce(plan, 'free') not in ('plus', 'advisor') then raise exception 'stories.publish: stories are for SMB Plus members and Advisors right now'; end if;
  end if;
  if p_audience not in ('public', 'members', 'conn') or not story_flag(array['aud', p_audience], p_audience <> 'public') then
    raise exception 'stories.aud: that audience is not available';
  end if;
  if p_company is not null and not (biz_can(p_company, 'post') and exists (select 1 from companies c where c.id = p_company and c.status = 'published')) then
    raise exception 'stories: you cannot post for that business';
  end if;
  select count(*) into active from stories st where st.author_id = me and (st.status = 'pending' or (st.status = 'published' and story_live(st.published_at)));
  if not staff and active >= story_int('perMember', 3) then raise exception 'stories.perMember: you have % active stories', active; end if;
  n := coalesce(jsonb_array_length(p_items), 0);
  if n < 1 then raise exception 'stories: add a photo or video'; end if;
  if n > story_int('perStory', 5) then raise exception 'stories.perStory: up to % photos or videos in one story', story_int('perStory', 5); end if;

  insert into stories (author_id, company_id, caption, audience, status)
  values (me, p_company, btrim(coalesce(p_caption, '')), p_audience,
          case when story_flag('{approval}', false) and not staff then 'pending' else 'published' end)
  returning id into sid;

  for it in select * from jsonb_array_elements(p_items) loop
    p := it ->> 'path'; kind := it ->> 'kind'; poster := nullif(it ->> 'poster', '');
    secs := case when (it ->> 'seconds') ~ '^[0-9]+(\.[0-9]+)?$' then (it ->> 'seconds')::numeric else null end;
    if p is null or p !~ ('^' || me::text || '/[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|mov|webm)$') then raise exception 'stories: bad file'; end if;
    ext := substring(p from '\.([a-z0-9]+)$');
    allowed := story_flag(array['types', ext], ext <> 'gif');
    if not allowed then raise exception 'stories.types: % files are not allowed', upper(ext); end if;
    if (kind = 'video') <> (ext in ('mp4', 'mov', 'webm')) or kind not in ('image', 'video') then raise exception 'stories: bad file'; end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'stories' and o.name = p) then raise exception 'stories: the file did not finish uploading'; end if;
    if poster is not null and (kind <> 'video' or poster !~ ('^' || me::text || '/[0-9a-f-]{36}\.jpg$')
        or not exists (select 1 from storage.objects o where o.bucket_id = 'stories' and o.name = poster)) then raise exception 'stories: bad poster'; end if;
    if kind = 'video' and secs is not null and secs > story_int('maxVid', 30) + 0.5 then
      raise exception 'stories.maxVid: videos can be up to % seconds', story_int('maxVid', 30);
    end if;
    if exists (select 1 from story_items x where x.path = p) then raise exception 'stories: that file is already in a story'; end if;
    insert into story_items (story_id, position, kind, path, poster_path, seconds) values (sid, i, kind, p, poster, secs);
    i := i + 1;
  end loop;
  return sid;
end $$;

-- the author (or the business team, or the Hub team) deletes a story; it also leaves every highlight
create function story_delete(p_story uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (story_is_mine(p_story) or is_staff()) then raise exception 'stories: not your story'; end if;
  delete from story_highlight_items hi using story_items i where hi.item_id = i.id and i.story_id = p_story;
  update stories set status = 'deleted' where id = p_story;
end $$;

-- marks the item as seen (once per person); the author's own views are not counted
create function story_mark_seen(p_items uuid[]) returns void
language sql security definer set search_path = public as $$
  insert into story_seen (item_id, viewer_id)
  select i.id, auth.uid() from story_items i
  where i.id = any (p_items[1:20]) and auth.uid() is not null and story_visible(i.story_id) and not story_is_mine(i.story_id)
  on conflict do nothing;
$$;

-- counts for the author's own stories: views (each person once) and likes
create function story_counts(p_stories uuid[]) returns table (story_id uuid, views int, likes int)
language sql stable security definer set search_path = public as $$
  select s.id,
    (select count(distinct v.viewer_id)::int from story_seen v join story_items i on i.id = v.item_id where i.story_id = s.id),
    (select count(*)::int from story_likes l where l.story_id = s.id)
  from stories s where s.id = any (p_stories[1:100]) and (story_is_mine(s.id) or is_staff());
$$;

-- who viewed: the author sees names only when the team allows it ("Authors can see who viewed their story")
create function story_viewers(p_story uuid) returns table (member_id uuid, full_name text, avatar_url text, liked boolean, seen_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, exists (select 1 from story_likes l where l.story_id = p_story and l.member_id = p.id), max(v.seen_at)
  from story_seen v join story_items i on i.id = v.item_id join profiles p on p.id = v.viewer_id
  where i.story_id = p_story and (is_staff() or (story_is_mine(p_story) and story_flag('{showViewers}', true)))
  group by p.id, p.full_name, p.avatar_url
  order by max(v.seen_at) desc limit 500;
$$;

-- ---------- highlights ----------
-- saves a highlight (new when p_id is null) with the chosen items, in order; only the owner's own story items
create function story_highlight_save(p_id uuid, p_name text, p_items uuid[], p_cover uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); hid uuid := p_id; k int := 0; it uuid;
begin
  if me is null then raise exception 'highlights: sign in'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 30 then raise exception 'highlights: give the highlight a name (up to 30 characters)'; end if;
  if coalesce(array_length(p_items, 1), 0) not between 1 and 100 then raise exception 'highlights: choose at least one story'; end if;
  if exists (select 1 from unnest(p_items) x(id) where not exists (
      select 1 from story_items i join stories s on s.id = i.story_id
      where i.id = x.id and s.author_id = me and s.status in ('published', 'pending') and not i.purged)) then
    raise exception 'highlights: you can only add your own stories';
  end if;
  if hid is null then
    if (select count(*) from story_highlights where owner_id = me) >= 30 then raise exception 'highlights: up to 30 highlights'; end if;
    insert into story_highlights (owner_id, name) values (me, btrim(p_name)) returning id into hid;
  elsif not exists (select 1 from story_highlights where id = hid and owner_id = me) then
    raise exception 'highlights: not your highlight';
  else
    update story_highlights set name = btrim(p_name) where id = hid;
    delete from story_highlight_items where highlight_id = hid;
  end if;
  foreach it in array p_items loop
    insert into story_highlight_items (highlight_id, item_id, position) values (hid, it, k) on conflict do nothing;
    k := k + 1;
  end loop;
  update story_highlights set cover_item = case when p_cover = any (p_items) then p_cover else p_items[1] end where id = hid;
  return hid;
end $$;

-- adds every item of one of my stories to one of my highlights
create function story_highlight_add(p_highlight uuid, p_story uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k int;
begin
  if not exists (select 1 from story_highlights where id = p_highlight and owner_id = me) then raise exception 'highlights: not your highlight'; end if;
  if not exists (select 1 from stories where id = p_story and author_id = me and status in ('published', 'pending')) then raise exception 'highlights: not your story'; end if;
  select coalesce(max(position) + 1, 0) into k from story_highlight_items where highlight_id = p_highlight;
  insert into story_highlight_items (highlight_id, item_id, position)
  select p_highlight, i.id, k + i.position from story_items i where i.story_id = p_story and not i.purged
  on conflict do nothing;
  update story_highlights set cover_item = coalesce(cover_item, (select item_id from story_highlight_items where highlight_id = p_highlight order by position limit 1)) where id = p_highlight;
end $$;

-- deleting a highlight keeps the stories themselves
create function story_highlight_delete(p_highlight uuid) returns void
language sql security definer set search_path = public as $$
  delete from story_highlights where id = p_highlight and (owner_id = auth.uid() or is_staff());
$$;

-- ---------- moderation ----------
alter table reports add column if not exists story_id uuid references stories (id) on delete cascade;
alter table reports drop constraint if exists reports_check;
alter table reports add constraint reports_check check (post_id is not null or profile_id is not null or course_review_id is not null or story_id is not null);
create index if not exists reports_story on reports (story_id) where story_id is not null;
update mod_settings set types = types || '{"story":{"on":true,"auto":true,"hide":3}}'::jsonb where not types ? 'story';

-- a member can report a story they can see, and not their own
create function story_reportable(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select story_visible(sid) and not story_is_mine(sid)
    and coalesce(((select types from mod_settings limit 1) -> 'story' ->> 'on')::boolean, true);
$$;
create policy "report a story" on reports as restrictive for insert to authenticated with check (story_id is null or story_reportable(story_id));

-- enough open reports take the story down until a moderator looks (the moderation page's own limit)
create function mod_after_story_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare t jsonb; n int;
begin
  if new.story_id is null then return null; end if;
  t := coalesce((select types -> 'story' from mod_settings limit 1), '{"on":true,"auto":true,"hide":3}'::jsonb);
  update stories set reports_done = false where id = new.story_id;
  if (t ->> 'on')::boolean and (t ->> 'auto')::boolean then
    select count(*) into n from reports where story_id = new.story_id and status = 'open';
    if n >= (t ->> 'hide')::int then update stories set status = 'removed' where id = new.story_id and status = 'published'; end if;
  end if;
  return null;
end $$;
create trigger mod_after_story_report after insert on reports for each row execute function mod_after_story_report();

-- the Hub team's buttons: approve, reject, remove, keep (dismiss the reports) and restore
create function story_moderate(p_story uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'stories: moderators only'; end if;
  case p_action
    when 'approve' then update stories set status = 'published', published_at = now() where id = p_story and status = 'pending';
    when 'reject' then update stories set status = 'rejected' where id = p_story and status = 'pending';
    when 'remove' then update stories set status = 'removed' where id = p_story and status in ('published', 'pending');
      update reports set status = 'resolved' where story_id = p_story and status = 'open';
    when 'dismiss' then update stories set reports_done = true where id = p_story;
      update reports set status = 'resolved' where story_id = p_story and status = 'open';
    when 'restore' then update stories set status = 'published', reports_done = true where id = p_story and status in ('removed', 'rejected');
      update reports set status = 'resolved' where story_id = p_story and status = 'open';
    else raise exception 'stories: unknown action';
  end case;
end $$;

-- ---------- clean-up of expired files ("Permanently delete its photos and videos") ----------
-- run by the scheduled job with the service key; returns the files to delete from storage
create function story_purge_expired() returns table (path text)
language plpgsql security definer set search_path = public as $$
begin
  if not story_flag('{cleanup}', false) then return; end if;
  return query
  with gone as (
    update story_items i set purged = true
    from stories s
    where s.id = i.story_id and not i.purged and s.status in ('published', 'removed', 'rejected', 'deleted')
      and (s.status <> 'published' or not story_live(s.published_at))
      and s.created_at < now() - interval '1 hour'
      and not exists (select 1 from story_highlight_items h where h.item_id = i.id)
    returning i.path, i.poster_path)
  select g.path from gone g union all select g.poster_path from gone g where g.poster_path is not null;
end $$;

-- the settings readers are used inside row rules, so members run them; they only read the team's public page settings
revoke execute on function story_purge_expired() from public, anon, authenticated;
revoke execute on function mod_after_story_report() from public, anon, authenticated;
revoke execute on function story_create(text, text, uuid, jsonb), story_delete(uuid), story_mark_seen(uuid[]), story_counts(uuid[]), story_viewers(uuid),
  story_highlight_save(uuid, text, uuid[], uuid), story_highlight_add(uuid, uuid), story_highlight_delete(uuid), story_moderate(uuid, text) from public, anon;
grant execute on function story_create(text, text, uuid, jsonb), story_delete(uuid), story_mark_seen(uuid[]), story_counts(uuid[]), story_viewers(uuid),
  story_highlight_save(uuid, text, uuid[], uuid), story_highlight_add(uuid, uuid), story_highlight_delete(uuid), story_moderate(uuid, text) to authenticated;

-- ---------- files: a private bucket; members upload to their own folder ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', false, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create function story_object_ok(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select (auth.uid() is not null and split_part(p_name, '/', 1) = auth.uid()::text)
    or exists (select 1 from story_items i where (i.path = p_name or i.poster_path = p_name) and not i.purged and story_media_ok(i.story_id));
$$;
create policy "story files read" on storage.objects for select to anon, authenticated using (bucket_id = 'stories' and story_object_ok(name));
create policy "story files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "story files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from story_items i join stories s on s.id = i.story_id where (i.path = name or i.poster_path = name) and s.status in ('published', 'pending')));
