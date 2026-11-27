-- 0057b: the rest of 0057_master_categories.sql (from the 'old names' step on).
-- Live already has the industries and specialities tables and their lists, so only this part is still to run.

-- the old names, mapped to the new list
create or replace function industry_alias(c text) returns text language sql immutable set search_path = public as $$
  select case c when 'Retail' then 'Retail & Shops' when 'Finance & Accounting' then 'Finance, Accounting & Insurance' when 'Technology' then 'Technology & IT' when 'Manufacturing' then 'Manufacturing & Makers' when 'Marketing & Design' then 'Marketing, Media & Design' when 'Health & Wellness' then 'Health & Medical' when 'Law' then 'Legal' when 'Construction' then 'Construction & Trades' when 'Logistics' then 'Logistics & Transport' when 'Food and hospitality' then 'Food & Drink' when 'Food and drink' then 'Food & Drink' when 'Professional services' then 'Professional Services' when 'Construction and trades' then 'Construction & Trades' when 'Transportation and trade' then 'Logistics & Transport' when 'Transport and logistics' then 'Logistics & Transport' when 'Energy and environment' then 'Energy & Environment' when 'Health and wellness' then 'Health & Medical' when 'Tech and online' then 'Technology & IT' when 'Finance' then 'Finance, Accounting & Insurance' else c end;
$$;

-- Business Directory: the same list, a speciality on each business ("sub"), and old categories moved across
alter table companies add column if not exists sub text not null default '' check (char_length(sub) <= 80);
update business_settings set categories = array['Food & Drink', 'Catering & Events', 'Retail & Shops', 'Online & E-commerce', 'Professional Services', 'Finance, Accounting & Insurance', 'Legal', 'Real Estate & Property', 'Construction & Trades', 'Home Services', 'Cleaning & Facilities', 'Automotive', 'Logistics & Transport', 'Manufacturing & Makers', 'Wholesale & Import/Export', 'Technology & IT', 'Marketing, Media & Design', 'Health & Medical', 'Wellness, Fitness & Beauty', 'Education & Training', 'Childcare & Family', 'Pets & Animals', 'Arts, Culture & Entertainment', 'Travel, Tourism & Hospitality', 'Agriculture & Farming', 'Energy & Environment', 'Staffing & HR', 'Security & Safety', 'Personal & Lifestyle Services', 'Non-profit & Community', 'Government & Public Sector Suppliers', 'Other'];
alter table business_settings alter column categories set default array['Food & Drink', 'Catering & Events', 'Retail & Shops', 'Online & E-commerce', 'Professional Services', 'Finance, Accounting & Insurance', 'Legal', 'Real Estate & Property', 'Construction & Trades', 'Home Services', 'Cleaning & Facilities', 'Automotive', 'Logistics & Transport', 'Manufacturing & Makers', 'Wholesale & Import/Export', 'Technology & IT', 'Marketing, Media & Design', 'Health & Medical', 'Wellness, Fitness & Beauty', 'Education & Training', 'Childcare & Family', 'Pets & Animals', 'Arts, Culture & Entertainment', 'Travel, Tourism & Hospitality', 'Agriculture & Farming', 'Energy & Environment', 'Staffing & HR', 'Security & Safety', 'Personal & Lifestyle Services', 'Non-profit & Community', 'Government & Public Sector Suppliers', 'Other'];
update companies set category = industry_alias(category) where category <> industry_alias(category);
update companies set category = 'Other' where category <> '' and not exists (select 1 from industries i where i.name = companies.category);

create or replace function companies_sub_check() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.sub <> '' and not exists (select 1 from specialities s where s.industry = new.category and s.name = new.sub) then
    raise exception 'choose a speciality from the list';
  end if;
  return new;
end $$;
drop trigger if exists companies_sub_check on companies;
create trigger companies_sub_check before insert or update of sub, category on companies for each row execute function companies_sub_check();

