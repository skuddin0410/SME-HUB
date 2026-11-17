-- Open browsing: visitors can see group member counts.
alter policy "memberships readable" on group_members to public;

-- Admin tools: pin a post to the top of the feed.
alter table posts add column if not exists pinned_at timestamptz;
create index if not exists posts_pinned_idx on posts (pinned_at desc nulls last, created_at desc);
create policy "posts staff update" on posts for update to authenticated using (is_staff()) with check (is_staff());

-- Post kinds: what the author wants from the community.
alter table posts add column if not exists kind text not null default 'update'
  check (kind in ('update', 'question', 'win', 'offer', 'hiring'));
create index if not exists posts_kind_idx on posts (kind, created_at desc);

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- only staff can pin
create function protect_post_pin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then
    if tg_op = 'INSERT' then new.pinned_at := null; else new.pinned_at := old.pinned_at; end if;
  end if;
  return new;
end $$;
create trigger protect_post_pin before insert or update on posts
  for each row execute function protect_post_pin();

-- moderators can change plan and status; only admins can change roles
create or replace function protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not is_staff() then
      new.member_type := old.member_type;
      new.status := old.status;
    end if;
    if not is_admin() then
      new.role := old.role;
    end if;
  end if;
  return new;
end $$;

revoke execute on function protect_post_pin(), protect_profile_fields() from public, anon, authenticated;
