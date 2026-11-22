-- V2 Phase 4: business profiles.
-- Built on the existing companies table, so the current site keeps reading it. New columns have safe defaults;
-- existing listings stay published. Hidden address and contacts live in business_private and only leave the
-- database through business_contact(), which respects the page's show/hide choices.

-- ---------- directory settings (one row, edited by admins) ----------
create table business_settings (
  id boolean primary key default true check (id),
  create_mode text not null default 'all' check (create_mode in ('all', 'paid')),
  member_limit int not null default 3 check (member_limit between 0 and 50),
  pub_approval boolean not null default true,
  review_approval boolean not null default false,
  criteria text[] not null default array['Quality', 'Value', 'Communication'],
  categories text[] not null default array['Food & Drink', 'Catering & Events', 'Retail', 'Professional Services', 'Finance & Accounting', 'Legal', 'Construction & Trades', 'Home Services', 'Technology', 'Logistics & Transport', 'Health & Wellness', 'Manufacturing', 'Marketing & Design', 'Other'],
  tabs jsonb not null default '{"photos": true, "events": true, "jobs": true, "shop": true}'
);
insert into business_settings default values;
alter table business_settings enable row level security;
create policy "business settings readable" on business_settings for select using (true);
create policy "business settings by admins" on business_settings for update to authenticated using (is_admin()) with check (is_admin());
grant select on business_settings to anon, authenticated;
grant update on business_settings to authenticated;

-- ---------- companies: the public page ----------
alter table companies
  add column kind text not null default 'storefront' check (kind in ('storefront', 'service', 'online')),
  add column status text not null default 'published' check (status in ('draft', 'pending', 'published', 'rejected', 'deleted')),
  add column about text not null default '' check (char_length(about) <= 2000),
  add column city text not null default '' check (char_length(city) <= 80),
  add column province text not null default '' check (char_length(province) <= 2),
  add column tz text not null default 'America/Toronto' check (char_length(tz) <= 40),
  add column service_area text not null default '' check (char_length(service_area) <= 120),
  add column show_address boolean not null default false,
  add column cover_url text,
  add column show_email boolean not null default false,
  add column show_phone boolean not null default false,
  add column show_whatsapp boolean not null default false,
  add column booking_url text not null default '' check (char_length(booking_url) <= 200),
  add column primary_action text not null default 'message' check (primary_action in ('message', 'call', 'web', 'book')),
  add column appointments boolean not null default false,
  add column hours jsonb not null default '{}' check (jsonb_typeof(hours) = 'object'),
  add column closures jsonb not null default '[]' check (jsonb_typeof(closures) = 'array'),
  add column social jsonb not null default '{}' check (jsonb_typeof(social) = 'object'),
  add column claimable boolean not null default false,
  add column updated_at timestamptz not null default now();
alter table companies add constraint companies_cover_ours check (
  cover_url is null
  or cover_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'
  or cover_url like 'https://picsum.photos/seed/%'
);
create index companies_status on companies (status);
create index companies_city on companies (province, city) where status = 'published';

-- ---------- team ----------
create table business_team (
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'editor', 'responder')),
  added_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index business_team_user on business_team (user_id);
alter table business_team enable row level security;

