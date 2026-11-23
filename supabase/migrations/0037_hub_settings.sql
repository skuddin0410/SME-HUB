-- Team settings pages (Profiles and directory, Feed, Groups, Member blogs, Hashtags, Stories).
-- One row per page; the defaults live in the app, a row only holds what the team changed.
create table if not exists public.hub_settings (
  key text primary key check (key in ('profiles','feed','groups','blogs','hashtags','stories')),
  value jsonb not null default '{}'::jsonb check (jsonb_typeof(value) = 'object' and pg_column_size(value) < 40000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.hub_settings enable row level security;

-- Settings only describe how the Hub behaves (no secrets), so every visitor may read them.
create policy "settings readable" on public.hub_settings for select to anon, authenticated using (true);
create policy "staff add settings" on public.hub_settings for insert to authenticated
  with check (public.is_staff() and (updated_by is null or updated_by = auth.uid()));
create policy "staff change settings" on public.hub_settings for update to authenticated
  using (public.is_staff()) with check (public.is_staff() and (updated_by is null or updated_by = auth.uid()));

revoke all on public.hub_settings from anon, authenticated;
grant select on public.hub_settings to anon, authenticated;
grant insert, update on public.hub_settings to authenticated;
