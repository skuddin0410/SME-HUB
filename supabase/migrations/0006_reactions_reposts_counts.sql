-- Reaction kinds (like, celebrate, love), reposts, and a public connection count for profile pages.

alter table reactions add column kind text not null default 'like' check (kind in ('like', 'celebrate', 'love'));
create policy "reactions change" on reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_active());

create table reposts (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index on reposts (user_id);
alter table reposts enable row level security;
create policy "reposts readable" on reposts for select
  using (exists (select 1 from posts p where p.id = post_id));
create policy "reposts create" on reposts for insert to authenticated
  with check (user_id = auth.uid() and is_active() and exists (select 1 from posts p where p.id = post_id));
create policy "reposts delete" on reposts for delete to authenticated
  using (user_id = auth.uid());
grant select on reposts to anon, authenticated;
grant insert, delete on reposts to authenticated;
create trigger rate_reposts before insert on reposts for each row execute function enforce_rate('user_id', '60', '1 day');

-- Everything the post action bar needs beyond the like and comment counts, in one call.
-- Runs with the caller's rights, so it only answers about posts the caller can see.
create function post_extras(ids uuid[])
returns table (post_id uuid, kinds text[], my_kind text, reposts int, reposted boolean)
language sql stable set search_path = public as $$
  select p.id,
    coalesce((select array_agg(distinct r.kind) from reactions r where r.post_id = p.id), '{}'),
    (select r.kind from reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    (select count(*)::int from reposts s where s.post_id = p.id),
    exists (select 1 from reposts s where s.post_id = p.id and s.user_id = auth.uid())
  from posts p where p.id = any (ids)
$$;
grant execute on function post_extras(uuid[]) to anon, authenticated;

-- Connections are private rows; a profile page only needs the number.
create function connection_count(member uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from connections where status = 'accepted' and member in (requester_id, addressee_id)
$$;
revoke execute on function connection_count(uuid) from public;
grant execute on function connection_count(uuid) to anon, authenticated;
