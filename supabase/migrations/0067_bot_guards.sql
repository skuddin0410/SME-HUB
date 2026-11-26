-- Bot and spam guards (security review, Nov 2026).
-- Every guard here lives in the database, so it holds however a request arrives: through the app,
-- through a server action called by a script, or straight against the Supabase API with a member's token.
-- Staff, and the database itself (cron, imports, SQL run by the team, where auth.uid() is null), are never limited.

-- 1. A member can only write once their email address is confirmed.
--    Supabase already refuses to sign in unconfirmed accounts; this keeps that true even if the
--    dashboard setting were ever switched off.
create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.status = 'active' and u.email_confirmed_at is not null
  );
$$;

-- 2. Posting guards. Runs after posts_rules (triggers fire in name order), so status is already set.
create or replace function public.post_spam_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_joined timestamptz;
  v_norm text;
begin
  if v_uid is null or is_staff() then return new; end if;

  -- scheduled posts: at most 10 waiting at a time
  if new.status = 'scheduled'
     and (select count(*) from posts where author_id = new.author_id and status = 'scheduled') >= 10 then
    raise exception 'You can have up to 10 scheduled posts waiting. Publish or cancel one first.';
  end if;

  -- brand-new accounts: 3 posts an hour for their first day (the usual limit is 10)
  select created_at into v_joined from auth.users where id = new.author_id;
  if v_joined > now() - interval '24 hours'
     and (select count(*) from posts where author_id = new.author_id and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'New accounts can share 3 posts an hour for their first day. Please try again later.';
  end if;

  -- the same text again: a copy of a post from the last day, by anyone, is refused (short posts are left alone)
  v_norm := lower(regexp_replace(btrim(coalesce(new.body, '')), '\s+', ' ', 'g'));
  if char_length(v_norm) >= 40 and exists (
    select 1 from posts
    where created_at > now() - interval '24 hours'
      and md5(lower(regexp_replace(btrim(body), '\s+', ' ', 'g'))) = md5(v_norm)
  ) then
    raise exception 'This post is a copy of one shared recently. Write something new.';
  end if;
  return new;
end $$;

drop trigger if exists posts_spam_guard on public.posts;
create trigger posts_spam_guard before insert on public.posts
  for each row execute function public.post_spam_guard();

-- 3. Comments: brand-new accounts get 10 comments an hour on their first day, and the same long comment
--    cannot be pasted again within a day.
create or replace function public.comment_spam_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_joined timestamptz;
  v_norm text;
begin
  if v_uid is null or is_staff() then return new; end if;
  select created_at into v_joined from auth.users where id = new.author_id;
  if v_joined > now() - interval '24 hours'
     and (select count(*) from comments where author_id = new.author_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'New accounts can add 10 comments an hour for their first day. Please try again later.';
  end if;
  v_norm := lower(regexp_replace(btrim(coalesce(new.body, '')), '\s+', ' ', 'g'));
  if char_length(v_norm) >= 40 and exists (
    select 1 from comments
    where created_at > now() - interval '24 hours'
      and md5(lower(regexp_replace(btrim(body), '\s+', ' ', 'g'))) = md5(v_norm)
  ) then
    raise exception 'This comment is a copy of one shared recently. Write something new.';
  end if;
  return new;
end $$;

drop trigger if exists comments_spam_guard on public.comments;
create trigger comments_spam_guard before insert on public.comments
  for each row execute function public.comment_spam_guard();

-- 4. Joining groups: at most 20 a day, so one account cannot spread into every group at once.
create or replace function public.group_join_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_staff() then return new; end if;
  if (select count(*) from group_members where user_id = new.user_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'You have joined a lot of groups today. Please try again tomorrow.';
  end if;
  return new;
end $$;

drop trigger if exists group_members_join_guard on public.group_members;
create trigger group_members_join_guard before insert on public.group_members
  for each row execute function public.group_join_guard();

-- 5. Contact form: the form itself is open to visitors, so a script could fill the inbox.
--    The app limits each visitor; this caps the total at 60 an hour whatever the route.
create or replace function public.contact_flood_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from contact_messages where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'We are receiving a lot of messages right now. Please email support@smehub.ca.';
  end if;
  return new;
end $$;

drop trigger if exists contact_messages_flood_guard on public.contact_messages;
create trigger contact_messages_flood_guard before insert on public.contact_messages
  for each row execute function public.contact_flood_guard();

-- 6. Checking "current password" when a member changes it, without signing in again
--    (a fresh sign-in would need a bot check once the CAPTCHA is on). Wrong answers count
--    towards the usual 5-tries lock, which the app records with login_failed.
create or replace function public.verify_my_password(p_password text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((
    select u.encrypted_password = crypt(p_password, u.encrypted_password)
    from auth.users u
    where u.id = auth.uid() and u.encrypted_password is not null and u.encrypted_password <> ''
  ), false);
$$;
revoke all on function public.verify_my_password(text) from public, anon;
grant execute on function public.verify_my_password(text) to authenticated;
