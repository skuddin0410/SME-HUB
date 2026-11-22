-- V2 Phase 3: feed.
-- Post titles and covers, six reactions, threaded comments, quote posts, polls, scheduled posts with a
-- publishing job that is safe to run twice, an edit window, profile pinning. Rules live here so every screen follows them.
-- The old reaction names (like, celebrate, love) are kept as they are, so the existing site keeps working on the same database.

-- ---------- posts ----------
alter table posts
  add column title text not null default '' check (char_length(title) <= 120),
  add column cover_url text,
  add column edited_at timestamptz,
  add column status text not null default 'published' check (status in ('published', 'scheduled')),
  add column scheduled_at timestamptz,
  add column comments_closed boolean not null default false,
  add column profile_pinned boolean not null default false,
  add column quoted_post_id uuid references posts (id) on delete set null;
create unique index posts_one_profile_pin on posts (author_id) where profile_pinned;
create index posts_feed_cursor on posts (created_at desc, id desc) where status = 'published';
create index posts_due on posts (scheduled_at) where status = 'scheduled';
create index posts_quoted on posts (quoted_post_id) where quoted_post_id is not null;
-- a cover, like a picture, must be in our own storage (same rule as posts.image_url)
alter table posts add constraint posts_cover_url_ours check (
  cover_url is null
  or cover_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
  or cover_url like 'https://picsum.photos/seed/%'
  or (is_sample and cover_url like '/sample/%')
);

-- how long after posting the words can still be changed
create function edit_window() returns interval language sql immutable as $$ select interval '10 minutes' $$;

create function post_rules() returns trigger
language plpgsql set search_path = public as $$
declare staff boolean := auth.uid() is not null and is_staff();
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not staff then new.created_at := now(); end if;
    new.edited_at := null; new.profile_pinned := false; new.comments_closed := coalesce(new.comments_closed, false);
    if new.scheduled_at is not null then
      if new.scheduled_at < app_now() + interval '1 minute' or new.scheduled_at > app_now() + interval '90 days' then
        raise exception 'schedule a post between 1 minute and 90 days from now';
      end if;
      new.status := 'scheduled';
    else
      new.status := 'published';
    end if;
    if new.quoted_post_id is not null and not exists (select 1 from posts where id = new.quoted_post_id and status = 'published') then
      raise exception 'that post is not available to quote';
    end if;
    return new;
  end if;

  -- updates: some things never change
  new.author_id := old.author_id; new.group_id := old.group_id; new.created_at := old.created_at; new.quoted_post_id := old.quoted_post_id;
  if auth.uid() is null or staff then return new; end if; -- the publishing job and the team

  if old.status = 'scheduled' then
    if new.scheduled_at is null then
      new.status := 'published'; new.created_at := app_now(); -- publish now
    else
      if new.scheduled_at < app_now() + interval '1 minute' or new.scheduled_at > app_now() + interval '90 days' then
        raise exception 'schedule a post between 1 minute and 90 days from now';
      end if;
      new.status := 'scheduled';
    end if;
    new.profile_pinned := false;
  else
    new.status := 'published'; new.scheduled_at := old.scheduled_at;
    if (new.body, new.title, new.cover_url, new.image_url, new.kind) is distinct from (old.body, old.title, old.cover_url, old.image_url, old.kind) then
      if app_now() - old.created_at > edit_window() then raise exception 'the edit window has closed'; end if;
      new.edited_at := app_now();
    end if;
  end if;
  return new;
end $$;
create trigger posts_rules before insert or update on posts for each row execute function post_rules();

-- scheduled posts are private to their author until published
drop policy "posts readable" on posts;
create policy "posts readable" on posts for select using (
  is_staff()
  or author_id = auth.uid()
  or (
    status = 'published'
    and not has_blocked(author_id)
    and (group_id is null or not is_private_group(group_id) or is_group_member(group_id))
    and (
      visibility = 'public'
      or (visibility = 'members' and auth.uid() is not null)
      or (visibility = 'connections' and is_connected(author_id))
    )
  )
);

-- ---------- six reactions ----------
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'reactions'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%';
  if c is not null then execute format('alter table reactions drop constraint %I', c); end if;
end $$;
alter table reactions add constraint reactions_kind_check check (kind in ('like', 'celebrate', 'support', 'love', 'insight', 'funny'));

-- ---------- threaded comments ----------
alter table comments add column parent_id uuid references comments (id) on delete cascade, add column edited_at timestamptz;
create index comments_parent on comments (parent_id) where parent_id is not null;

create function comment_edit_window() returns interval language sql immutable as $$ select interval '10 minutes' $$;

