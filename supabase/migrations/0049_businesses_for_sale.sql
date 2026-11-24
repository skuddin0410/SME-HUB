-- Update 5: Businesses for Sale. Paid members (Plus, Advisor) list a business; any member can save it,
-- contact the seller and report it; the Hub team checks, hides and restores listings.
-- Visitors never receive sales, earnings, staff numbers or the seller. Buyers never receive a confidential
-- seller's name, photo or business name until that seller shares documents with them. The listing table is
-- therefore closed to buyers and visitors: they read listings only through sale_browse() and sale_detail(),
-- which leave those fields out.

create table sale_listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,89}$' and slug not in ('new', 'my-listings', 'saved')),
  seller_id uuid not null references profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 15 and 120),
  industry text not null check (industry in ('Food and drink', 'Construction and trades', 'Transport and logistics', 'Energy and environment', 'Retail', 'Professional services', 'Health and wellness', 'Manufacturing', 'Tech and online')),
  city text not null check (char_length(btrim(city)) between 1 and 80),
  province text not null check (province in ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  area_shown text not null check (char_length(btrim(area_shown)) between 1 and 80),
  price bigint not null default 0 check (price between 0 and 10000000000),
  price_on_request boolean not null default false,
  yearly_sales bigint not null default 0 check (yearly_sales between 0 and 100000000000),
  owner_earnings bigint not null default 0 check (owner_earnings between 0 and 100000000000),
  year_established int check (year_established is null or year_established between 1800 and 2100),
  employees int not null default 0 check (employees between 0 and 1000000),
  sale_type text not null default 'full' check (sale_type in ('full', 'part', 'assets')),
  premises text not null default 'lease' check (premises in ('lease', 'own', 'home', 'none')),
  lease_details text not null default '' check (char_length(lease_details) <= 200),
  seller_financing boolean not null default false,
  training text not null default '' check (char_length(training) <= 400),
  reason text not null default '' check (char_length(reason) <= 400),
  included text[] not null default '{}' check (included <@ array['Equipment and fixtures', 'Inventory and stock', 'Customer list', 'Website, phone number and social accounts', 'Brand name and trademarks', 'Supplier contracts', 'Vehicles', 'Staff willing to stay']),
  highlights text[] not null check (cardinality(highlights) between 1 and 5 and char_length(array_to_string(highlights, '')) <= 1000),
  description text[] not null check (char_length(array_to_string(description, ' ')) between 80 and 6000 and cardinality(description) <= 12),
  ideal_buyer text not null default '' check (char_length(ideal_buyer) <= 400),
  documents text[] not null default '{}' check (cardinality(documents) <= 12 and char_length(array_to_string(documents, '')) <= 1500),
  photo_url text not null default '' check (photo_url = '' or photo_url ~ '^/zip/img/[a-z0-9-]+\.jpg$' or photo_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%'),
  confidential boolean not null default true,
  business_name text not null default '' check (char_length(business_name) <= 100),
  status text not null default 'live' check (status in ('live', 'offer', 'sold', 'paused', 'hidden')),
  checked_by uuid references profiles (id) on delete set null,
  checked_at timestamptz,
  views int not null default 0,
  saves int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_on_request or price >= 1000),
  check (sale_type = 'assets' or yearly_sales > 0)
);
create index sale_listings_seller on sale_listings (seller_id);
create index sale_listings_status on sale_listings (status, created_at desc);

create table sale_saves (
  member_id uuid not null references profiles (id) on delete cascade,
  listing_id uuid not null references sale_listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, listing_id)
);
create index sale_saves_listing on sale_saves (listing_id);

create table sale_enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references sale_listings (id) on delete cascade,
  buyer_id uuid not null references profiles (id) on delete cascade,
  funding text not null check (funding in ('I have the money ready', 'I’ll need a business loan', 'I’m looking for partners or investors', 'I’m just exploring')),
  timing text not null check (timing in ('Within 3 months', 'In 3 to 6 months', 'In 6 to 12 months', 'Not sure yet')),
  message text not null check (char_length(btrim(message)) between 20 and 2000),
  agreed_private boolean not null check (agreed_private),
  docs_shared_at timestamptz,
  read_at timestamptz,
  thread_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
