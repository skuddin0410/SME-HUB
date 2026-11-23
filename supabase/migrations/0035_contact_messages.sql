-- Messages sent from the Contact page. Anyone can send one; only staff can read them.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and email like '%_@_%._%'),
  message text not null check (char_length(message) between 1 and 4000),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
alter table public.contact_messages enable row level security;

create policy "anyone can send a message" on public.contact_messages for insert to anon, authenticated
  with check (handled_at is null and (user_id is null or user_id = auth.uid()));
create policy "staff read messages" on public.contact_messages for select to authenticated using (public.is_staff());
create policy "staff update messages" on public.contact_messages for update to authenticated using (public.is_staff()) with check (public.is_staff());

revoke all on public.contact_messages from anon, authenticated;
grant insert (name, email, message, user_id) on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;
