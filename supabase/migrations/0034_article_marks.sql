-- A member's own marks on a blog, news or podcast piece: saved for later, found helpful, found insightful.
create table article_marks (
  user_id uuid not null references profiles (id) on delete cascade,
  item text not null check (item ~ '^(blog|news|podcast)/[a-z0-9-]{1,200}$'),
  kind text not null check (kind in ('saved', 'helpful', 'insightful')),
  created_at timestamptz not null default now(),
  primary key (user_id, item, kind)
);
alter table article_marks enable row level security;
create policy article_marks_own on article_marks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on article_marks from anon;
grant select, insert, delete on article_marks to authenticated;

-- How many members marked a piece helpful or insightful. Only counts leave the table, never who.
create function article_mark_counts(p_item text) returns table (kind text, n bigint)
language sql stable security definer set search_path = public as $$
  select m.kind, count(*) from article_marks m where m.item = p_item and m.kind in ('helpful', 'insightful') group by m.kind;
$$;
revoke all on function article_mark_counts(text) from public;
grant execute on function article_mark_counts(text) to anon, authenticated;
