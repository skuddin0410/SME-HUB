-- One row per member who has been sent the welcome email. Members cannot read or write it
-- directly (RLS on, no policies); the confirm step claims it through claim_welcome_email(),
-- so a reused or double-clicked confirmation link can never send the welcome twice.
create table welcome_emails (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table welcome_emails enable row level security;

-- people who joined before this existed already know the hub: never welcome them again
insert into welcome_emails (user_id, sent_at)
select id, created_at from profiles
on conflict do nothing;

create function claim_welcome_email() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  claimed boolean;
begin
  if auth.uid() is null then
    return false;
  end if;
  insert into public.welcome_emails (user_id) values (auth.uid())
  on conflict (user_id) do nothing
  returning true into claimed;
  return coalesce(claimed, false);
end $$;

revoke all on function claim_welcome_email() from public, anon;
grant execute on function claim_welcome_email() to authenticated;
