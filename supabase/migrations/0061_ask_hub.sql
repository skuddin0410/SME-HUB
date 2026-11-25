-- Ask the Hub (handoff: Ask the Hub AI). Members ask business questions; the answer is built from member posts,
-- members who can help and member businesses, and written by an AI model on the server when one is set up.
-- Each plan has a monthly allowance (plan_limits.ai_per_month: Free 10, Plus 100, Advisor 100). The team is not limited.

create table hub_ai_use (
  user_id uuid not null references profiles (id) on delete cascade,
  month date not null,
  asks int not null default 0 check (asks >= 0),
  primary key (user_id, month)
);
alter table hub_ai_use enable row level security;
create policy "own hub ai use" on hub_ai_use for select to authenticated using (user_id = auth.uid());
revoke all on hub_ai_use from anon, authenticated;
grant select on hub_ai_use to authenticated;

create table ai_asks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 3 and 500),
  answer text not null default '' check (char_length(answer) <= 6000),
  sources jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index ai_asks_user on ai_asks (user_id, created_at desc);
alter table ai_asks enable row level security;
create policy "own asks" on ai_asks for select to authenticated using (user_id = auth.uid());
create policy "forget an ask" on ai_asks for delete to authenticated using (user_id = auth.uid());
revoke all on ai_asks from anon, authenticated;
grant select, delete on ai_asks to authenticated;

create function hub_ai_month() returns date language sql stable as $$ select date_trunc('month', now() at time zone 'America/Toronto')::date $$;

-- {"used": 3, "limit": 10} for the signed-in member (limit null = no limit)
create function hub_ai_left() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'used', coalesce((select asks from hub_ai_use where user_id = auth.uid() and month = hub_ai_month()), 0),
    'limit', case when is_staff() then null else (select l.value from plan_limits l join profiles p on l.plan = coalesce(p.plan, 'free') where p.id = auth.uid() and l.key = 'ai_per_month') end);
$$;

-- takes one question from this month's allowance; false when it is used up
create function hub_ai_take() returns boolean
language plpgsql security definer set search_path = public as $$
declare lim int; used int;
begin
  if auth.uid() is null or not is_active() then return false; end if;
  if not is_staff() then
    select l.value into lim from plan_limits l join profiles p on l.plan = coalesce(p.plan, 'free') where p.id = auth.uid() and l.key = 'ai_per_month';
  end if;
  insert into hub_ai_use (user_id, month, asks) values (auth.uid(), hub_ai_month(), 0) on conflict do nothing;
  select asks into used from hub_ai_use where user_id = auth.uid() and month = hub_ai_month() for update;
  if lim is not null and used >= lim then return false; end if;
  update hub_ai_use set asks = asks + 1 where user_id = auth.uid() and month = hub_ai_month();
  return true;
end $$;

-- saves an answer to the member's history (called by the server right after hub_ai_take)
create function hub_ai_save(p_question text, p_answer text, p_sources jsonb) returns uuid
language sql security definer set search_path = public as $$
  insert into ai_asks (user_id, question, answer, sources)
  select auth.uid(), left(btrim(p_question), 500), left(coalesce(p_answer, ''), 6000), coalesce(p_sources, '{}'::jsonb)
  where auth.uid() is not null
  returning id;
$$;

revoke execute on function hub_ai_left(), hub_ai_take(), hub_ai_save(text, text, jsonb) from public, anon;
grant execute on function hub_ai_left(), hub_ai_take(), hub_ai_save(text, text, jsonb) to authenticated;
