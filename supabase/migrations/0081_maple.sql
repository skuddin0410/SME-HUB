-- Updates 46 to 48: Maple, SME Hub's AI assistant (adapted from the design's maple_backend/maple_setup.sql).
-- Members never write the chat or the library directly: the maple-ask and maple-admin Edge Functions
-- (and the Hub's own server) write with the server key, after checking the user.
-- Differences from the design file, to fit this Hub:
--   * the Hub team is is_staff() (team_roles), and the plan is profiles.plan, not app_metadata
--   * the monthly allowance comes from plan_limits.ai_per_month (Free 10, Plus 100, Advisor 100)
--   * each Maple message keeps its buttons, sources and people in "meta", so the history shows them again
--   * the vector parts run only where the "vector" extension exists (Supabase has it)
-- Safe to run more than once.

-- ---------------------------------------------------------------------
-- 1. Answer library: answers the Hub team approves once and Maple reuses.
-- ---------------------------------------------------------------------
create table if not exists maple_answers (
  id            bigint generated always as identity primary key,
  question      text not null check (char_length(question) between 5 and 300),
  variants      text[] not null default '{}',          -- other ways members ask it
  answer        text not null check (char_length(answer) between 20 and 2000),
  sources       jsonb not null default '[]'::jsonb,    -- [{ "title": "...", "url": "https://..." }]
  lang          text not null default 'en' check (lang in ('en', 'fr')),
  status        text not null default 'draft' check (status in ('draft', 'approved', 'needs_review', 'retired')),
  checked_on    date,                                   -- when the facts were last checked
  review_by     date,                                   -- check again by this date (taxes, grants)
  times_used    integer not null default 0,
  tokens_saved  bigint not null default 0,
  created_by    uuid references auth.users (id) on delete set null,
  approved_by   uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists maple_answers_status_idx on maple_answers (status, review_by);
create index if not exists maple_answers_created_by_idx on maple_answers (created_by);
create index if not exists maple_answers_approved_by_idx on maple_answers (approved_by);
alter table maple_answers enable row level security;

drop policy if exists "Hub team reads answers" on maple_answers;
create policy "Hub team reads answers" on maple_answers for select to authenticated using (is_staff());
drop policy if exists "Hub team adds answers" on maple_answers;
create policy "Hub team adds answers" on maple_answers for insert to authenticated with check (is_staff());
drop policy if exists "Hub team edits answers" on maple_answers;
create policy "Hub team edits answers" on maple_answers for update to authenticated using (is_staff()) with check (is_staff());
-- No delete policy: answers are retired, not deleted, so the history stays.

-- ---------------------------------------------------------------------
-- 2. Each member's chat with Maple. Members can read, rate and delete their own.
-- ---------------------------------------------------------------------
create table if not exists maple_messages (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  role           text not null check (role in ('member', 'maple')),
  body           text not null check (char_length(body) <= 4000),
  route          text check (route in ('hub', 'library', 'small', 'large', 'limit', 'refused')),
  answer_id      bigint references maple_answers (id) on delete set null,
  meta           jsonb not null default '{}'::jsonb,    -- buttons, sources, people and posts shown with the answer
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  cached_tokens  integer not null default 0,
  feedback       smallint check (feedback in (-1, 1)),
  created_at     timestamptz not null default now()
);
create index if not exists maple_messages_user_idx on maple_messages (user_id, created_at desc);
create index if not exists maple_messages_answer_idx on maple_messages (answer_id);
create index if not exists maple_messages_recent_idx on maple_messages (created_at) where role = 'member';
alter table maple_messages enable row level security;

drop policy if exists "Members read their own Maple chat" on maple_messages;
create policy "Members read their own Maple chat" on maple_messages for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Members rate Maple answers in their own chat" on maple_messages;
create policy "Members rate Maple answers in their own chat" on maple_messages for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Members delete their own Maple history" on maple_messages;
create policy "Members delete their own Maple history" on maple_messages for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 3. Each member's Maple settings (Settings > Maple).
-- ---------------------------------------------------------------------
create table if not exists maple_settings (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  enabled      boolean not null default true,
  use_profile  boolean not null default true,
  show_tips    boolean not null default true,
  updated_at   timestamptz not null default now()
);
alter table maple_settings enable row level security;
drop policy if exists "Members read their own Maple settings" on maple_settings;
create policy "Members read their own Maple settings" on maple_settings for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Members create their own Maple settings" on maple_settings;
create policy "Members create their own Maple settings" on maple_settings for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Members change their own Maple settings" on maple_settings;
create policy "Members change their own Maple settings" on maple_settings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 4. Monthly usage per member: questions, and tokens spent by route.
-- ---------------------------------------------------------------------
create table if not exists maple_usage (
  user_id         uuid not null references auth.users (id) on delete cascade,
  month           date not null,                       -- first day of the month
  questions       integer not null default 0,          -- counts against the plan limit
  today           date not null default current_date,
  questions_today integer not null default 0,          -- daily cap against abuse
  hub_answers     integer not null default 0,
  library_answers integer not null default 0,
  small_answers   integer not null default 0,
  large_answers   integer not null default 0,
  input_tokens    bigint not null default 0,
  output_tokens   bigint not null default 0,
  cached_tokens   bigint not null default 0,
  primary key (user_id, month)
);
alter table maple_usage enable row level security;
drop policy if exists "Members see their own Maple usage" on maple_usage;
create policy "Members see their own Maple usage" on maple_usage for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 5. Server-only functions (called with the server key).
-- ---------------------------------------------------------------------

-- The member's monthly allowance: plan_limits.ai_per_month for their plan (Free 10, Plus and Advisor 100).
-- The Hub team has no monthly limit (null), only the daily cap.
create or replace function maple_monthly_limit(p_user uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from team_roles t where t.user_id = p_user) then null
    else coalesce((select l.value from plan_limits l join profiles p on l.plan = coalesce(p.plan, 'free') where p.id = p_user and l.key = 'ai_per_month'),
                  case (select coalesce(p.plan, 'free') from profiles p where p.id = p_user) when 'free' then 10 else 100 end, 10)
  end;
$$;

-- Count a question before answering. False when over the monthly limit or the daily cap,
-- in one atomic step so two tabs can't double-spend. A null monthly limit means none.
create or replace function maple_take_question(p_user uuid, p_monthly_limit integer, p_daily_cap integer) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_ok boolean;
begin
  insert into public.maple_usage (user_id, month) values (p_user, v_month) on conflict (user_id, month) do nothing;
  update public.maple_usage u
     set questions_today = case when u.today = current_date then u.questions_today + 1 else 1 end,
         today = current_date,
         questions = u.questions + 1
   where u.user_id = p_user and u.month = v_month
     and (p_monthly_limit is null or u.questions < p_monthly_limit)
     and (u.today <> current_date or u.questions_today < p_daily_cap)
  returning true into v_ok;
  return coalesce(v_ok, false);
end $$;

-- Record how a question was answered and what it cost.
create or replace function maple_record_usage(p_user uuid, p_route text, p_in integer, p_out integer, p_cached integer) returns void
language sql security invoker set search_path = '' as $$
  update public.maple_usage
     set hub_answers     = hub_answers     + (p_route = 'hub')::int,
         library_answers = library_answers + (p_route = 'library')::int,
         small_answers   = small_answers   + (p_route = 'small')::int,
         large_answers   = large_answers   + (p_route = 'large')::int,
         input_tokens    = input_tokens  + coalesce(p_in, 0),
         output_tokens   = output_tokens + coalesce(p_out, 0),
         cached_tokens   = cached_tokens + coalesce(p_cached, 0)
   where user_id = p_user and month = date_trunc('month', now())::date;
$$;

-- Questions the AI answered for at least p_min_members different members in the last 30 days.
-- Text and counts only, never who asked, so the team can write answers without reading anyone's chat.
create or replace function maple_repeated_questions(p_min_members integer default 3)
returns table (question text, times_asked bigint, members bigint, last_asked timestamptz)
language sql stable security invoker set search_path = '' as $$
  select min(m.body) as question, count(*) as times_asked, count(distinct m.user_id) as members, max(m.created_at) as last_asked
    from public.maple_messages m
   where m.role = 'member'
     and m.created_at > now() - interval '30 days'
     and m.route in ('small', 'large')
   group by lower(regexp_replace(trim(m.body), '[^a-zA-Z0-9À-ÿ ]', '', 'g'))
  having count(distinct m.user_id) >= p_min_members
   order by count(distinct m.user_id) desc, count(*) desc
   limit 50;
$$;

-- Count a reused library answer and the AI tokens it saved.
create or replace function maple_use_answer(p_id bigint, p_tokens_saved integer) returns void
language sql security invoker set search_path = '' as $$
  update public.maple_answers
     set times_used = times_used + 1, tokens_saved = tokens_saved + greatest(coalesce(p_tokens_saved, 0), 0)
   where id = p_id;
$$;

revoke execute on function maple_monthly_limit(uuid) from public, anon, authenticated;
revoke execute on function maple_take_question(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function maple_record_usage(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke execute on function maple_repeated_questions(integer) from public, anon, authenticated;
revoke execute on function maple_use_answer(bigint, integer) from public, anon, authenticated;
grant execute on function maple_monthly_limit(uuid) to service_role;
grant execute on function maple_take_question(uuid, integer, integer) to service_role;
grant execute on function maple_record_usage(uuid, text, integer, integer, integer) to service_role;
grant execute on function maple_repeated_questions(integer) to service_role;
grant execute on function maple_use_answer(bigint, integer) to service_role;

-- The signed-in member's questions this month: {"used": 3, "limit": 10} (limit null = no monthly limit).
create or replace function maple_left() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'used', coalesce((select u.questions from maple_usage u where u.user_id = auth.uid() and u.month = date_trunc('month', now())::date), 0),
    'limit', maple_monthly_limit(auth.uid()));
$$;
revoke execute on function maple_left() from public, anon;
grant execute on function maple_left() to authenticated;

-- ---------------------------------------------------------------------
-- 6. Data API access. Members use it only for their own history, rating and settings.
-- ---------------------------------------------------------------------
revoke all on maple_messages, maple_settings, maple_usage, maple_answers from anon;
revoke update on maple_messages from authenticated;
grant select, delete on maple_messages to authenticated;
grant update (feedback) on maple_messages to authenticated;     -- the rating only, never the text or token counts
grant select, insert, update on maple_settings to authenticated;
grant select on maple_usage to authenticated;
grant select, insert, update on maple_answers to authenticated;   -- row level security limits this to the Hub team
grant all on maple_answers, maple_messages, maple_settings, maple_usage to service_role;

-- ---------------------------------------------------------------------
-- 7. Keep updated_at honest.
-- ---------------------------------------------------------------------
create or replace function maple_touch() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
revoke execute on function maple_touch() from public, anon, authenticated;
drop trigger if exists maple_answers_touch on maple_answers;
create trigger maple_answers_touch before update on maple_answers for each row execute function maple_touch();
drop trigger if exists maple_settings_touch on maple_settings;
create trigger maple_settings_touch before update on maple_settings for each row execute function maple_touch();

-- ---------------------------------------------------------------------
-- 8. Matching by meaning (Titan Text Embeddings V2, 512 numbers). Needs the "vector" extension,
--    which Supabase has; skipped where it isn't installed (a local test database).
-- ---------------------------------------------------------------------
do $do$
begin
  if not exists (select 1 from pg_available_extensions where name = 'vector') then
    raise notice 'vector extension not available: Maple answer matching skipped';
    return;
  end if;
  create extension if not exists vector with schema extensions;
  alter table public.maple_answers add column if not exists embedding extensions.vector(512);
  -- only approved answers are searched, so index just those rows
  create index if not exists maple_answers_embedding_idx on public.maple_answers
    using hnsw (embedding extensions.vector_cosine_ops) where status = 'approved';
  execute $f$
    create or replace function public.maple_match_answer(p_embedding extensions.vector(512), p_lang text, p_min_similarity double precision default 0.88)
    returns table (id bigint, question text, answer text, sources jsonb, checked_on date, similarity double precision)
    language sql stable security invoker set search_path = '' as $q$
      select a.id, a.question, a.answer, a.sources, a.checked_on,
             1 - (a.embedding operator(extensions.<=>) p_embedding) as similarity
        from public.maple_answers a
       where a.status = 'approved'
         and a.lang = p_lang
         and a.embedding is not null
         and (a.review_by is null or a.review_by >= current_date)
         and 1 - (a.embedding operator(extensions.<=>) p_embedding) >= p_min_similarity
       order by a.embedding operator(extensions.<=>) p_embedding
       limit 1;
    $q$
  $f$;
  revoke execute on function public.maple_match_answer(extensions.vector, text, double precision) from public, anon, authenticated;
  grant execute on function public.maple_match_answer(extensions.vector, text, double precision) to service_role;
end
$do$;

-- ---------------------------------------------------------------------
-- 9. Retention: DECISION NEEDED (same period as the Privacy policy). Example, 12 months with pg_cron:
-- select cron.schedule('maple-retention', '17 3 * * *',
--   $$delete from public.maple_messages where created_at < now() - interval '12 months'$$);
-- ---------------------------------------------------------------------
