-- Update 31: My business card. Every member gets a short link handle (smehub.ca/c/<handle>, made from their name)
-- and can make a free digital card: a style, and switches for what shows. Phone, email and website are off by default.
-- The public card page reads only the switched-on fields through card_public(); nothing else of the member is exposed.

-- ---------- handles ----------
alter table profiles add column if not exists handle text;
create unique index if not exists profiles_handle on profiles (handle);
alter table profiles drop constraint if exists profiles_handle_shape;
alter table profiles add constraint profiles_handle_shape check (handle is null or handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(handle) between 2 and 60);

-- "Isabelle Gagnon" -> isabelle-gagnon; the second one gets -2, and so on. French accents become plain letters.
create or replace function make_handle(p_name text, p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare base text; h text; n int := 1;
begin
  base := lower(translate(coalesce(p_name, ''), 'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿŒœÆæ', 'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyyOoAa'));
  base := trim(both '-' from regexp_replace(base, '[^a-z0-9]+', '-', 'g'));
  base := left(base, 50);
  base := trim(both '-' from base);
  if char_length(base) < 2 then base := 'member-' || left(replace(p_id::text, '-', ''), 6); end if;
  h := base;
  while exists (select 1 from profiles where handle = h and id <> p_id) loop
    n := n + 1;
    h := base || '-' || n;
  end loop;
  return h;
end $$;
revoke execute on function make_handle(text, uuid) from public, anon, authenticated;

create or replace function profiles_set_handle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.handle is null and coalesce(btrim(new.full_name), '') <> '' then
    new.handle := make_handle(new.full_name, new.id);
  elsif tg_op = 'UPDATE' and new.handle is distinct from old.handle and old.handle is not null
        and auth.uid() is not null and not is_staff() then
    new.handle := old.handle; -- members can't pick a handle yet; it follows their name once
  end if;
  return new;
end $$;
revoke execute on function profiles_set_handle() from public, anon, authenticated;
drop trigger if exists profiles_set_handle on profiles;
create trigger profiles_set_handle before insert or update of handle, full_name on profiles
  for each row execute function profiles_set_handle();

-- every existing member gets one, oldest first so the earliest member keeps the plain name
do $$
declare r record;
begin
  for r in select id, full_name from profiles where handle is null and coalesce(btrim(full_name), '') <> '' order by created_at loop
    update profiles set handle = make_handle(r.full_name, r.id) where id = r.id;
  end loop;
end $$;

-- ---------- the card ----------
create table if not exists business_cards (
  member_id uuid primary key references profiles (id) on delete cascade,
  style text not null default 'classic' check (style in ('classic', 'midnight', 'maple', 'minimal')),
  show_title boolean not null default true,
  show_business boolean not null default true,
  show_city boolean not null default true,
  show_phone boolean not null default false,
  show_email boolean not null default false,
  show_website boolean not null default false,
  -- card-only values; blank means "use my profile"
  title text check (char_length(title) <= 80),
  phone text check (phone is null or phone ~ '^[0-9+()\-. ]{7,25}$'),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  website text check (website is null or (char_length(website) <= 200 and website !~ '[\s<>"]')),
  searchable boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table business_cards enable row level security;
drop policy if exists "own card" on business_cards;
create policy "own card" on business_cards for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

create or replace function business_cards_touch() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists business_cards_touch on business_cards;
create trigger business_cards_touch before update on business_cards for each row execute function business_cards_touch();

-- anonymous totals only: how often the card page was opened and the contact saved, per month
create table if not exists business_card_stats (
  member_id uuid not null references profiles (id) on delete cascade,
  month date not null,
  opens int not null default 0,
  saves int not null default 0,
  primary key (member_id, month)
);
alter table business_card_stats enable row level security;
drop policy if exists "own card stats" on business_card_stats;
create policy "own card stats" on business_card_stats for select to authenticated using (member_id = auth.uid());

-- ---------- the public card ----------
-- Only what the member switched on. Values come from the card, else the profile (phone and email from the
-- profile's details), else the member's first published business. Null when the card is off, deleted, or the
-- member is suspended.
create or replace function card_public(p_handle text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; c business_cards%rowtype; core jsonb; biz record; title text; bizname text;
begin
  select * into p from profiles where handle = lower(p_handle);
  if not found or p.status <> 'active' then return null; end if;
  select * into c from business_cards where member_id = p.id;
  if not found or not c.active then return null; end if;
  select d.core into core from profile_details d where d.user_id = p.id;
  select co.id, co.slug, co.name,
         (select round(avg(r.rating)::numeric, 1) from company_reviews r where r.company_id = co.id) as rating,
         (select count(*) from company_reviews r where r.company_id = co.id) as reviews
    into biz from companies co where co.owner_id = p.id and co.status = 'published' order by co.created_at limit 1;
  title := coalesce(nullif(btrim(c.title), ''), nullif(btrim(split_part(coalesce(p.headline, ''), ',', 1)), ''));
  bizname := coalesce(biz.name, nullif(btrim(substr(coalesce(p.headline, ''), char_length(split_part(coalesce(p.headline, ''), ',', 1)) + 2)), ''));
  return jsonb_strip_nulls(jsonb_build_object(
    'id', p.id,
    'handle', p.handle,
    'name', p.full_name,
    'avatar', p.avatar_url,
    'style', c.style,
    'searchable', c.searchable,
    'title', case when c.show_title then title end,
    'business', case when c.show_business then bizname end,
    'city', case when c.show_city then nullif(btrim(p.location), '') end,
    'phone', case when c.show_phone then coalesce(nullif(btrim(c.phone), ''), nullif(btrim(core->>'phone'), '')) end,
    'email', case when c.show_email then coalesce(nullif(btrim(c.email), ''), nullif(btrim(core->>'email'), '')) end,
    'website', case when c.show_website then coalesce(nullif(btrim(c.website), ''), nullif(btrim(p.website), '')) end,
    'biz_slug', biz.slug,
    'biz_name', biz.name,
    'biz_rating', biz.rating,
    'biz_reviews', case when biz.id is not null then biz.reviews end
  ));
end $$;
revoke execute on function card_public(text) from public;
grant execute on function card_public(text) to anon, authenticated;

-- counts an open or a contact save (no visitor details are kept)
create or replace function card_count(p_handle text, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare mid uuid; m date := date_trunc('month', now() at time zone 'America/Toronto')::date;
begin
  if p_kind not in ('open', 'save') then return; end if;
  select id into mid from profiles where handle = lower(p_handle);
  if mid is null or mid = auth.uid() then return; end if;
  if not exists (select 1 from business_cards where member_id = mid and active) then return; end if;
  insert into business_card_stats (member_id, month, opens, saves)
    values (mid, m, case when p_kind = 'open' then 1 else 0 end, case when p_kind = 'save' then 1 else 0 end)
    on conflict (member_id, month) do update
      set opens = business_card_stats.opens + excluded.opens, saves = business_card_stats.saves + excluded.saves;
end $$;
revoke execute on function card_count(text, text) from public;
grant execute on function card_count(text, text) to anon, authenticated;
