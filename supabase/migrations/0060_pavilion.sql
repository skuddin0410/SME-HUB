-- Made in Canada Pavilion (handoff: Pavilion). Members exhibit a product, service or AI tool with the Canadian
-- claims they declare; the Hub team reviews every listing before it appears, can feature it, and handles label reports.

create table pavilion_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  by_name text not null default '' check (char_length(by_name) <= 80),
  section text not null check (section in ('make', 'serv', 'soft')),
  what text not null check (char_length(btrim(what)) between 10 and 200),
  city text not null default '' check (char_length(city) <= 60),
  province text not null default '' check (province = '' or province in ('AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT')),
  scene text not null default 'awning' check (scene in ('awning', 'ship', 'truck', 'bakery', 'bars', 'laptop', 'nodes', 'solar')),
  claims text[] not null check (cardinality(claims) between 1 and 6 and claims <@ array['poc', 'mic', 'aic', 'own', 'bic', 'data']),
  note text not null default '' check (char_length(note) <= 160),
  ai boolean not null default false,
  featured boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'removed')),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index pavilion_published on pavilion_listings (featured desc, created_at desc) where status = 'published';
create index pavilion_owner on pavilion_listings (owner_id);
alter table pavilion_listings enable row level security;

-- anyone can browse published listings; owners see their own while they wait; the team sees everything
create policy "pavilion read" on pavilion_listings for select to anon, authenticated
  using (status = 'published' and exists (select 1 from profiles p where p.id = owner_id and p.status = 'active') or owner_id = auth.uid() or is_staff());
create policy "pavilion add" on pavilion_listings for insert to authenticated with check (owner_id = auth.uid() and is_active());
create policy "pavilion change" on pavilion_listings for update to authenticated using (owner_id = auth.uid() or is_staff());
create policy "pavilion delete" on pavilion_listings for delete to authenticated using (owner_id = auth.uid() or is_staff());
revoke all on pavilion_listings from anon, authenticated;
grant select on pavilion_listings to anon, authenticated;
grant insert (owner_id, name, by_name, section, what, city, province, scene, claims, note, ai) on pavilion_listings to authenticated;
grant update (name, by_name, section, what, city, province, scene, claims, note, ai, status, featured) on pavilion_listings to authenticated;
grant delete on pavilion_listings to authenticated;

-- members cannot publish or feature their own listing, and any edit sends it back to review; 5 listings each
create function pavilion_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not is_staff() and (select count(*) from pavilion_listings where owner_id = new.owner_id and status <> 'removed') >= 5 then
      raise exception 'pavilion: up to 5 listings per member';
    end if;
    if not is_staff() then new.status := 'pending'; new.featured := false; end if;
    new.ai := new.ai and new.section = 'soft';
    return new;
  end if;
  new.owner_id := old.owner_id;
  if not is_staff() then
    new.featured := old.featured;
    -- the owner can take a listing down; anything else goes back to the team
    if new.status = 'removed' and old.status <> 'removed' then return new; end if;
    new.status := case when old.status = 'removed' then 'removed' else 'pending' end;
  end if;
  new.ai := new.ai and new.section = 'soft';
  return new;
end $$;
create trigger pavilion_guard before insert or update on pavilion_listings for each row execute function pavilion_guard();

-- "Report a label that looks wrong": goes to the Hub team, who check the claim with the business
create table pavilion_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references pavilion_listings (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  claim text not null check (claim in ('poc', 'mic', 'aic', 'own', 'bic', 'data')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id, claim)
);
alter table pavilion_reports enable row level security;
create policy "pavilion report add" on pavilion_reports for insert to authenticated
  with check (reporter_id = auth.uid() and exists (select 1 from pavilion_listings l where l.id = listing_id and l.status = 'published' and l.owner_id <> auth.uid()));
create policy "pavilion reports team" on pavilion_reports for select to authenticated using (is_staff());
create policy "pavilion reports resolve" on pavilion_reports for update to authenticated using (is_staff());
revoke all on pavilion_reports from anon, authenticated;
grant insert (listing_id, reporter_id, claim, note) on pavilion_reports to authenticated;
grant select, update (status) on pavilion_reports to authenticated;

revoke execute on function pavilion_guard() from public, anon, authenticated;
