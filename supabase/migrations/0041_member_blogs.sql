-- Member blogs: posts written by members, read by anyone. Who may write and which posts need approval come from the team's
-- Member blog settings (hub_settings key 'blogs'); the database enforces both so nothing depends on the screen.
create table member_blogs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  cat text not null default '' check (char_length(cat) <= 60),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  image_url text,
  blocks jsonb not null default '[]' check (jsonb_typeof(blocks) = 'array' and pg_column_size(blocks) < 60000),
  status text not null default 'draft' check (status in ('draft', 'review', 'scheduled', 'published', 'sent_back')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index member_blogs_author on member_blogs (author_id, created_at desc);
create index member_blogs_live on member_blogs (published_at desc) where status in ('published', 'scheduled');
alter table member_blogs enable row level security;

-- readable by anyone once live (a scheduled post is live from its time); authors see their own; the team sees all
create policy "blogs live" on member_blogs for select to anon, authenticated
  using (status = 'published' or (status = 'scheduled' and scheduled_at <= now()));
create policy "blogs own" on member_blogs for select to authenticated using (author_id = auth.uid());
create policy "blogs staff" on member_blogs for select to authenticated using (is_staff());
create policy "blogs write own" on member_blogs for insert to authenticated with check (author_id = auth.uid() and is_active());
create policy "blogs edit own" on member_blogs for update to authenticated using (author_id = auth.uid() and is_active()) with check (author_id = auth.uid());
create policy "blogs edit staff" on member_blogs for update to authenticated using (is_staff()) with check (is_staff());
create policy "blogs delete own" on member_blogs for delete to authenticated using (author_id = auth.uid() or is_staff());
revoke all on member_blogs from anon, authenticated;
grant select on member_blogs to anon, authenticated;
grant insert, update, delete on member_blogs to authenticated;

-- the rules: who may write, which posts wait for the team, and the times that go with each status
create function mb_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare
  s jsonb := coalesce((select value from hub_settings where key = 'blogs'), '{}');
  who text := coalesce(s ->> 'who', 'all');
  approve text := coalesce(s ->> 'approve', 'free');
  plan text;
  staff boolean := is_staff();
begin
  if tg_op = 'UPDATE' then new.author_id := old.author_id; end if;
  new.updated_at := now();
  if not staff then
    select p.plan into plan from profiles p where p.id = new.author_id;
    if who = 'advisor' and plan is distinct from 'advisor' then raise exception 'blogs.who: only advisors can write posts'; end if;
    if who = 'paid' and plan not in ('plus', 'advisor') then raise exception 'blogs.who: posts are for paid members'; end if;
    -- a member cannot publish around the team: posts that need approval go to review first
    if new.status in ('published', 'scheduled') and (approve = 'all' or (approve = 'free' and plan = 'free')) then
      if tg_op = 'INSERT' or old.status is distinct from new.status then new.status := 'review'; end if;
    end if;
    if tg_op = 'UPDATE' and old.status in ('review', 'sent_back') and new.status in ('published', 'scheduled') then new.status := 'review'; end if;
  end if;
  if new.status = 'scheduled' and new.scheduled_at is null then new.status := 'draft'; end if;
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  if new.status = 'scheduled' and new.published_at is null then new.published_at := new.scheduled_at; end if;
  return new;
end $$;
create trigger mb_guard before insert or update on member_blogs for each row execute function mb_guard();
revoke execute on function mb_guard() from public, anon, authenticated;
