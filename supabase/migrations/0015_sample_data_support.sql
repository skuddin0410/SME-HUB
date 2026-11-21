-- Sample data support (Phase 0): the handoff's sample members, groups, posts and comments are
-- flagged so they can all be removed before launch (supabase/seed/remove_sample.sql).

alter table groups add column if not exists is_sample boolean not null default false;
alter table posts add column if not exists is_sample boolean not null default false;
alter table comments add column if not exists is_sample boolean not null default false;

-- only the seed (a direct database session) can mark something as sample
create function keep_sample_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.is_sample := case when tg_op = 'UPDATE' then old.is_sample else false end;
  end if;
  return new;
end $$;
create trigger keep_sample_flag before insert or update on groups for each row execute function keep_sample_flag();
create trigger keep_sample_flag before insert or update on posts for each row execute function keep_sample_flag();
create trigger keep_sample_flag before insert or update on comments for each row execute function keep_sample_flag();
revoke execute on function keep_sample_flag() from public, anon, authenticated;

-- the handoff's Intro post kind
alter table posts drop constraint if exists posts_kind_check;
alter table posts add constraint posts_kind_check check (kind in ('update', 'question', 'win', 'offer', 'hiring', 'intro'));

-- sample photos ship with the site under /sample/ and are allowed on sample rows only
alter table profiles drop constraint if exists profiles_avatar_is_ours;
alter table profiles add constraint profiles_avatar_is_ours check (
  avatar_url is null
  or avatar_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
  or (is_sample and avatar_url like '/sample/%')
) not valid;
alter table posts drop constraint if exists posts_image_is_ours;
alter table posts add constraint posts_image_is_ours check (
  image_url is null
  or image_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
  or image_url like 'https://picsum.photos/seed/%'
  or (is_sample and image_url like '/sample/%')
) not valid;
