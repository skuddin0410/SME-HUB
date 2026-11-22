-- Phase 5, groups: categories, covers, rules, how people join (open, by request, by invitation),
-- moderators, join requests, archiving, the team's creation rules and a message to all members.

-- ---------- site-wide group settings (one row, edited by admins) ----------
create table group_settings (
  id boolean primary key default true check (id),
  create_private text not null default 'paid' check (create_private in ('paid', 'all', 'off')),
  create_public text not null default 'approval' check (create_public in ('approval', 'all', 'off')),
  priv_join text not null default 'request' check (priv_join in ('request', 'invite')),
  layout text not null default 'grid' check (layout in ('grid', 'list')),
  header text not null default 'side' check (header in ('side', 'top')),
  card jsonb not null default '{"cat": true, "desc": true, "count": true, "act": true, "host": true}',
  head jsonb not null default '{"type": true, "priv": true, "desc": true, "faces": true, "act": true}',
  def_cover text not null default 'nodes' check (def_cover in ('nodes', 'bars', 'awning', 'laptop', 'ship', 'solar', 'truck', 'bakery')),
  msg_all boolean not null default true,
  archive boolean not null default true,
  types text[] not null default array['Topic', 'Industry', 'Community', 'City or region', 'Private circle']
    check (cardinality(types) between 1 and 12)
);
insert into group_settings default values;
alter table group_settings enable row level security;
create policy "group settings readable" on group_settings for select using (true);
create policy "group settings by admins" on group_settings for update to authenticated using (is_admin()) with check (is_admin());
grant select on group_settings to anon, authenticated;
grant update on group_settings to authenticated;

-- ---------- groups ----------
alter table groups
  add column category text not null default 'Topic' check (char_length(category) between 1 and 40),
  add column cover text not null default 'nodes' check (cover in ('nodes', 'bars', 'awning', 'laptop', 'ship', 'solar', 'truck', 'bakery')),
  add column rules text not null default '' check (char_length(rules) <= 2000),
  add column join_mode text not null default 'open' check (join_mode in ('open', 'request', 'invite')),
  add column status text not null default 'active' check (status in ('pending', 'active', 'rejected', 'archived'));
-- before this phase private groups were joined by invitation only
update groups set join_mode = 'invite' where is_private;
create index groups_status_idx on groups (status);

-- moderators help the group admin with join requests and members
alter table group_members drop constraint group_members_role_check;
alter table group_members add constraint group_members_role_check check (role in ('member', 'moderator', 'admin'));

create function is_group_mod(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid() and role in ('admin', 'moderator'));
$$;

-- a group that members can join on their own: active, and open (public) or the member holds an invitation
create function group_join_ok(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from groups g where g.id = gid and g.status = 'active'
      and ((not g.is_private and g.join_mode = 'open')
        or exists (select 1 from group_invites i where i.group_id = g.id and i.user_id = auth.uid()))
  );
$$;

create function group_takes_requests(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups g where g.id = gid and g.status = 'active' and g.join_mode = 'request'
    and not exists (select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid()));
$$;

-- pending, rejected and archived groups: only the creator and the team see unfinished ones
alter policy "groups readable" on groups
  using (status in ('active', 'archived') or created_by = auth.uid() or is_staff());
alter policy "groups manage" on groups
  using (created_by = auth.uid() or is_group_admin(id) or is_staff())
  with check (created_by = auth.uid() or is_group_admin(id) or is_staff());

alter policy "join public groups" on group_members
  with check (user_id = auth.uid() and role = 'member' and group_join_ok(group_id));

create policy "admins set moderators" on group_members for update to authenticated
  using (is_group_admin(group_id) and role <> 'admin')
  with check (is_group_admin(group_id) and role in ('member', 'moderator'));
alter policy "leave groups" on group_members
  using (user_id = auth.uid() or is_staff() or (is_group_mod(group_id) and role = 'member'));

-- the team's creation rules, applied to every new group
create function group_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare s group_settings; owned int;
begin
  if auth.uid() is null or is_staff() then return new; end if;
  select * into s from group_settings;
  new.status := 'active';
  if new.is_private then
    if s.create_private = 'off' then raise exception 'Creating groups is switched off right now.'; end if;
    if s.create_private = 'paid' then
      select count(*) into owned from groups where created_by = new.created_by and is_private and status in ('pending', 'active');
      if not can('group.private', owned) then raise exception 'Private groups need a paid plan. Upgrade to start one.'; end if;
    end if;
    new.join_mode := case when new.join_mode = 'open' then s.priv_join else new.join_mode end;
  else
    if s.create_public = 'off' then raise exception 'Creating groups is switched off right now.'; end if;
    if s.create_public = 'approval' then new.status := 'pending'; end if;
    if new.join_mode = 'invite' then new.join_mode := 'open'; end if;
  end if;
  if not (new.category = any (s.types)) then new.category := s.types[1]; end if;
  return new;
