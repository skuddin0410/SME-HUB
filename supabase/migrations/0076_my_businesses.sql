-- Update 40: My businesses redesign. Two things the new page needs that weren't stored before:
--   1. Page views: unique visitors to a business page in the last 30 days, not counting the page's own team.
--   2. The reason when the team turns down a page or an ownership claim, so the member sees it.

-- ---------- page views ----------
create table if not exists business_page_views (
  company_id uuid not null references companies (id) on delete cascade,
  viewer text not null check (viewer ~ '^[A-Za-z0-9:_-]{8,80}$'),   -- a member's id, or a random id for a visitor who isn't signed in
  day date not null default ((now() at time zone 'America/Toronto')::date),
  primary key (company_id, viewer, day)
);
create index if not exists business_page_views_day on business_page_views (company_id, day);
alter table business_page_views enable row level security;
revoke all on business_page_views from anon, authenticated;

-- counts one visit a day per visitor; the page's own team (and the Hub team) aren't counted
create or replace function business_seen(p_company uuid, p_visitor text) returns void
language plpgsql security definer set search_path = public as $$
declare v text := coalesce(auth.uid()::text, p_visitor);
begin
  if v is null or v !~ '^[A-Za-z0-9:_-]{8,80}$' then return; end if;
  if auth.uid() is not null and (is_staff() or exists (select 1 from business_team t where t.company_id = p_company and t.user_id = auth.uid())) then return; end if;
  if not exists (select 1 from companies c where c.id = p_company and c.status = 'published') then return; end if;
  insert into business_page_views (company_id, viewer) values (p_company, v) on conflict do nothing;
end $$;
revoke execute on function business_seen(uuid, text) from public;
grant execute on function business_seen(uuid, text) to anon, authenticated;

-- unique visitors in the last 30 days, for the page's team only
create or replace function business_views_30(p_company uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when is_staff() or exists (select 1 from business_team t where t.company_id = p_company and t.user_id = auth.uid())
    then (select count(distinct viewer)::int from business_page_views where company_id = p_company and day > ((now() at time zone 'America/Toronto')::date - 30))
    else null end
$$;
revoke execute on function business_views_30(uuid) from public, anon;
grant execute on function business_views_30(uuid) to authenticated;

-- keep a year of views at most (run by the daily clean-up below when pg_cron is there)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('business-views-trim', '17 4 * * *', $q$delete from public.business_page_views where day < current_date - 400$q$);
  end if;
exception when others then
  raise notice 'business-views-trim not scheduled: %', sqlerrm;
end $$;

-- ---------- reasons ----------
alter table companies add column if not exists reject_reason text check (reject_reason is null or char_length(reject_reason) <= 500);
alter table business_claims add column if not exists reason text check (reason is null or char_length(reason) <= 500);

-- the team's decision on a claim, with a reason when it is turned down
create or replace function decide_claim(p_claim uuid, p_approve boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform decide_claim(p_claim, p_approve);
  if not p_approve then
    update business_claims set reason = nullif(left(btrim(coalesce(p_reason, '')), 500), '') where id = p_claim;
  end if;
end $$;
revoke execute on function decide_claim(uuid, boolean, text) from public, anon;
grant execute on function decide_claim(uuid, boolean, text) to authenticated;