create index sale_enquiries_buyer on sale_enquiries (buyer_id);

create table sale_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references sale_listings (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null check (reason in ('The numbers look wrong or misleading', 'I think it’s a scam', 'The seller asked me to pay a deposit or fee', 'It’s not a real business for sale', 'Something else')),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

-- one view per member or visitor per day; never read by anyone
create table sale_views (
  listing_id uuid not null references sale_listings (id) on delete cascade,
  viewer text not null,
  day date not null default current_date,
  primary key (listing_id, viewer, day)
);

-- members who turned off a group of notification emails (Email notifications: "Businesses for sale")
create table email_opt_out (
  member_id uuid not null references profiles (id) on delete cascade,
  grp text not null check (grp in ('forsale')),
  created_at timestamptz not null default now(),
  primary key (member_id, grp)
);

alter table sale_listings enable row level security;
alter table sale_saves enable row level security;
alter table sale_enquiries enable row level security;
alter table sale_reports enable row level security;
alter table sale_views enable row level security;
alter table email_opt_out enable row level security;

-- ---------- who may list ----------
create function sale_can_list() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active' and plan in ('plus', 'advisor'));
$$;

create function sale_is_seller(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sale_listings where id = lid and seller_id = auth.uid());
$$;

create function sale_buyer_visible(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sale_listings where id = lid and status in ('live', 'offer'));
$$;

-- ---------- listings: sellers and the team only; buyers use the functions below ----------
create policy "sellers and the team read listings" on sale_listings for select to authenticated using (seller_id = auth.uid() or is_staff());
create policy "paid members publish" on sale_listings for insert to authenticated
  with check (seller_id = auth.uid() and sale_can_list() and status = 'live' and checked_at is null and checked_by is null and views = 0 and saves = 0 and not is_sample);
create policy "sellers and the team edit" on sale_listings for update to authenticated
  using (seller_id = auth.uid() or is_staff()) with check (seller_id = auth.uid() or is_staff());
grant select, insert, update on sale_listings to authenticated;

-- sellers change their own content and status; only the team checks, hides and restores
create function protect_sale_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.id := old.id;
  new.seller_id := old.seller_id;
  new.created_at := old.created_at;
  new.is_sample := old.is_sample;
  if coalesce(current_setting('app.system', true), '') = '1' or auth.uid() is null then return new; end if;
  new.views := old.views;
  new.saves := old.saves;
  if not is_staff() then
    new.checked_by := old.checked_by;
    new.checked_at := old.checked_at;
    if old.status = 'hidden' then new.status := 'hidden'; end if;
    if new.status = 'hidden' and old.status <> 'hidden' then raise exception 'Only the Hub team can hide a listing.'; end if;
    if old.status = 'sold' and new.status <> 'sold' then raise exception 'A sold listing can’t be put back on the market. List it again instead.'; end if;
  end if;
  return new;
end $$;
create trigger protect_sale_fields before update on sale_listings for each row execute function protect_sale_fields();
revoke execute on function protect_sale_fields() from public, anon, authenticated;
create trigger rate_sale_listings before insert on sale_listings for each row execute function enforce_rate('seller_id', '5', '1 day');

-- ---------- saves ----------
create policy "own saves" on sale_saves for select to authenticated using (member_id = auth.uid());
create policy "save a visible listing" on sale_saves for insert to authenticated
  with check (member_id = auth.uid() and is_active() and sale_buyer_visible(listing_id) and not sale_is_seller(listing_id));
create policy "remove own saves" on sale_saves for delete to authenticated using (member_id = auth.uid());
grant select, insert, delete on sale_saves to authenticated;

create function sale_count_saves() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.system', '1', true);
  if tg_op = 'INSERT' then update sale_listings set saves = saves + 1 where id = new.listing_id;
  else update sale_listings set saves = greatest(0, saves - 1) where id = old.listing_id; end if;
  perform set_config('app.system', '', true);
  return null;
end $$;
create trigger sale_count_saves after insert or delete on sale_saves for each row execute function sale_count_saves();
revoke execute on function sale_count_saves() from public, anon, authenticated;

-- ---------- enquiries: written only through sale_enquire(); read by the buyer and the seller ----------
create policy "buyer and seller read enquiries" on sale_enquiries for select to authenticated using (buyer_id = auth.uid() or sale_is_seller(listing_id));
grant select on sale_enquiries to authenticated;
create trigger rate_sale_enquiries before insert on sale_enquiries for each row execute function enforce_rate('buyer_id', '10', '1 day');

-- ---------- reports: members report what they can see; only the team reads them ----------
create policy "members report listings" on sale_reports for insert to authenticated
  with check (reporter_id = auth.uid() and is_active() and sale_buyer_visible(listing_id) and not sale_is_seller(listing_id));
create policy "team reads reports" on sale_reports for select to authenticated using (is_staff());
grant select, insert on sale_reports to authenticated;
create trigger rate_sale_reports before insert on sale_reports for each row execute function enforce_rate('reporter_id', '20', '1 day');

create policy "own email choices" on email_opt_out for select to authenticated using (member_id = auth.uid());
create policy "turn off a group" on email_opt_out for insert to authenticated with check (member_id = auth.uid());
create policy "turn on a group" on email_opt_out for delete to authenticated using (member_id = auth.uid());
grant select, insert, delete on email_opt_out to authenticated;

-- ---------- what buyers and visitors may see ----------
create function sale_member() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from profiles where id = auth.uid() and status = 'active');
$$;

