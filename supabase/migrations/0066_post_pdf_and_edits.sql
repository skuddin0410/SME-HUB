-- Updates 26 and 27: a PDF in a post (read inside the post), and fuller post editing.
--
-- PDFs live in a private bucket. A member may read a post's PDF only while they may read the post itself, so a
-- hidden, removed or private post hides its PDF too. The hub serves PDFs through /api/post-pdf/<post id>, with the
-- original file name.

-- 1. The PDF on a post: where it is stored, its original name, its size and (when known) its page count
alter table posts add column if not exists pdf_path text;
alter table posts add column if not exists pdf_name text;
alter table posts add column if not exists pdf_size integer;
alter table posts add column if not exists pdf_pages integer;
alter table posts drop constraint if exists posts_pdf_ok;
alter table posts add constraint posts_pdf_ok check (
  (pdf_path is null and pdf_name is null and pdf_size is null and pdf_pages is null)
  or (
    pdf_path ~ '^[0-9a-f-]{36}/pdf-[0-9a-f-]{36}\.pdf$'
    and char_length(pdf_name) between 5 and 200 and pdf_name ~* '\.pdf$'
    and pdf_size between 1 and 26214400
    and (pdf_pages is null or pdf_pages between 1 and 5000)
  )
);
-- the PDF must be in the author's own folder
create or replace function public.post_pdf_own() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.pdf_path is not null and split_part(new.pdf_path, '/', 1) <> new.author_id::text then
    raise exception 'that PDF is not yours';
  end if;
  return new;
end $$;
drop trigger if exists post_pdf_own on posts;
create trigger post_pdf_own before insert or update of pdf_path on posts for each row execute function post_pdf_own();
revoke execute on function public.post_pdf_own() from public, anon, authenticated;

-- 2. A post needs words, or a photo, a video or a PDF (a PDF on its own is a fine post)
alter table posts drop constraint if exists posts_body_check;
alter table posts drop constraint if exists posts_body_or_media;
alter table posts add constraint posts_body_or_media check (
  char_length(body) <= 5000
  and (char_length(btrim(body)) > 0 or coalesce(cardinality(images), 0) > 0 or video_url is not null or pdf_path is not null)
);

-- 3. The bucket: private, PDFs only, up to 25 MB; members upload to their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-pdfs', 'post-pdfs', false, 26214400, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "post pdfs upload to own folder" on storage.objects;
create policy "post pdfs upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "post pdfs delete own" on storage.objects;
create policy "post pdfs delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'post-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
-- read: your own uploads (so the post window can show them), or the PDF of a post you can read
-- (the posts table's own rules decide that, so hidden and removed posts hide their PDF too)
drop policy if exists "post pdfs read with the post" on storage.objects;
create policy "post pdfs read with the post" on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-pdfs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.posts p where p.pdf_path = storage.objects.name)
  ));

-- 4. Editing: photos and the PDF can change after posting (inside the edit window), the video still cannot.
--    Any change to them marks the post "Edited", like a change to its words.
create or replace function public.protect_post_media() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.status <> 'scheduled' and (new.video_url, new.video_poster) is distinct from (old.video_url, old.video_poster) then
    raise exception 'the video cannot be changed after posting';
  end if;
  if old.status <> 'scheduled' and (new.images, new.pdf_path, new.pdf_name) is distinct from (old.images, old.pdf_path, old.pdf_name) then
    if not is_staff() and app_now() - old.created_at > edit_window() then raise exception 'the edit window has closed'; end if;
    new.edited_at := app_now();
  end if;
  return new;
end $$;
revoke execute on function public.protect_post_media() from public, anon, authenticated;

-- 5. The edit limit now defaults to Forever (the team can still choose 10 minutes, an hour or off in Feed settings)
create or replace function public._edit_window(k text) returns interval
language sql stable security definer set search_path = public as $$
  select case coalesce((select value ->> k from public.hub_settings where key = 'feed'), case when k = 'edit' then 'forever' else '10' end)
    when '0' then interval '0 minutes'
    when 'forever' then interval '100 years'
    when '60' then interval '60 minutes'
    else interval '10 minutes' end
$$;
revoke all on function public._edit_window(text) from public, anon, authenticated;

-- 6. Every edit keeps the version before it, for moderation: who changed what, and when. Only the team reads it.
create table if not exists public.post_edits (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  editor_id uuid references public.profiles (id) on delete set null,
  edited_at timestamptz not null default now(),
  old_kind text,
  old_title text,
  old_body text,
  old_images text[],
  old_pdf_name text,
  old_pdf_path text
);
create index if not exists post_edits_post on public.post_edits (post_id, edited_at desc);
alter table public.post_edits enable row level security;
drop policy if exists "post edits for the team" on public.post_edits;
create policy "post edits for the team" on public.post_edits for select to authenticated using (is_staff());
revoke insert, update, delete on public.post_edits from anon, authenticated;

create or replace function public.keep_post_edit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.edited_at is distinct from old.edited_at and new.edited_at is not null then
    insert into public.post_edits (post_id, editor_id, old_kind, old_title, old_body, old_images, old_pdf_name, old_pdf_path)
    values (old.id, auth.uid(), old.kind, old.title, old.body, old.images, old.pdf_name, old.pdf_path);
  end if;
  return new;
end $$;
drop trigger if exists keep_post_edit on posts;
create trigger keep_post_edit after update on posts for each row execute function keep_post_edit();
revoke execute on function public.keep_post_edit() from public, anon, authenticated;
