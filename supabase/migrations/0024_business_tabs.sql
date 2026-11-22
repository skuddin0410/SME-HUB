-- Phase 4 (finish): the Photos, Shop, Events and Jobs tabs of a business page.
-- Same rules as services: anyone can read what the page shows, owners and managers change it, each list has a cap.

create table business_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  url text not null,
  caption text not null default '' check (char_length(caption) <= 140),
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint business_photos_ours check (url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%' or url like 'https://picsum.photos/seed/%')
);
create index business_photos_company on business_photos (company_id, position, created_at);

create table business_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  photo_url text,
  price numeric(10, 2) not null check (price >= 0),
  available boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint business_products_photo_ours check (photo_url is null or photo_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/%' or photo_url like 'https://picsum.photos/seed/%')
);
create index business_products_company on business_products (company_id, position, created_at);

create table business_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1500),
  job_type text not null default 'full-time' check (job_type in ('full-time', 'part-time', 'contract', 'seasonal', 'internship')),
  location text not null default '' check (char_length(location) <= 100),
  apply_url text not null default '' check (char_length(apply_url) <= 200),
  open boolean not null default true,
  created_at timestamptz not null default now()
);
create index business_jobs_company on business_jobs (company_id, open, created_at desc);

create table business_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '' check (char_length(location) <= 120),
  url text not null default '' check (char_length(url) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index business_events_company on business_events (company_id, starts_at);

do $$
declare t text;
begin
  foreach t in array array['business_photos', 'business_products', 'business_jobs', 'business_events'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%1$s follow the page" on %1$I for select using (exists (select 1 from companies c where c.id = company_id))', t);
    execute format('create policy "%1$s added by editors" on %1$I for insert to authenticated with check (biz_can(company_id, ''edit''))', t);
    execute format('create policy "%1$s changed by editors" on %1$I for update to authenticated using (biz_can(company_id, ''edit'')) with check (biz_can(company_id, ''edit''))', t);
    execute format('create policy "%1$s removed by editors" on %1$I for delete to authenticated using (biz_can(company_id, ''edit''))', t);
    execute format('grant select on %I to anon, authenticated', t);
    execute format('grant insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- caps, checked as the database owner so the count is always complete
create function business_list_cap() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int := tg_argv[0]::int; have int;
begin
  if auth.uid() is null then return new; end if;
  execute format('select count(*) from %I where company_id = $1', tg_table_name) into have using new.company_id;
  if have >= cap then raise exception 'This list can have up to % items.', cap; end if;
  return new;
end $$;
revoke execute on function business_list_cap() from public, anon, authenticated;
create trigger business_photos_cap before insert on business_photos for each row execute function business_list_cap('30');
create trigger business_products_cap before insert on business_products for each row execute function business_list_cap('60');
create trigger business_jobs_cap before insert on business_jobs for each row execute function business_list_cap('20');
create trigger business_events_cap before insert on business_events for each row execute function business_list_cap('40');
