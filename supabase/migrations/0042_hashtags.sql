-- Hashtags: the tags in posts are found from the post text, so nothing is stored twice. Members can follow a tag.
-- Merging, removing and blocking tags is the team's call and lives in the Hashtag settings (hub_settings key 'hashtags').
create table hashtag_follows (
  user_id uuid not null references profiles (id) on delete cascade,
  tag text not null check (tag = lower(tag) and char_length(tag) between 2 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);
create index hashtag_follows_tag on hashtag_follows (tag);
alter table hashtag_follows enable row level security;
create policy "follows own" on hashtag_follows for select to authenticated using (user_id = auth.uid());
create policy "follow add" on hashtag_follows for insert to authenticated with check (user_id = auth.uid() and is_active());
create policy "follow remove" on hashtag_follows for delete to authenticated using (user_id = auth.uid());
revoke all on hashtag_follows from anon, authenticated;
grant select, insert, delete on hashtag_follows to authenticated;

-- how many people follow each tag (counts only, so who follows stays private)
create function hashtag_followers() returns table (tag text, followers bigint)
language sql stable security definer set search_path = public as $$
  select tag, count(*) from hashtag_follows group by tag;
$$;
revoke all on function hashtag_followers() from public;
grant execute on function hashtag_followers() to anon, authenticated;

-- every tag used in posts (and comments when asked) that the caller is allowed to see; runs as the caller so visibility rules apply
create function hashtag_usage(with_comments boolean default false, fresh_days int default 7)
returns table (tag text, uses bigint, fresh bigint, people bigint, last_used timestamptz)
language sql stable security invoker set search_path = public as $$
  with src as (
    select author_id, body, created_at from posts
    union all
    select author_id, body, created_at from comments where with_comments
  ), found as (
    select distinct s.author_id, s.created_at, s.body, lower(m[1]) as tag
    from src s, regexp_matches(s.body, '#([A-Za-zÀ-ſ][A-Za-z0-9_À-ſ]*)', 'g') as m
  )
  select tag, count(*)::bigint, count(*) filter (where created_at > now() - make_interval(days => fresh_days))::bigint,
         count(distinct author_id)::bigint, max(created_at)
  from found group by tag;
$$;
revoke all on function hashtag_usage(boolean, int) from public;
grant execute on function hashtag_usage(boolean, int) to anon, authenticated;