-- Directory search also matches the speciality and industry. p_terms holds plain word stems, with everyday words
-- such as "plumber" or "lawyer" already turned into the list's words by the site.
drop function if exists search_businesses(text, text, text, text, text, boolean, text, int, int);
create function search_businesses(
  q text default '', p_cat text default '', p_prov text default '', p_city text default '', p_kind text default '',
  p_open boolean default false, p_sort text default 'rating', p_limit int default 24, p_offset int default 0, p_terms text default ''
) returns table (id uuid, slug text, name text, category text, description text, logo_url text, cover_url text, city text, province text,
                 kind text, rating numeric, reviews int, followers int, is_open boolean, claimable boolean, sub text)
language sql stable set search_path = public as $$
  with base as (
    select c.*, r.rating as avg_rating, coalesce(r.n, 0)::int as review_n,
           business_is_open(c.hours, c.closures, c.tz) as open_now
    from companies c
    left join lateral (select round(avg(cr.rating), 1) as rating, count(*) as n from company_reviews cr where cr.company_id = c.id and cr.status = 'published') r on true
    where c.status = 'published'
      and (coalesce(q, '') = '' or c.fts @@ to_tsquery('english', q)
           or (coalesce(p_terms, '') <> '' and not exists (
                 select 1 from unnest(string_to_array(left(lower(p_terms), 200), ' ')) w
                 where w <> '' and position(w in lower(c.sub || ' ' || c.category)) = 0)))
      and (coalesce(p_cat, '') = '' or c.category = p_cat)
      and (coalesce(p_prov, '') = '' or c.province = upper(p_prov))
      and (coalesce(p_city, '') = '' or c.city = p_city)
      and (coalesce(p_kind, '') = '' or c.kind = p_kind)
  )
  select b.id, b.slug, b.name, b.category, b.description, b.logo_url, b.cover_url, b.city, b.province, b.kind,
         b.avg_rating, b.review_n, business_follower_count(b.id), b.open_now, b.claimable, b.sub
  from base b
  where not coalesce(p_open, false) or b.open_now
  order by case when p_sort = 'rating' then b.avg_rating end desc nulls last,
           case when p_sort = 'rating' then b.review_n end desc,
           case when p_sort = 'new' then b.created_at end desc,
           b.name
  limit least(greatest(coalesce(p_limit, 24), 1), 60) offset greatest(coalesce(p_offset, 0), 0);
$$;
grant execute on function search_businesses(text, text, text, text, text, boolean, text, int, int, text) to anon, authenticated;

-- Businesses for Sale: the same list
alter table sale_listings drop constraint if exists sale_listings_industry_check;
update sale_listings set industry = industry_alias(industry) where industry <> industry_alias(industry);
update sale_listings set industry = 'Other' where not exists (select 1 from industries i where i.name = sale_listings.industry);
create or replace function sale_industry_check() returns trigger
language plpgsql set search_path = public as $$
begin
  new.industry := industry_alias(new.industry);
  if not exists (select 1 from industries i where i.name = new.industry) then raise exception 'choose an industry from the list'; end if;
  return new;
end $$;
drop trigger if exists sale_industry_check on sale_listings;
create trigger sale_industry_check before insert or update of industry on sale_listings for each row execute function sale_industry_check();

-- Member Details: the industry answer uses the same list
update profile_details set core = jsonb_set(core, '{industry}', to_jsonb(industry_alias(core->>'industry')))
where core ? 'industry' and core->>'industry' <> industry_alias(core->>'industry');

-- About page: the weekly Hub briefing. Anyone may sign up; only the team can read the list.
create table if not exists briefing_signups (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  user_id uuid references profiles (id) on delete set null,
  source text not null default 'about' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);
alter table briefing_signups enable row level security;
create policy "team reads briefing sign-ups" on briefing_signups for select to authenticated using (is_staff());
revoke all on briefing_signups from anon, authenticated;
grant select on briefing_signups to authenticated;
create or replace function briefing_subscribe(p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_email is null or char_length(p_email) > 254 or lower(btrim(p_email)) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return false; end if;
  insert into briefing_signups (email, user_id) values (lower(btrim(p_email)), auth.uid()) on conflict (email) do nothing;
  return true;
end $$;
revoke execute on function briefing_subscribe(text) from public;
grant execute on function briefing_subscribe(text) to anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on industries, specialities, briefing_signups to service_role;
  end if;
end $$;