create function comment_rules() returns trigger
language plpgsql set search_path = public as $$
declare staff boolean := auth.uid() is not null and is_staff();
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not staff then new.created_at := now(); end if;
    new.edited_at := null;
    if exists (select 1 from posts where id = new.post_id and comments_closed) and not staff then
      raise exception 'comments are closed on this post';
    end if;
    -- one level of replies: a reply must sit under a top-level comment of the same post
    if new.parent_id is not null and not exists (select 1 from comments c where c.id = new.parent_id and c.post_id = new.post_id and c.parent_id is null) then
      raise exception 'replies go under a top-level comment on the same post';
    end if;
    return new;
  end if;
  new.post_id := old.post_id; new.author_id := old.author_id; new.parent_id := old.parent_id; new.created_at := old.created_at;
  if new.body is distinct from old.body then
    if not staff and app_now() - old.created_at > comment_edit_window() then raise exception 'the edit window has closed'; end if;
    new.edited_at := app_now();
  end if;
  return new;
end $$;
create trigger comments_rules before insert or update on comments for each row execute function comment_rules();
create policy "comments edit own" on comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ---------- polls ----------
create table polls (
  post_id uuid primary key references posts (id) on delete cascade,
  closes_at timestamptz not null
);
create table poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  position int not null,
  votes int not null default 0,
  unique (post_id, position)
);
create table poll_votes (
  post_id uuid not null references posts (id) on delete cascade,
  option_id uuid not null references poll_options (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
create policy "polls follow the post" on polls for select using (exists (select 1 from posts p where p.id = post_id));
create policy "poll options follow the post" on poll_options for select using (exists (select 1 from posts p where p.id = post_id));
-- votes are anonymous: each member sees only their own
create policy "my poll vote" on poll_votes for select to authenticated using (user_id = auth.uid());
create policy "vote once" on poll_votes for insert to authenticated
  with check (user_id = auth.uid() and is_active() and exists (select 1 from posts p where p.id = post_id));
grant select on polls, poll_options to anon, authenticated;
grant select, insert on poll_votes to authenticated;

-- creating a poll: 2 to 10 options, closing 1 hour to 30 days from now, only on your own post
create function add_poll(p_post uuid, p_options text[], p_closes timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare labels text[]; i int;
begin
  if auth.uid() is null or not is_active() then raise exception 'sign in first'; end if;
  if not exists (select 1 from posts where id = p_post and author_id = auth.uid()) then raise exception 'you can only add a poll to your own post'; end if;
  if exists (select 1 from polls where post_id = p_post) then raise exception 'this post already has a poll'; end if;
  select array_agg(trim(o)) into labels from unnest(p_options) o where trim(o) <> '';
  if coalesce(cardinality(labels), 0) < 2 or cardinality(labels) > 10 then raise exception 'a poll needs 2 to 10 options'; end if;
  if exists (select 1 from unnest(labels) l where char_length(l) > 80) then raise exception 'each option can be up to 80 characters'; end if;
  if p_closes < app_now() + interval '1 hour' or p_closes > app_now() + interval '30 days' then raise exception 'a poll closes between 1 hour and 30 days from now'; end if;
  insert into polls (post_id, closes_at) values (p_post, p_closes);
  for i in 1..cardinality(labels) loop insert into poll_options (post_id, label, position) values (p_post, labels[i], i); end loop;
end $$;
revoke execute on function add_poll(uuid, text[], timestamptz) from public, anon;
grant execute on function add_poll(uuid, text[], timestamptz) to authenticated;

create function count_poll_vote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from polls where post_id = new.post_id and closes_at > app_now()) then raise exception 'this poll is closed'; end if;
  if not exists (select 1 from poll_options where id = new.option_id and post_id = new.post_id) then raise exception 'that option is not in this poll'; end if;
  update poll_options set votes = votes + 1 where id = new.option_id;
  return new;
end $$;
revoke execute on function count_poll_vote() from public, anon, authenticated;
create trigger poll_votes_count after insert on poll_votes for each row execute function count_poll_vote();

-- ---------- scheduled posts ----------
-- Publishes every post whose time has come. Safe to run any number of times, even at once:
-- rows are claimed with skip locked and only ever move from scheduled to published.
create function publish_due_posts() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with due as (
    select id from posts where status = 'scheduled' and scheduled_at <= app_now() order by scheduled_at, id limit 500 for update skip locked
  )
  update posts p set status = 'published', created_at = app_now() from due where p.id = due.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function publish_due_posts() from public, anon, authenticated;

-- run it every minute where the database has the scheduler (Supabase does; a plain test database does not)
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('publish-due-posts', '* * * * *', 'select public.publish_due_posts()');
  end if;
exception when others then
  raise notice 'pg_cron not set up: %', sqlerrm;
end $$;