end $$;
create trigger group_rules before insert on groups for each row execute function group_rules();

-- what an admin may change: only the team approves or rejects, and a group is made private or public by the team
create function group_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare s group_settings;
begin
  if auth.uid() is null or is_staff() then return new; end if;
  if new.created_by is distinct from old.created_by or new.is_private is distinct from old.is_private
     or new.is_sample is distinct from old.is_sample or new.slug is distinct from old.slug then
    raise exception 'Only the team can change that.';
  end if;
  if new.status is distinct from old.status then
    select * into s from group_settings;
    if not (s.archive and old.status in ('active', 'archived') and new.status in ('active', 'archived')) then
      raise exception 'Only the team can change that.';
    end if;
  end if;
  if new.join_mode = 'open' and old.join_mode <> 'open' and new.is_private then
    raise exception 'A private group is joined by request or invitation.';
  end if;
  return new;
end $$;
create trigger group_guard before update on groups for each row execute function group_guard();

-- an archived group is read only
create function posts_group_open() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from groups where id = new.group_id and status <> 'active') then
    raise exception 'This group is archived, so it takes no new posts.';
  end if;
  return new;
end $$;
create trigger posts_group_open before insert on posts for each row when (new.group_id is not null) execute function posts_group_open();

-- ---------- join requests ----------
create table group_join_requests (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_by uuid references profiles (id) on delete set null,
  decided_at timestamptz,
  primary key (group_id, user_id)
);
create index on group_join_requests (group_id, status);
alter table group_join_requests enable row level security;
create policy "requests visible to both sides" on group_join_requests for select to authenticated
  using (user_id = auth.uid() or is_group_mod(group_id) or is_staff());
create policy "members ask to join" on group_join_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and is_active() and group_takes_requests(group_id));
create policy "withdraw a request" on group_join_requests for delete to authenticated
  using (user_id = auth.uid() or is_group_mod(group_id) or is_staff());
create trigger rate_group_requests before insert on group_join_requests for each row execute function enforce_rate('user_id', '20', '1 day');

-- a moderator answers a request; approving adds the member
create function decide_group_request(p_group uuid, p_user uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not (is_group_mod(p_group) or is_staff()) then
    raise exception 'Only the group admin or a moderator can answer requests.';
  end if;
  if not exists (select 1 from group_join_requests where group_id = p_group and user_id = p_user and status = 'pending') then
    raise exception 'That request has already been answered.';
  end if;
  update group_join_requests set status = case when p_approve then 'approved' else 'declined' end,
    decided_by = auth.uid(), decided_at = now()
    where group_id = p_group and user_id = p_user;
  if p_approve then
    insert into group_members (group_id, user_id, role) values (p_group, p_user, 'member') on conflict do nothing;
  end if;
end $$;

-- ---------- a message from the group admin to every member ----------
create table group_broadcasts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  recipients int not null,
  created_at timestamptz not null default now()
);
create index on group_broadcasts (group_id, created_at desc);
alter table group_broadcasts enable row level security;
create policy "broadcasts visible to admins" on group_broadcasts for select to authenticated using (is_group_admin(group_id) or is_staff());

create function message_group_members(p_group uuid, p_body text) returns int
language plpgsql security definer set search_path = public as $$
declare n int; body text := btrim(coalesce(p_body, ''));
begin
  if auth.uid() is null or not is_active() then raise exception 'Sign in to send a message.'; end if;
  if not is_group_admin(p_group) then raise exception 'Only the group admin can message all members.'; end if;
  if not (select msg_all from group_settings) then raise exception 'Messaging all members is switched off right now.'; end if;
  if not exists (select 1 from groups where id = p_group and status = 'active') then raise exception 'This group is not active.'; end if;
  if char_length(body) not between 1 and 4000 then raise exception 'Write a message of up to 4,000 characters.'; end if;
  if (select count(*) from group_broadcasts where group_id = p_group and created_at > now() - interval '1 day') >= 3 then
    raise exception 'You can message all members up to 3 times a day.';
  end if;
  insert into messages (sender_id, recipient_id, body)
    select auth.uid(), user_id, body from group_members where group_id = p_group and user_id <> auth.uid();
  get diagnostics n = row_count;
  insert into group_broadcasts (group_id, sender_id, recipients) values (p_group, auth.uid(), n);
  return n;
end $$;

-- ---------- grants ----------
revoke execute on function group_rules(), group_guard(), posts_group_open() from public, anon, authenticated;
revoke execute on function is_group_mod(uuid), group_join_ok(uuid), group_takes_requests(uuid),
  decide_group_request(uuid, uuid, boolean), message_group_members(uuid, text) from public, anon;
grant execute on function is_group_mod(uuid), group_join_ok(uuid), group_takes_requests(uuid),
  decide_group_request(uuid, uuid, boolean), message_group_members(uuid, text) to authenticated;
grant select, insert, delete on group_join_requests to authenticated;
grant select on group_broadcasts to authenticated;
