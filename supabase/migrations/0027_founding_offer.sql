-- The Founding Member offer: Plus for $99 in year one for the first 250 members who upgrade.
-- The discount itself is a Stripe coupon; the database counts who has used it so the offer closes at 250.
alter table subscriptions add column founding_offer boolean not null default false;

drop function apply_subscription(text, text, timestamptz, uuid, text, text, text, text, text, timestamptz, boolean);
create function apply_subscription(
  p_event text, p_type text, p_created timestamptz, p_user uuid, p_customer text,
  p_sub text, p_plan text, p_interval text, p_status text, p_period_end timestamptz, p_cancel boolean,
  p_founding boolean default false
) returns text
language plpgsql security definer set search_path = public as $$
declare cur subscriptions; new_plan text; took boolean;
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

  select * into cur from subscriptions where user_id = p_user for update;
  if found and (cur.event_created > p_created
     or (cur.stripe_subscription_id <> p_sub and p_status in ('canceled', 'incomplete_expired', 'unpaid'))) then
    update billing_events set outcome = 'stale' where id = p_event;
    return 'stale';
  end if;

  -- the offer counts once per member, and never past 250
  took := coalesce(cur.founding_offer, false)
    or (p_founding and p_plan = 'plus' and p_status in ('active', 'trialing')
        and (select count(*) from subscriptions where founding_offer and user_id <> p_user) < 250);

  insert into subscriptions (user_id, plan, billing_interval, status, stripe_subscription_id, current_period_end, cancel_at_period_end, event_created, founding_offer)
    values (p_user, p_plan, p_interval, p_status, p_sub, p_period_end, coalesce(p_cancel, false), p_created, took)
    on conflict (user_id) do update set plan = excluded.plan, billing_interval = excluded.billing_interval, status = excluded.status,
      stripe_subscription_id = excluded.stripe_subscription_id, current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end, event_created = excluded.event_created,
      founding_offer = excluded.founding_offer, updated_at = now();

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

-- how many founding places are left (public, so the Plans page can show or hide the offer)
create function founding_offer_left() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, 250 - count(*))::int from subscriptions where founding_offer;
$$;

revoke execute on function apply_subscription(text, text, timestamptz, uuid, text, text, text, text, text, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function founding_offer_left() to anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function apply_subscription(text, text, timestamptz, uuid, text, text, text, text, text, timestamptz, boolean, boolean) to service_role;
  end if;
end $$;