-- a buyer may see a confidential seller once the seller shared documents with them
create function sale_seller_shown(l sale_listings) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (not l.confidential or l.seller_id = auth.uid() or is_staff()
    or exists (select 1 from sale_enquiries e where e.listing_id = l.id and e.buyer_id = auth.uid() and e.docs_shared_at is not null));
$$;

create function sale_card(l sale_listings, m boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', l.id, 'slug', l.slug, 'title', l.title, 'industry', l.industry, 'city', l.city, 'province', l.province,
    'area', l.area_shown, 'price', l.price, 'por', l.price_on_request, 'type', l.sale_type, 'photo', l.photo_url,
    'status', l.status, 'checked', l.checked_at is not null, 'created_at', l.created_at,
    'earnings', case when m then l.owner_earnings end,
    'saved', exists (select 1 from sale_saves s where s.listing_id = l.id and s.member_id = auth.uid())
  );
$$;

-- every listing buyers can see, with the text the search box looks through
create function sale_browse() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(sale_card(l, sale_member()) || jsonb_build_object('search',
           l.title || ' ' || l.industry || ' ' || l.area_shown || ' ' || l.city || ' ' ||
           case when sale_member() then array_to_string(l.description, ' ') else coalesce(l.description[1], '') end)
         order by l.created_at desc), '[]'::jsonb)
  from sale_listings l where l.status in ('live', 'offer');
$$;

-- the cards of listings the caller saved (still visible to buyers)
create function sale_saved() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(sale_card(l, true) order by s.created_at desc), '[]'::jsonb)
  from sale_saves s join sale_listings l on l.id = s.listing_id
  where s.member_id = auth.uid() and l.status in ('live', 'offer');
$$;

