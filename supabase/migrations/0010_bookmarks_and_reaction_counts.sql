-- Saved posts (bookmarks). Private to each member: only the owner can see, add or remove them.
create table saved_posts (
  user_id uuid not null references profiles (id) on delete cascade,
  post_id uuid not null references posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index saved_posts_user_recent on saved_posts (user_id, created_at desc);
alter table saved_posts enable row level security;
create policy "saved posts read own" on saved_posts for select to authenticated using (user_id = auth.uid());
create policy "saved posts add own" on saved_posts for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from posts p where p.id = post_id));
create policy "saved posts remove own" on saved_posts for delete to authenticated using (user_id = auth.uid());

-- The action bar now shows a count for each reaction (Helpful, Insightful, Celebrate) and
-- whether the viewer saved the post. Same rights as before: only posts the caller can see.
drop function post_extras(uuid[]);
create function post_extras(ids uuid[])
returns table (post_id uuid, kinds text[], my_kind text, reposts int, reposted boolean, counts jsonb, saved boolean)
language sql stable set search_path = public as $$
  select p.id,
    coalesce((select array_agg(distinct r.kind) from reactions r where r.post_id = p.id), '{}'),
    (select r.kind from reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    (select count(*)::int from reposts s where s.post_id = p.id),
    exists (select 1 from reposts s where s.post_id = p.id and s.user_id = auth.uid()),
    coalesce((select jsonb_object_agg(k.kind, k.n) from (select r.kind, count(*)::int as n from reactions r where r.post_id = p.id group by r.kind) k), '{}'::jsonb),
    exists (select 1 from saved_posts v where v.post_id = p.id and v.user_id = auth.uid())
  from posts p where p.id = any (ids)
$$;
grant execute on function post_extras(uuid[]) to anon, authenticated;
