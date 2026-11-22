-- Phase 6: plans and billing.
-- Stripe is the source of truth for money; these tables mirror what the site needs. Only the webhook
-- (the server's service role) writes them, through apply_subscription, which:
--   * handles each Stripe event once (the event id is the key),
--   * ignores events older than the one already applied (Stripe may deliver out of order),
--   * ignores the end of an old subscription once a newer one exists,
--   * moves profiles.plan, and the downgrade rules then run.

create table billing_customers (
  user_id uuid primary key references profiles (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table subscriptions (
  user_id uuid primary key references profiles (id) on delete cascade,
  plan text not null check (plan in ('plus', 'advisor')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  status text not null,
  stripe_subscription_id text not null unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  event_created timestamptz not null,
  updated_at timestamptz not null default now()
);

create table billing_events (
  id text primary key,
  type text not null,
  user_id uuid references profiles (id) on delete set null,
  outcome text not null,
  received_at timestamptz not null default now()
);
create index on billing_events (received_at desc);

alter table billing_customers enable row level security;
alter table subscriptions enable row level security;
alter table billing_events enable row level security;
create policy "own customer record" on billing_customers for select to authenticated using (user_id = auth.uid());
create policy "own subscription" on subscriptions for select to authenticated using (user_id = auth.uid() or is_staff());
create policy "team reads billing events" on billing_events for select to authenticated using (is_staff());
revoke all on billing_customers, subscriptions, billing_events from anon, authenticated;
grant select on billing_customers, subscriptions, billing_events to authenticated;

-- ---------- applying a Stripe event ----------
create function apply_subscription(
  p_event text, p_type text, p_created timestamptz, p_user uuid, p_customer text,
  p_sub text, p_plan text, p_interval text, p_status text, p_period_end timestamptz, p_cancel boolean
) returns text
language plpgsql security definer set search_path = public as $$
declare cur subscriptions; new_plan text;
begin
  if p_plan not in ('plus', 'advisor') or p_interval not in ('month', 'year') then
    raise exception 'Unknown plan or interval';
  end if;
  if not exists (select 1 from profiles where id = p_user) then
    insert into billing_events (id, type, outcome) values (p_event, p_type, 'unknown member') on conflict do nothing;
    return 'unknown member';
  end if;
  insert into billing_events (id, type, user_id, outcome) values (p_event, p_type, p_user, 'applied') on conflict do nothing;
  if not found then return 'duplicate'; end if;

  if p_customer is not null then
    insert into billing_customers (user_id, stripe_customer_id) values (p_user, p_customer)
      on conflict (user_id) do update set stripe_customer_id = excluded.stripe_customer_id;
  end if;

  select * into cur from subscriptions where user_id = p_user;
  if found and (cur.event_created > p_created
     or (cur.stripe_subscription_id <> p_sub and p_status in ('canceled', 'incomplete_expired', 'unpaid'))) then
    update billing_events set outcome = 'stale' where id = p_event;
    return 'stale';
  end if;

  insert into subscriptions (user_id, plan, billing_interval, status, stripe_subscription_id, current_period_end, cancel_at_period_end, event_created)
    values (p_user, p_plan, p_interval, p_status, p_sub, p_period_end, coalesce(p_cancel, false), p_created)
    on conflict (user_id) do update set plan = excluded.plan, billing_interval = excluded.billing_interval, status = excluded.status,
      stripe_subscription_id = excluded.stripe_subscription_id, current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end, event_created = excluded.event_created, updated_at = now();

  -- a payment that is only late keeps the plan; a half-finished checkout changes nothing yet
  if p_status in ('active', 'trialing', 'past_due') then
    new_plan := p_plan;
  elsif p_status in ('incomplete') then
    return 'applied';
  else
    new_plan := 'free';
  end if;
  update profiles set plan = new_plan where id = p_user and plan is distinct from new_plan;
  return 'applied';
end $$;

-- ---------- downgrade rules ----------
-- Nothing a member made is deleted when their plan drops. Private groups beyond the new limit
-- (keeping the oldest) are archived: still readable, no new posts. They come back when the plan does.
create function enforce_plan_limits(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare lim int;
begin
  lim := limit_for(p_user, 'private_groups');
  if lim is not null then
    update groups set status = 'archived'
      where id in (select id from groups where created_by = p_user and is_private and status = 'active'
                   order by created_at, id offset lim);
  end if;
end $$;

create function profiles_plan_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enforce_plan_limits(new.id);
  return new;
end $$;
create trigger profiles_plan_changed after update of plan on profiles
  for each row when (old.plan is distinct from new.plan) execute function profiles_plan_changed();

-- restoring an archived private group needs room under the plan limit
create or replace function group_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare s group_settings; lim int;
begin
  if auth.uid() is null or is_staff() then return new; end if;
  if new.created_by is distinct from old.created_by or new.is_private is distinct from old.is_private
     or new.is_sample is distinct from old.is_sample or new.slug is distinct from old.slug then
    raise exception 'Only the team can change that.';
  end if;
  if new.status is distinct from old.status then
    select * into s from group_settings;
    if not (s.archive and old.status in ('active', 'archived') and new.status in ('active', 'archived')) then
      raise exception 'Only the team can change that.';
    end if;
    if new.status = 'active' and new.is_private then
      lim := limit_for(new.created_by, 'private_groups');
      if lim is not null and (select count(*) from groups where created_by = new.created_by and is_private and status = 'active' and id <> new.id) >= lim then
        raise exception 'Your plan allows % private group(s). Upgrade to bring this one back.', lim;
      end if;
    end if;
  end if;
  if new.join_mode = 'open' and old.join_mode <> 'open' and new.is_private then
    raise exception 'A private group is joined by request or invitation.';
  end if;
  return new;
end $$;

-- ---------- grants ----------
revoke execute on function enforce_plan_limits(uuid), profiles_plan_changed() from public, anon, authenticated;
revoke execute on function apply_subscription(text, text, timestamptz, uuid, text, text, text, text, text, timestamptz, boolean) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function apply_subscription(text, text, timestamptz, uuid, text, text, text, text, text, timestamptz, boolean) to service_role;
    grant select, insert, update on billing_customers, subscriptions, billing_events to service_role;
  end if;
end $$;