-- one listing, shaped for whoever is asking
create function sale_detail(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l sale_listings; m boolean := sale_member(); mine boolean; staff boolean := is_staff(); e sale_enquiries; p profiles; shown boolean; out jsonb;
begin
  select * into l from sale_listings where slug = p_key or id::text = p_key limit 1;
  if not found then return null; end if;
  mine := auth.uid() is not null and l.seller_id = auth.uid();
  if l.status not in ('live', 'offer') and not mine and not staff then return null; end if;
  select * into e from sale_enquiries where listing_id = l.id and buyer_id = auth.uid();
  shown := sale_seller_shown(l);
  out := sale_card(l, m) || jsonb_build_object(
    'established', l.year_established, 'premises', l.premises, 'highlights', to_jsonb(l.highlights),
    'description', case when m then to_jsonb(l.description) else to_jsonb(array[coalesce(l.description[1], '')]) end,
    'has_employees', l.employees > 0, 'mine', mine, 'staff', staff, 'member', m);
  if m then
    out := out || jsonb_build_object(
      'sales', l.yearly_sales, 'employees', l.employees, 'reason', l.reason, 'training', l.training,
      'lease', l.lease_details, 'financing', l.seller_financing, 'buyer', l.ideal_buyer,
      'included', to_jsonb(l.included), 'documents', to_jsonb(l.documents),
      'seller_plan', (select plan from profiles where id = l.seller_id),
      'enquiry', case when e.id is null then null else jsonb_build_object('created_at', e.created_at, 'shared', e.docs_shared_at is not null, 'thread', e.thread_at is not null) end);
    if shown then
      select * into p from profiles where id = l.seller_id;
      out := out || jsonb_build_object('seller', jsonb_build_object('id', p.id, 'name', p.full_name, 'role', p.headline, 'avatar', p.avatar_url, 'member_type', p.member_type),
                                       'business_name', l.business_name, 'confidential', l.confidential);
    end if;
  end if;
  if mine or staff then
    out := out || jsonb_build_object('views', l.views, 'saves', l.saves, 'confidential', l.confidential,
      'enquiries', (select count(*) from sale_enquiries where listing_id = l.id));
  end if;
  return out;
end $$;

-- similar businesses: same industry or province, live only
create function sale_similar(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(c), '[]'::jsonb) from (
    select sale_card(o, sale_member()) c from sale_listings o, sale_listings l
    where l.id = p_id and o.id <> l.id and o.status = 'live' and (o.industry = l.industry or o.province = l.province)
    order by o.created_at desc limit 3) x;
$$;

-- a view counts once per member or visitor a day; the seller's own visits don't count
create function sale_count_view(p_id uuid, p_visitor text default null) returns void
language plpgsql security definer set search_path = public as $$
declare who text; n int;
begin
  if auth.uid() is not null then who := auth.uid()::text;
  elsif p_visitor ~ '^[0-9a-f-]{36}$' then who := 'v:' || p_visitor;
  else return; end if;
  if exists (select 1 from sale_listings where id = p_id and seller_id = auth.uid()) then return; end if;
  if not sale_buyer_visible(p_id) then return; end if;
  insert into sale_views (listing_id, viewer) values (p_id, who) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 1 then
    perform set_config('app.system', '1', true);
    update sale_listings set views = views + 1 where id = p_id;
    perform set_config('app.system', '', true);
  end if;
end $$;

-- ---------- contacting the seller ----------
-- messages between a buyer and a seller once their conversation has started (open listings start it right away;
-- a confidential seller starts it by replying, so the buyer can't link the seller to the listing before then)
create function sale_thread_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not blocked_between(a, b) and exists (
    select 1 from sale_enquiries e join sale_listings l on l.id = e.listing_id
    where e.thread_at is not null and ((e.buyer_id = a and l.seller_id = b) or (e.buyer_id = b and l.seller_id = a)));
$$;
revoke execute on function sale_thread_between(uuid, uuid) from public, anon;
create policy "messages about a business for sale" on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_active() and sale_thread_between(auth.uid(), recipient_id));

create function sale_enquire(p_listing uuid, p_funding text, p_timing text, p_message text, p_agreed boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare l sale_listings; eid uuid; open boolean;
begin
  if not sale_member() then raise exception 'Sign in to contact the seller.'; end if;
  select * into l from sale_listings where id = p_listing;
  if not found or l.status not in ('live', 'offer') then raise exception 'This listing isn’t available.'; end if;
  if l.status = 'offer' then raise exception 'The seller has accepted an offer.'; end if;
  if l.seller_id = auth.uid() then raise exception 'This is your own listing.'; end if;
  if blocked_between(auth.uid(), l.seller_id) then raise exception 'You can’t contact this seller.'; end if;
  if not coalesce(p_agreed, false) then raise exception 'Tick the box to agree to keep the details private.'; end if;
  if char_length(btrim(coalesce(p_message, ''))) < 20 then raise exception 'Write at least a sentence or two so the seller knows who you are.'; end if;
  if exists (select 1 from sale_enquiries where listing_id = l.id and buyer_id = auth.uid()) then raise exception 'You already contacted this seller.'; end if;
  open := not l.confidential;
  insert into sale_enquiries (listing_id, buyer_id, funding, timing, message, agreed_private, thread_at)
  values (l.id, auth.uid(), p_funding, p_timing, btrim(p_message), true, case when open then now() end) returning id into eid;
  if open then
    insert into messages (sender_id, recipient_id, body) values (auth.uid(), l.seller_id, left('Enquiry about “' || l.title || '”: ' || btrim(p_message), 4000));
  end if;
  insert into notifications (user_id, actor_id, type, href) values (l.seller_id, auth.uid(), 'sale_enquiry', '/for-sale/my-listings');
  return eid;
end $$;

-- the seller opens the conversation with a buyer: the enquiry becomes the first message
create function sale_open_thread(p_enquiry uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare e sale_enquiries; l sale_listings;
begin
  select * into e from sale_enquiries where id = p_enquiry;
  if not found then raise exception 'Enquiry not found.'; end if;
  select * into l from sale_listings where id = e.listing_id;
  if l.seller_id <> auth.uid() then raise exception 'Only the seller can reply.'; end if;
  if blocked_between(e.buyer_id, l.seller_id) then raise exception 'You can’t message this member.'; end if;
  if e.thread_at is null then
    insert into messages (sender_id, recipient_id, body, created_at) values (e.buyer_id, l.seller_id, left('Enquiry about “' || l.title || '”: ' || e.message, 4000), e.created_at);
    update sale_enquiries set thread_at = now(), read_at = coalesce(read_at, now()) where id = e.id;
  end if;
  return e.buyer_id;
end $$;

-- the seller shares documents with one buyer (and, for a confidential listing, their name)
create function sale_share_docs(p_enquiry uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update sale_enquiries e set docs_shared_at = coalesce(e.docs_shared_at, now())
  from sale_listings l where e.id = p_enquiry and l.id = e.listing_id and l.seller_id = auth.uid();
  if not found then raise exception 'Only the seller can share documents.'; end if;
end $$;

create function sale_enquiries_seen() returns void
language sql security definer set search_path = public as $$
  update sale_enquiries e set read_at = now() from sale_listings l
  where l.id = e.listing_id and l.seller_id = auth.uid() and e.read_at is null;
$$;

create function sale_unread_enquiries() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from sale_enquiries e join sale_listings l on l.id = e.listing_id where l.seller_id = auth.uid() and e.read_at is null;
$$;

-- ---------- the Hub team ----------
create function sale_set_checked(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Only the Hub team can check listings.'; end if;
  update sale_listings set checked_at = case when p_on then now() end, checked_by = case when p_on then auth.uid() end where id = p_id;
end $$;

create function sale_set_hidden(p_id uuid, p_hide boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare s uuid;
begin
  if not is_staff() then raise exception 'Only the Hub team can hide listings.'; end if;
  update sale_listings set status = case when p_hide then 'hidden' else 'live' end
  where id = p_id and (p_hide or status = 'hidden') returning seller_id into s;
  return s;
end $$;

-- ---------- notifications ----------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission', 'sale_enquiry'));

-- ---------- grants ----------
revoke all on sale_listings, sale_saves, sale_enquiries, sale_reports, sale_views, email_opt_out from anon;
revoke all on sale_views from authenticated;
revoke execute on function sale_can_list(), sale_is_seller(uuid), sale_buyer_visible(uuid), sale_member(), sale_seller_shown(sale_listings),
  sale_card(sale_listings, boolean), sale_browse(), sale_saved(), sale_detail(text), sale_similar(uuid), sale_count_view(uuid, text),
  sale_enquire(uuid, text, text, text, boolean), sale_open_thread(uuid), sale_share_docs(uuid), sale_enquiries_seen(),
  sale_unread_enquiries(), sale_set_checked(uuid, boolean), sale_set_hidden(uuid, boolean) from public, anon, authenticated;
grant execute on function sale_browse(), sale_detail(text), sale_similar(uuid), sale_count_view(uuid, text) to anon, authenticated;
grant execute on function sale_can_list(), sale_is_seller(uuid), sale_buyer_visible(uuid), sale_member(), sale_saved(),
  sale_enquire(uuid, text, text, text, boolean), sale_open_thread(uuid), sale_share_docs(uuid), sale_enquiries_seen(),
  sale_unread_enquiries(), sale_set_checked(uuid, boolean), sale_set_hidden(uuid, boolean), sale_thread_between(uuid, uuid) to authenticated;