-- Is the signed-in member on this business's team? Does their role allow this? (staff can do everything)
create function is_team(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_team where company_id = cid and user_id = auth.uid());
$$;
-- edit = owner, manager. post = owner, manager, editor. inbox = owner, manager, responder. team = owner.
create function biz_can(cid uuid, perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() or exists (
    select 1 from business_team t
    where t.company_id = cid and t.user_id = auth.uid()
      and t.role = any (case perm
        when 'edit' then array['owner', 'manager']
        when 'post' then array['owner', 'manager', 'editor']
        when 'inbox' then array['owner', 'manager', 'responder']
        when 'team' then array['owner']
        else array[]::text[] end)
  );
$$;

-- every listing's owner is on its team
create function company_owner_on_team() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into business_team (company_id, user_id, role) values (new.id, new.owner_id, 'owner') on conflict do nothing;
  return null;
end $$;
revoke execute on function company_owner_on_team() from public, anon, authenticated;
create trigger company_owner_on_team after insert on companies for each row execute function company_owner_on_team();
-- existing companies: their owner joins the team
insert into business_team (company_id, user_id, role) select id, owner_id, 'owner' from companies on conflict do nothing;

create policy "team sees the team" on business_team for select to authenticated using (user_id = auth.uid() or is_team(company_id) or is_staff());
create policy "owner adds team" on business_team for insert to authenticated with check (biz_can(company_id, 'team') and role <> 'owner');
create policy "owner changes team" on business_team for update to authenticated using (biz_can(company_id, 'team')) with check (biz_can(company_id, 'team') and role <> 'owner');
create policy "owner removes team or leave" on business_team for delete to authenticated using (biz_can(company_id, 'team') or user_id = auth.uid());
-- the owner row stays; the owner changes only through a claim
create function business_team_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  select owner_id into owner from companies where id = coalesce(old.company_id, new.company_id);
  if tg_op in ('UPDATE', 'DELETE') and old.user_id = owner then
    if tg_op = 'DELETE' and not exists (select 1 from companies where id = old.company_id) then return old; end if; -- the company itself is going
    if not is_staff() then raise exception 'the owner cannot be removed or changed'; end if;
  end if;
  if tg_op = 'INSERT' and (select count(*) from business_team where company_id = new.company_id) >= 25 then raise exception 'a business team can have up to 25 people'; end if;
  return coalesce(new, old);
end $$;
revoke execute on function business_team_guard() from public, anon, authenticated;
create trigger business_team_guard before insert or update or delete on business_team for each row execute function business_team_guard();
grant select, insert, update, delete on business_team to authenticated;

-- ---------- rules for the listing itself ----------
create or replace function enforce_listing_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare s business_settings; v_plan text; staff boolean; have int;
begin
  if auth.uid() is null then return new; end if;
  select * into s from business_settings;
  select p.plan, p.role <> 'member' into v_plan, staff from profiles p where p.id = new.owner_id;
  if staff then return new; end if;
  if s.create_mode = 'paid' and v_plan = 'free' then raise exception 'Business pages are part of a paid plan.'; end if;
  select count(*) into have from companies where owner_id = new.owner_id and status <> 'deleted';
  if have >= s.member_limit then raise exception 'You can have up to % business pages.', s.member_limit; end if;
  return new;
end $$;

create or replace function protect_company_owner() returns trigger
language plpgsql as $$
begin
  if not is_staff() then new.owner_id := old.owner_id; end if;
  return new;
end $$;

create function company_rules() returns trigger
language plpgsql set search_path = public as $$
declare s business_settings; staff boolean := auth.uid() is not null and is_staff();
begin
  if auth.uid() is null or staff then new.updated_at := now(); return new; end if;
  select * into s from business_settings;
  new.province := upper(new.province);
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.claimable := false;
  else
    new.claimable := old.claimable; new.created_at := old.created_at;
    if new.status is distinct from old.status then
      if old.status = 'deleted' then raise exception 'this business page was deleted'; end if;
      if new.status = 'rejected' then raise exception 'only the team can reject a page'; end if;
      if new.status = 'published' and old.status <> 'published' and (s.pub_approval or old.status = 'rejected') then
        raise exception 'new business pages need team approval';
      end if;
      if new.status = 'pending' and old.status = 'published' then raise exception 'this page is already published'; end if;
    end if;
  end if;
  if (tg_op = 'INSERT' or new.category is distinct from old.category) and new.category <> '' and not (new.category = any (s.categories)) then
    raise exception 'choose a category from the list';
  end if;
  if new.status in ('pending', 'published') and (tg_op = 'INSERT' or old.status not in ('pending', 'published') or new.status <> old.status)
     and (new.name = '' or new.category = '' or new.city = '' or new.province = '') then
    raise exception 'add a name, category, city and province before submitting';
  end if;
  return new;
end $$;
create trigger company_rules before insert or update on companies for each row execute function company_rules();

-- who sees and changes a listing
drop policy "companies readable" on companies;
drop policy "companies manage" on companies;
drop policy "companies delete" on companies;
create policy "companies readable" on companies for select using (status = 'published' or is_team(id) or is_staff());
create policy "companies manage" on companies for update to authenticated using (biz_can(id, 'edit')) with check (biz_can(id, 'edit'));
create policy "companies delete" on companies for delete to authenticated using (owner_id = auth.uid() or is_staff());

-- ---------- hidden address and contacts ----------
create table business_private (
  company_id uuid primary key references companies (id) on delete cascade,
  street text not null default '' check (char_length(street) <= 120),
  postal text not null default '' check (char_length(postal) <= 10),
  email text not null default '' check (char_length(email) <= 120),
  phone text not null default '' check (char_length(phone) <= 30),
  whatsapp text not null default '' check (char_length(whatsapp) <= 30)
);
alter table business_private enable row level security;
create policy "private details for editors" on business_private for select to authenticated using (biz_can(company_id, 'edit'));
create policy "private details added by editors" on business_private for insert to authenticated with check (biz_can(company_id, 'edit'));
create policy "private details changed by editors" on business_private for update to authenticated using (biz_can(company_id, 'edit')) with check (biz_can(company_id, 'edit'));
grant select, insert, update on business_private to authenticated;

-- What a visitor may see: only what the page shows. Street and postal code only when the owner allows an address.
create function business_contact(cid uuid) returns table (street text, postal text, email text, phone text, whatsapp text)
language sql stable security definer set search_path = public as $$
  select case when c.show_address then p.street end,
         case when c.show_address then p.postal end,
         case when c.show_email then p.email end,
         case when c.show_phone then p.phone end,
         case when c.show_whatsapp then p.whatsapp end
  from companies c join business_private p on p.company_id = c.id
  where c.id = cid and (c.status = 'published' or is_team(c.id) or is_staff());
$$;
grant execute on function business_contact(uuid) to anon, authenticated;

-- ---------- services ----------
create table business_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  photo_url text,
  price_type text not null default 'quote' check (price_type in ('fixed', 'from', 'quote')),
  price numeric(10, 2) check (price is null or price >= 0),
  position int not null default 0,
  check (price_type = 'quote' or price is not null),
  constraint business_services_photo_ours check (photo_url is null or photo_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%' or photo_url like 'https://picsum.photos/seed/%')
);
create index business_services_company on business_services (company_id, position);
alter table business_services enable row level security;
create policy "services follow the page" on business_services for select using (exists (select 1 from companies c where c.id = company_id));
create function business_service_count(cid uuid) returns int
language sql stable security definer set search_path = public as $$ select count(*)::int from business_services where company_id = cid; $$;
create policy "editors add services" on business_services for insert to authenticated with check (biz_can(company_id, 'edit') and business_service_count(company_id) < 30);
create policy "editors change services" on business_services for update to authenticated using (biz_can(company_id, 'edit')) with check (biz_can(company_id, 'edit'));
create policy "editors remove services" on business_services for delete to authenticated using (biz_can(company_id, 'edit'));
grant select on business_services to anon, authenticated;
grant insert, update, delete on business_services to authenticated;

-- ---------- followers ----------
create table business_follows (
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index business_follows_user on business_follows (user_id);
alter table business_follows enable row level security;
create policy "my follows" on business_follows for select to authenticated using (user_id = auth.uid());
create policy "follow a business" on business_follows for insert to authenticated
  with check (user_id = auth.uid() and is_active() and exists (select 1 from companies c where c.id = company_id and c.status = 'published'));
create policy "unfollow" on business_follows for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on business_follows to authenticated;
create function business_follower_count(cid uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from business_follows f join companies c on c.id = f.company_id where f.company_id = cid and c.status = 'published';
$$;
grant execute on function business_follower_count(uuid) to anon, authenticated;

-- ---------- posting as the business ----------
alter table posts add column business_id uuid references companies (id) on delete cascade;
create index posts_business on posts (business_id, created_at desc) where business_id is not null;
-- author_id stays the person who wrote it; business_id makes the business the face of the post
create function post_business_rule() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_staff() then return new; end if;
  if tg_op = 'UPDATE' then new.business_id := old.business_id; return new; end if;
  if new.business_id is not null then
    if not biz_can(new.business_id, 'post') then raise exception 'you cannot post as this business'; end if;
    if not exists (select 1 from companies where id = new.business_id and status = 'published') then raise exception 'this business page is not published'; end if;
    if new.group_id is not null then raise exception 'a business post cannot go into a group'; end if;
  end if;
  return new;
end $$;
revoke execute on function post_business_rule() from public, anon, authenticated;
create trigger post_business_rule before insert or update on posts for each row execute function post_business_rule();
-- a business post can only be removed by the team that can post for it (or its author, or staff)
create policy "business team removes business posts" on posts for delete to authenticated using (business_id is not null and biz_can(business_id, 'post'));

-- ---------- reviews by criteria ----------
alter table company_reviews
  add column criteria jsonb not null default '{}' check (jsonb_typeof(criteria) = 'object'),
  add column status text not null default 'published' check (status in ('published', 'pending', 'hidden'));
create function review_rules() returns trigger
language plpgsql set search_path = public as $$
declare s business_settings; k text; v text; total int := 0; n int := 0; staff boolean := auth.uid() is not null and is_staff();
begin
  select * into s from business_settings;
  for k, v in select * from jsonb_each_text(new.criteria) loop
    if not (k = any (s.criteria)) then raise exception 'unknown review criterion %', k; end if;
    if v !~ '^[1-5]$' then raise exception 'rate each criterion from 1 to 5'; end if;
    total := total + v::int; n := n + 1;
  end loop;
  if n > 0 then new.rating := round(total::numeric / n)::smallint; end if;
  if auth.uid() is null or staff then return new; end if;
  if tg_op = 'INSERT' then
    new.status := case when s.review_approval then 'pending' else 'published' end;
    if not exists (select 1 from companies where id = new.company_id and status = 'published') then raise exception 'this business page is not published'; end if;
  else
    new.status := old.status; new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger review_rules before insert or update on company_reviews for each row execute function review_rules();
drop policy "reviews readable" on company_reviews;
drop policy "reviews create" on company_reviews;
drop policy "reviews edit own" on company_reviews;
create policy "reviews readable" on company_reviews for select
  using (status = 'published' or author_id = auth.uid() or biz_can(company_id, 'edit'));
create policy "reviews create" on company_reviews for insert to authenticated
  with check (author_id = auth.uid() and is_active() and not is_team(company_id));
create policy "reviews edit own" on company_reviews for update to authenticated
  using (author_id = auth.uid() or is_staff()) with check ((author_id = auth.uid() and not is_team(company_id)) or is_staff());

-- the business's public reply to a review
create table business_review_replies (
  company_id uuid not null,
  review_author_id uuid not null,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  primary key (company_id, review_author_id),
  foreign key (company_id, review_author_id) references company_reviews (company_id, author_id) on delete cascade
);
alter table business_review_replies enable row level security;
create policy "replies follow reviews" on business_review_replies for select
  using (exists (select 1 from company_reviews r where r.company_id = business_review_replies.company_id and r.author_id = review_author_id));
create policy "editors reply" on business_review_replies for insert to authenticated with check (author_id = auth.uid() and biz_can(company_id, 'edit'));
create policy "editors change reply" on business_review_replies for update to authenticated using (biz_can(company_id, 'edit')) with check (biz_can(company_id, 'edit') and author_id = auth.uid());
create policy "editors remove reply" on business_review_replies for delete to authenticated using (biz_can(company_id, 'edit'));
grant select on business_review_replies to anon, authenticated;
grant insert, update, delete on business_review_replies to authenticated;

-- ---------- shared inbox ----------
create table business_inquiries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  kind text not null default 'message' check (kind in ('message', 'quote')),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);
create index business_inquiries_company on business_inquiries (company_id, last_at desc);
create index business_inquiries_sender on business_inquiries (sender_id, last_at desc);
create table business_inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references business_inquiries (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  as_business boolean not null default false,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index business_inquiry_messages_inquiry on business_inquiry_messages (inquiry_id, created_at);
alter table business_inquiries enable row level security;
alter table business_inquiry_messages enable row level security;

create function can_see_inquiry(qid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_inquiries q where q.id = qid and (q.sender_id = auth.uid() or biz_can(q.company_id, 'inbox')));
$$;
create policy "inquiry parties read" on business_inquiries for select to authenticated using (sender_id = auth.uid() or biz_can(company_id, 'inbox'));
create policy "send an inquiry" on business_inquiries for insert to authenticated
  with check (sender_id = auth.uid() and is_active() and not is_team(company_id) and exists (select 1 from companies c where c.id = company_id and c.status = 'published'));
create policy "inquiry parties close" on business_inquiries for update to authenticated using (sender_id = auth.uid() or biz_can(company_id, 'inbox')) with check (sender_id = auth.uid() or biz_can(company_id, 'inbox'));
create policy "inquiry messages read" on business_inquiry_messages for select to authenticated using (can_see_inquiry(inquiry_id));
create policy "inquiry messages write" on business_inquiry_messages for insert to authenticated with check (author_id = auth.uid() and can_see_inquiry(inquiry_id));
create trigger rate_inquiries before insert on business_inquiries for each row execute function enforce_rate('sender_id', '10', '1 day');
create trigger rate_inquiry_messages before insert on business_inquiry_messages for each row execute function enforce_rate('author_id', '60', '1 hour');

-- a reply from the team is "as the business"; every message moves the conversation's state
create function inquiry_message_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare q business_inquiries;
begin
  select * into q from business_inquiries where id = new.inquiry_id;
  if auth.uid() is not null then new.as_business := new.author_id <> q.sender_id; end if;
  if q.status = 'closed' then raise exception 'this conversation is closed'; end if;
  return new;
end $$;
create function inquiry_after_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update business_inquiries set last_at = now(), status = case when new.as_business then 'answered' else 'open' end where id = new.inquiry_id;
  return null;
end $$;
create function inquiry_guard() returns trigger
language plpgsql as $$
begin
  new.company_id := old.company_id; new.sender_id := old.sender_id; new.kind := old.kind; new.created_at := old.created_at; new.last_at := old.last_at;
  return new;
end $$;
revoke execute on function inquiry_message_rules(), inquiry_after_message() from public, anon, authenticated;
create trigger inquiry_message_rules before insert on business_inquiry_messages for each row execute function inquiry_message_rules();
create trigger inquiry_after_message after insert on business_inquiry_messages for each row execute function inquiry_after_message();
create trigger inquiry_guard before update on business_inquiries for each row execute function inquiry_guard();
grant select, insert, update on business_inquiries to authenticated;
grant select, insert on business_inquiry_messages to authenticated;

-- ---------- claiming a listing the CanadianSME team created ----------
create table business_claims (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  evidence text not null check (char_length(evidence) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index business_claims_one_open on business_claims (company_id, user_id) where status = 'pending';
alter table business_claims enable row level security;
create policy "claims: mine or staff" on business_claims for select to authenticated using (user_id = auth.uid() or is_staff());
create policy "claim a listing" on business_claims for insert to authenticated
  with check (user_id = auth.uid() and is_active() and status = 'pending'
    and exists (select 1 from companies c where c.id = company_id and c.status = 'published' and c.claimable));
create policy "withdraw a claim" on business_claims for delete to authenticated using (user_id = auth.uid() and status = 'pending');
create trigger rate_claims before insert on business_claims for each row execute function enforce_rate('user_id', '5', '1 day');
grant select, insert, delete on business_claims to authenticated;

-- The team's decision. Approving hands the page to the claimant and clears the old team.
create function decide_claim(p_claim uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c business_claims;
begin
  if not is_staff() then raise exception 'only the team can decide a claim'; end if;
  select * into c from business_claims where id = p_claim and status = 'pending' for update;
  if not found then raise exception 'this claim was already decided'; end if;
  update business_claims set status = case when p_approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now() where id = p_claim;
  if p_approve then
    update companies set owner_id = c.user_id, claimable = false where id = c.company_id;
    delete from business_team where company_id = c.company_id;
    insert into business_team (company_id, user_id, role) values (c.company_id, c.user_id, 'owner');
    update business_claims set status = 'rejected', decided_by = auth.uid(), decided_at = now() where company_id = c.company_id and status = 'pending';
  end if;
end $$;
revoke execute on function decide_claim(uuid, boolean) from public, anon;
grant execute on function decide_claim(uuid, boolean) to authenticated;

-- ---------- directory search ----------
-- Is the business open at this moment? Hours are {"mon": [["09:00","17:00"]], ...} in the business's own time zone;
-- a range that ends before it starts runs past midnight. A holiday closure ({"date": "2026-12-25"}) closes the whole day.
create function business_is_open(p_hours jsonb, p_closures jsonb, p_tz text, p_at timestamptz default null) returns boolean
language plpgsql stable set search_path = public as $$
declare local timestamp; day text; prev text; t time; r jsonb; o time; c time;
  keys text[] := array['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
begin
  local := coalesce(p_at, app_now()) at time zone coalesce(nullif(p_tz, ''), 'America/Toronto');
  if exists (select 1 from jsonb_array_elements(coalesce(p_closures, '[]')) x where x ->> 'date' = to_char(local, 'YYYY-MM-DD')) then return false; end if;
  day := keys[extract(dow from local)::int + 1];
  prev := keys[((extract(dow from local)::int + 6) % 7) + 1];
  t := local::time;
  for r in select * from jsonb_array_elements(coalesce(p_hours -> day, '[]')) loop
    o := (r ->> 0)::time; c := (r ->> 1)::time;
    if (o < c and t >= o and t < c) or (o >= c and t >= o) then return true; end if;
  end loop;
  for r in select * from jsonb_array_elements(coalesce(p_hours -> prev, '[]')) loop
    o := (r ->> 0)::time; c := (r ->> 1)::time;
    if o >= c and t < c then return true; end if;
  end loop;
  return false;
exception when others then return false;
end $$;

create function search_businesses(
  q text default '', p_cat text default '', p_prov text default '', p_city text default '', p_kind text default '',
  p_open boolean default false, p_sort text default 'rating', p_limit int default 24, p_offset int default 0
) returns table (id uuid, slug text, name text, category text, description text, logo_url text, cover_url text, city text, province text,
                 kind text, rating numeric, reviews int, followers int, is_open boolean, claimable boolean)
language sql stable set search_path = public as $$
  with base as (
    select c.*, r.rating as avg_rating, coalesce(r.n, 0)::int as review_n,
           business_is_open(c.hours, c.closures, c.tz) as open_now
    from companies c
    left join lateral (select round(avg(cr.rating), 1) as rating, count(*) as n from company_reviews cr where cr.company_id = c.id and cr.status = 'published') r on true
    where c.status = 'published'
      and (coalesce(q, '') = '' or c.fts @@ to_tsquery('english', q))
      and (coalesce(p_cat, '') = '' or c.category = p_cat)
      and (coalesce(p_prov, '') = '' or c.province = upper(p_prov))
      and (coalesce(p_city, '') = '' or c.city = p_city)
      and (coalesce(p_kind, '') = '' or c.kind = p_kind)
  )
  select b.id, b.slug, b.name, b.category, b.description, b.logo_url, b.cover_url, b.city, b.province, b.kind,
         b.avg_rating, b.review_n, business_follower_count(b.id), b.open_now, b.claimable
  from base b
  where not coalesce(p_open, false) or b.open_now
  order by case when p_sort = 'rating' then b.avg_rating end desc nulls last,
           case when p_sort = 'rating' then b.review_n end desc,
           case when p_sort = 'new' then b.created_at end desc,
           b.name
  limit least(greatest(coalesce(p_limit, 24), 1), 60) offset greatest(coalesce(p_offset, 0), 0);
$$;
grant execute on function search_businesses(text, text, text, text, text, boolean, text, int, int) to anon, authenticated;
grant execute on function business_is_open(jsonb, jsonb, text, timestamptz) to anon, authenticated;

-- Cities that have businesses, for the map (counts only; a street address never appears here)
create function business_map_cities(p_cat text default '', p_kind text default '') returns table (city text, province text, businesses int)
language sql stable set search_path = public as $$
  select c.city, c.province, count(*)::int from companies c
  where c.status = 'published' and c.city <> '' and (coalesce(p_cat, '') = '' or c.category = p_cat) and (coalesce(p_kind, '') = '' or c.kind = p_kind)
  group by c.city, c.province order by 3 desc limit 200;
$$;
grant execute on function business_map_cities(text, text) to anon, authenticated;
