-- Round 8: security hardening, business reviews, private-group invitations.

-- ---------- business reviews ----------
create table company_reviews (
  company_id uuid not null references companies (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  primary key (company_id, author_id)
);
alter table company_reviews enable row level security;

create function owns_company(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from companies where id = cid and owner_id = auth.uid());
$$;

create policy "reviews readable" on company_reviews for select using (true);
-- one review per member per business, and never of your own business
create policy "reviews create" on company_reviews for insert to authenticated
  with check (author_id = auth.uid() and is_active() and not owns_company(company_id));
create policy "reviews edit own" on company_reviews for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid() and not owns_company(company_id));
create policy "reviews delete" on company_reviews for delete to authenticated
  using (author_id = auth.uid() or is_staff());

-- ---------- private-group invitations ----------
create table group_invites (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  invited_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_invites_user_idx on group_invites (user_id);
alter table group_invites enable row level security;

create function is_group_admin(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid() and role = 'admin');
$$;

create function is_invited(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_invites where group_id = gid and user_id = auth.uid());
$$;

create policy "invites visible to both sides" on group_invites for select to authenticated
  using (user_id = auth.uid() or invited_by = auth.uid() or is_staff());
-- group admins invite their own connections
create policy "invites by group admins" on group_invites for insert to authenticated
  with check (invited_by = auth.uid() and is_active() and is_group_admin(group_id) and is_connected(user_id));
create policy "invites withdraw or decline" on group_invites for delete to authenticated
  using (user_id = auth.uid() or invited_by = auth.uid() or is_staff());

-- joining: public groups are open, private groups need an invitation
alter policy "join public groups" on group_members
  with check (user_id = auth.uid() and role = 'member' and (not is_private_group(group_id) or is_invited(group_id)));

-- an invitation is used up once the member has joined
create function consume_group_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from group_invites where group_id = new.group_id and user_id = new.user_id;
  return new;
end $$;
create trigger consume_group_invite after insert on group_members
  for each row execute function consume_group_invite();

-- ---------- rate limits ----------
-- usage: enforce_rate('<owner column>', '<max rows>', '<window>')
create function enforce_rate() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then return new; end if; -- maintenance from the SQL editor
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval', tg_table_schema, tg_table_name, tg_argv[0])
    into n using (to_jsonb(new) ->> tg_argv[0])::uuid, tg_argv[2];
  if n >= tg_argv[1]::integer then
    raise exception 'You are doing that too often. Please try again later.';
  end if;
  return new;
end $$;

create trigger rate_comments before insert on comments for each row execute function enforce_rate('author_id', '30', '10 minutes');
create trigger rate_messages before insert on messages for each row execute function enforce_rate('sender_id', '60', '10 minutes');
create trigger rate_connections before insert on connections for each row execute function enforce_rate('requester_id', '60', '1 day');
create trigger rate_reports before insert on reports for each row execute function enforce_rate('reporter_id', '20', '1 day');
create trigger rate_groups before insert on groups for each row execute function enforce_rate('created_by', '5', '1 day');
create trigger rate_invites before insert on group_invites for each row execute function enforce_rate('invited_by', '100', '1 day');
create trigger rate_reviews before insert on company_reviews for each row execute function enforce_rate('author_id', '20', '1 day');

-- ---------- plan limits enforced in the database, not only in the app ----------
create function enforce_listing_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare allowed integer; have integer; plan text; staff boolean;
begin
  if auth.uid() is null then return new; end if;
  select member_type, role <> 'member' into plan, staff from profiles where id = new.owner_id;
  if staff then return new; end if;
  allowed := case plan when 'plus' then 1 when 'elite' then 2 when 'advisor' then 3 else 0 end;
  select count(*) into have from companies where owner_id = new.owner_id;
  if have >= allowed then
    raise exception 'Your plan does not include another business listing.';
  end if;
  return new;
end $$;
create trigger enforce_listing_limit before insert on companies
  for each row execute function enforce_listing_limit();

-- a listing cannot be handed to another member
create function protect_company_owner() returns trigger
language plpgsql as $$
begin
  new.owner_id := old.owner_id;
  return new;
end $$;
create trigger protect_company_owner before update on companies
  for each row execute function protect_company_owner();

-- ---------- input limits (existing rows are left as they are) ----------
alter table profiles add constraint profiles_lengths check (
  char_length(full_name) <= 80 and char_length(headline) <= 160 and char_length(bio) <= 2000
  and char_length(location) <= 80 and char_length(website) <= 200
) not valid;
alter table groups add constraint groups_lengths check (char_length(name) between 1 and 80 and char_length(description) <= 500) not valid;
alter table companies add constraint companies_lengths check (
  char_length(name) between 1 and 100 and char_length(category) <= 60 and char_length(description) <= 1000 and char_length(website) <= 200
) not valid;
alter table reports add constraint reports_reason_length check (char_length(reason) <= 60) not valid;

-- images must be files uploaded to this project's own storage, never an arbitrary outside address
-- (picsum.photos is allowed only while the demo posts exist; drop that line at launch)
alter table posts add constraint posts_image_is_ours check (
  image_url is null
  or image_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
  or image_url like 'https://picsum.photos/seed/%'
) not valid;
alter table profiles add constraint profiles_avatar_is_ours check (
  avatar_url is null or avatar_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
) not valid;
alter table companies add constraint companies_logo_is_ours check (
  logo_url is null or logo_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
) not valid;

-- uploads: images only, 5 MB at most
update storage.buckets
set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'media';

-- ---------- housekeeping ----------
alter function protect_message_fields() set search_path = public;
alter function protect_company_owner() set search_path = public;
revoke execute on function
  consume_group_invite(), enforce_rate(), enforce_listing_limit(), protect_company_owner(), protect_message_fields()
from public, anon, authenticated;
