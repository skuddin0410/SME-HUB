-- Update 10: up to 10 photos and 1 video in a post.
-- image_url stays the first photo, so every place that already shows a post's picture keeps working.

alter table posts add column if not exists images text[] not null default '{}';
alter table posts add column if not exists video_url text;
alter table posts add column if not exists video_poster text;

-- every photo is in our own storage, like posts.image_url; 10 at most
create or replace function public.post_images_ok(imgs text[]) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(cardinality(imgs), 0) <= 10 and not exists (
    select 1 from unnest(imgs) u
    where u is null or u not like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
  )
$$;
alter table posts add constraint posts_images_ours check (post_images_ok(images));
alter table posts add constraint posts_video_ours check (
  video_url is null or video_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/post-videos/%'
);
alter table posts add constraint posts_video_poster_ours check (
  video_poster is null or video_poster like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
);

-- photos and the video are set when the post is made; after that only a scheduled post can change them
create or replace function public.protect_post_media() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.status <> 'scheduled' and (new.images, new.video_url, new.video_poster) is distinct from (old.images, old.video_url, old.video_poster) then
    raise exception 'photos and video cannot be changed after posting';
  end if;
  return new;
end $$;
create trigger protect_post_media before update on posts for each row execute function protect_post_media();
revoke execute on function protect_post_media() from public, anon, authenticated;

-- videos: their own public bucket, MP4 or MOV, up to 500 MB, each member uploads to their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-videos', 'post-videos', true, 524288000, array['video/mp4', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "post videos public read" on storage.objects for select using (bucket_id = 'post-videos');
create policy "post videos upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post videos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text);
