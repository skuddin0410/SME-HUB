-- SME Hub core schema: profiles, feed, connections, groups, companies,
-- notifications, moderation. Every table has row level security on.

create type post_visibility as enum ('public', 'members', 'connections', 'private');

-- ---------- tables ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  headline text not null default '',
  bio text not null default '',
  location text not null default '',
  website text not null default '',
  avatar_url text,
  member_type text not null default 'owner' check (member_type in ('owner', 'plus', 'elite', 'advisor')),
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  is_private boolean not null default false,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on group_members (user_id);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  group_id uuid references groups (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  image_url text,
  visibility post_visibility not null default 'public',
  created_at timestamptz not null default now()
);
create index on posts (created_at desc);
create index on posts (author_id, created_at desc);
create index on posts (group_id, created_at desc);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on comments (post_id, created_at);

create table reactions (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table connections (
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
-- one row per pair, whichever side asked first
create unique index connections_pair on connections
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index on connections (addressee_id);

create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  slug text not null unique,
  name text not null,
  category text not null default '',
  description text not null default '',
  website text not null default '',
  logo_url text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  actor_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'connection_request', 'connection_accepted')),
  post_id uuid references posts (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  post_id uuid references posts (id) on delete cascade,
  profile_id uuid references profiles (id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  check (post_id is not null or profile_id is not null)
);

create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- ---------- helper functions (run as owner so policies can call them safely) ----------
create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin'));
$$;

create function is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active');
$$;

create function is_connected(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from connections
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = other)
        or (addressee_id = auth.uid() and requester_id = other))
  );
$$;

create function is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create function is_private_group(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_private from groups where id = gid), false);
$$;

create function has_blocked(author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where blocker_id = auth.uid() and blocked_id = author);
$$;

-- ---------- triggers ----------
-- profile row for every new signup
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- members cannot change their own role, plan or status
create function protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then
    new.role := old.role;
    new.member_type := old.member_type;
    new.status := old.status;
  end if;
  return new;
end $$;
create trigger protect_profile_fields before update on profiles
  for each row execute function protect_profile_fields();

-- anti-spam: at most 10 posts per hour per member
create function limit_post_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from posts where author_id = new.author_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Posting limit reached. Please try again later.';
  end if;
  return new;
end $$;
create trigger limit_post_rate before insert on posts
  for each row execute function limit_post_rate();

-- group creator becomes its first admin
create function add_group_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, user_id, role) values (new.id, new.created_by, 'admin');
  return new;
end $$;
create trigger add_group_creator after insert on groups
  for each row execute function add_group_creator();

-- notifications
create function notify_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from posts where id = new.post_id;
  if owner <> new.user_id then
    insert into notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end $$;
create trigger notify_reaction after insert on reactions
  for each row execute function notify_reaction();

create function notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from posts where id = new.post_id;
  if owner <> new.author_id then
    insert into notifications (user_id, actor_id, type, post_id) values (owner, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end $$;
create trigger notify_comment after insert on comments
  for each row execute function notify_comment();

create function notify_connection() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, actor_id, type) values (new.addressee_id, new.requester_id, 'connection_request');
  elsif new.status = 'accepted' and old.status = 'pending' then
    insert into notifications (user_id, actor_id, type) values (new.requester_id, new.addressee_id, 'connection_accepted');
  end if;
  return new;
end $$;
create trigger notify_connection after insert or update on connections
  for each row execute function notify_connection();

-- ---------- row level security ----------
alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table reactions enable row level security;
alter table connections enable row level security;
alter table companies enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table blocks enable row level security;

create policy "profiles readable" on profiles for select
  using (status = 'active' or id = auth.uid() or is_staff());
create policy "profiles self update" on profiles for update
  using (id = auth.uid() or is_staff()) with check (id = auth.uid() or is_staff());

create policy "groups readable" on groups for select using (true);
create policy "groups create" on groups for insert to authenticated
  with check (created_by = auth.uid() and is_active());
create policy "groups manage" on groups for update to authenticated
  using (created_by = auth.uid() or is_staff());
create policy "groups delete" on groups for delete to authenticated
  using (created_by = auth.uid() or is_staff());

create policy "memberships readable" on group_members for select to authenticated using (true);
create policy "join public groups" on group_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member' and not is_private_group(group_id));
create policy "leave groups" on group_members for delete to authenticated
  using (user_id = auth.uid() or is_staff());

create policy "posts readable" on posts for select using (
  is_staff()
  or author_id = auth.uid()
  or (
    not has_blocked(author_id)
    and (group_id is null or not is_private_group(group_id) or is_group_member(group_id))
    and (
      visibility = 'public'
      or (visibility = 'members' and auth.uid() is not null)
      or (visibility = 'connections' and is_connected(author_id))
    )
  )
);
create policy "posts create" on posts for insert to authenticated
  with check (author_id = auth.uid() and is_active() and (group_id is null or is_group_member(group_id)));
create policy "posts edit own" on posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "posts delete" on posts for delete to authenticated
  using (author_id = auth.uid() or is_staff());

-- comments and likes follow the post: if you can see the post you can see and add them
create policy "comments readable" on comments for select
  using (exists (select 1 from posts p where p.id = post_id));
create policy "comments create" on comments for insert to authenticated
  with check (author_id = auth.uid() and is_active() and exists (select 1 from posts p where p.id = post_id));
create policy "comments delete" on comments for delete to authenticated
  using (author_id = auth.uid() or is_staff());

create policy "reactions readable" on reactions for select
  using (exists (select 1 from posts p where p.id = post_id));
create policy "reactions create" on reactions for insert to authenticated
  with check (user_id = auth.uid() and is_active() and exists (select 1 from posts p where p.id = post_id));
create policy "reactions delete" on reactions for delete to authenticated
  using (user_id = auth.uid());

create policy "connections readable" on connections for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "connections request" on connections for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and is_active());
create policy "connections accept" on connections for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid() and status = 'accepted');
create policy "connections remove" on connections for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "companies readable" on companies for select using (true);
create policy "companies create" on companies for insert to authenticated
  with check (owner_id = auth.uid() and is_active());
create policy "companies manage" on companies for update to authenticated
  using (owner_id = auth.uid() or is_staff()) with check (owner_id = auth.uid() or is_staff());
create policy "companies delete" on companies for delete to authenticated
  using (owner_id = auth.uid() or is_staff());

create policy "notifications own" on notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications mark read" on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reports create" on reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports staff read" on reports for select to authenticated using (is_staff());
create policy "reports staff resolve" on reports for update to authenticated using (is_staff());

create policy "blocks own read" on blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks own create" on blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks own delete" on blocks for delete to authenticated using (blocker_id = auth.uid());

-- ---------- image storage ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
