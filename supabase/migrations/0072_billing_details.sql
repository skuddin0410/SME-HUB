-- Update 34: Plan and billing. The member's billing details for receipts (business name, address, receipt email
-- and an optional GST/HST number). Changes apply to future receipts; they are also copied to Stripe so its
-- receipts show them. Card numbers are never stored here: Stripe keeps them.
create table if not exists billing_details (
  member_id uuid primary key references profiles (id) on delete cascade,
  business text not null check (char_length(btrim(business)) between 1 and 120),
  address text not null default '' check (char_length(address) <= 200),
  receipt_email text not null check (char_length(receipt_email) <= 254 and receipt_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  tax_number text not null default '' check (char_length(tax_number) <= 30 and tax_number ~ '^[0-9A-Za-z \-]*$'),
  updated_at timestamptz not null default now()
);
alter table billing_details enable row level security;
drop policy if exists "own billing details" on billing_details;
create policy "own billing details" on billing_details for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- This month's numbers on the page: AI questions, business pages, offers, private groups, intro calls booked
create or replace function my_plan_usage() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ai', coalesce((select asks from hub_ai_use where user_id = auth.uid() and month = date_trunc('month', now() at time zone 'America/Toronto')::date), 0),
    'pages', (select count(*) from companies where owner_id = auth.uid() and status <> 'deleted'),
    'offers', (select count(*) from posts where author_id = auth.uid() and kind = 'offer' and created_at >= date_trunc('month', now() at time zone 'America/Toronto') at time zone 'America/Toronto'),
    'groups', (select count(*) from groups where created_by = auth.uid() and is_private),
    'calls', (select count(*) from advisor_slots where advisor_id = auth.uid() and booked_by is not null and booked_at >= date_trunc('month', now() at time zone 'America/Toronto') at time zone 'America/Toronto')
  )
$$;
revoke execute on function my_plan_usage() from public, anon;
grant execute on function my_plan_usage() to authenticated;
