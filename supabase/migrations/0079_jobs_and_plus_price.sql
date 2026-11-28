-- Updates 43 and 44: SME Hub Jobs, and Plus at $25 (the Founding Member price kept on the subscription).

-- ============================================================ Plus price
-- The price belongs to the subscription (Stripe keeps it). founding_offer now means "this subscription has the founding
-- price", so it is lost when a member cancels and starts again later. founding_claimed remembers that a member used one of
-- the 250 places, so a place never opens up again.
alter table subscriptions add column if not exists founding_claimed boolean not null default false;
update subscriptions set founding_claimed = true where founding_offer and not founding_claimed;

create or replace function apply_subscription(
  p_event text, p_type text, p_created timestamptz, p_user uuid, p_customer text,
  p_sub text, p_plan text, p_interval text, p_status text, p_period_end timestamptz, p_cancel boolean,
  p_founding boolean default false
) returns text
language plpgsql security definer set search_path = public as $$
declare cur subscriptions; new_plan text; took boolean; claimed boolean;
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

  -- the same subscription keeps its founding price; a new one has it only if it was bought with the offer
  took := (found and cur.stripe_subscription_id = p_sub and cur.founding_offer)
    or (p_founding and p_plan = 'plus' and p_status in ('active', 'trialing')
        and (coalesce(cur.founding_claimed, false)
             or (select count(*) from subscriptions where (founding_claimed or founding_offer) and user_id <> p_user) < 250));
  claimed := coalesce(cur.founding_claimed, false) or took;

  insert into subscriptions (user_id, plan, billing_interval, status, stripe_subscription_id, current_period_end, cancel_at_period_end, event_created, founding_offer, founding_claimed)
    values (p_user, p_plan, p_interval, p_status, p_sub, p_period_end, coalesce(p_cancel, false), p_created, took, claimed)
    on conflict (user_id) do update set plan = excluded.plan, billing_interval = excluded.billing_interval, status = excluded.status,
      stripe_subscription_id = excluded.stripe_subscription_id, current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end, event_created = excluded.event_created,
      founding_offer = excluded.founding_offer, founding_claimed = excluded.founding_claimed, updated_at = now();

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

create or replace function founding_offer_left() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, 250 - count(*))::int from subscriptions where founding_claimed or founding_offer;
$$;

-- ============================================================ Jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  posted_by uuid not null references profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  job_type text not null check (job_type in ('Full-time', 'Part-time', 'Contract', 'Freelance', 'Seasonal')),
  work_where text not null default 'onsite' check (work_where in ('onsite', 'hybrid', 'remote')),
  team_big boolean not null default false,                       -- 25 or more people
  pay_from numeric(10, 2) check (pay_from is null or pay_from > 0),
  pay_to numeric(10, 2) check (pay_to is null or pay_to > 0),
  pay_per text not null default 'hour' check (pay_per in ('hour', 'year', 'project')),
  description text not null check (char_length(description) between 40 and 5000),
  apply_how text not null default 'hub' check (apply_how in ('hub', 'email', 'url')),
  apply_email text check (apply_email is null or char_length(apply_email) <= 200),
  apply_url text check (apply_url is null or char_length(apply_url) <= 300),
  existing_vacancy boolean,                                      -- asked of Ontario employers with 25 or more people
  ai_used boolean,
  featured_until timestamptz,
  status text not null default 'open' check (status in ('open', 'closed', 'held', 'removed')),
  closes_at timestamptz not null default now() + interval '30 days',
  reminded_at timestamptz,
  views int not null default 0,
  created_at timestamptz not null default now(),
  check (pay_to is null or pay_from is null or pay_to >= pay_from)
);
create index if not exists jobs_open on jobs (status, closes_at desc, created_at desc);
create index if not exists jobs_company on jobs (company_id, created_at desc);
create index if not exists jobs_poster on jobs (posted_by, created_at desc);

create or replace function job_live(j jobs) returns boolean
language sql stable as $$ select j.status = 'open' and j.closes_at > now() $$;

-- who may manage a job: whoever posted it, the business page's owners and managers, and the team
create or replace function job_manager(p_job uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() or exists (select 1 from jobs j where j.id = p_job and (j.posted_by = auth.uid()
    or exists (select 1 from business_team t where t.company_id = j.company_id and t.user_id = auth.uid() and t.role in ('owner', 'manager'))))
$$;

alter table jobs enable row level security;
drop policy if exists "jobs readable" on jobs;
create policy "jobs readable" on jobs for select using (
  (status = 'open' and closes_at > now() and exists (select 1 from companies c where c.id = company_id and c.status = 'published'))
  or posted_by = auth.uid() or is_staff()
  or exists (select 1 from business_team t where t.company_id = jobs.company_id and t.user_id = auth.uid() and t.role in ('owner', 'manager'))
);
revoke all on jobs from anon, authenticated;
grant select on jobs to anon, authenticated;

create table if not exists job_saves (
  job_id uuid not null references jobs (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
alter table job_saves enable row level security;
drop policy if exists "own saved jobs" on job_saves;
create policy "own saved jobs" on job_saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on job_saves from anon, authenticated;
grant select, insert, delete on job_saves to authenticated;

create table if not exists job_referrals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  referrer_id uuid not null references profiles (id) on delete cascade,
  member_id uuid references profiles (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 120),
  email text not null default '' check (char_length(email) <= 200),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists job_referrals_job on job_referrals (job_id);
alter table job_referrals enable row level security;
drop policy if exists "referrals for the referrer and the job's managers" on job_referrals;
create policy "referrals for the referrer and the job's managers" on job_referrals for select to authenticated using (referrer_id = auth.uid() or job_manager(job_id));
revoke all on job_referrals from anon, authenticated;
grant select on job_referrals to authenticated;

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  applicant_id uuid not null references profiles (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 3000),
  cv_path text check (cv_path is null or char_length(cv_path) <= 300),
  cv_name text check (cv_name is null or char_length(cv_name) <= 200),
  share_profile boolean not null default true,
  referral_id uuid references job_referrals (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);
alter table job_applications enable row level security;
drop policy if exists "applications for the applicant and the job's managers" on job_applications;
create policy "applications for the applicant and the job's managers" on job_applications for select to authenticated using (applicant_id = auth.uid() or job_manager(job_id));
revoke all on job_applications from anon, authenticated;
grant select on job_applications to authenticated;

create table if not exists job_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  unique (job_id, reporter_id)
);
alter table job_reports enable row level security;
drop policy if exists "team reads job reports" on job_reports;
create policy "team reads job reports" on job_reports for select to authenticated using (is_staff() or reporter_id = auth.uid());
revoke all on job_reports from anon, authenticated;
grant select on job_reports to authenticated;

-- pay-for-the-job scams: training or starter-kit fees, deposits, banking details, e-transfers, gift cards, crypto
create or replace function job_scam(t text) returns boolean
language sql immutable as $$
  select coalesce(t, '') ~* '((training|registration|application|starter[- ]?kit|equipment|onboarding)\s+fees?|pay\s+(for|a)\s+(your\s+)?(training|kit|deposit|starter)|deposit\s+(of|is)\s+\$|send\s+(us\s+)?(your\s+)?bank(ing)?\s+(details|info|information)|e-?\s?transfer|gift\s?cards?|crypto|bitcoin|work from home.{0,30}\$\d{3,}\s*(a|per)\s*day)'
$$;

-- a new job also shows in the Hiring & People group, as a hiring post from the poster (a post failing never stops the job)
create or replace function job_announce(p_job uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs; c companies; g uuid;
begin
  select * into j from jobs where id = p_job and status = 'open';
  if j.id is null then return; end if;
  select * into c from companies where id = j.company_id;
  select id into g from groups where status = 'active' and not is_private and (slug like 'hiring%' or name ilike 'hiring%people%') order by created_at limit 1;
  if g is null then return; end if;
  begin
    perform set_config('app.safety_skip', '1', true);
    insert into posts (author_id, body, kind, visibility, group_id)
    values (j.posted_by, left('We’re hiring: ' || j.title || ' at ' || c.name || '. See the job and apply on SME Hub Jobs:' || E'\n\n' || '/jobs/' || j.id, 5000), 'hiring', 'public', g);
    perform set_config('app.safety_skip', '', true);
  exception when others then
    perform set_config('app.safety_skip', '', true);
    raise warning 'job_announce: %', sqlerrm;
  end;
end $$;
revoke execute on function job_announce(uuid) from public, anon, authenticated;

-- ============================================================ posting, closing
create or replace function post_job(
  p_company uuid, p_title text, p_type text, p_where text, p_big boolean, p_from numeric, p_to numeric, p_per text,
  p_desc text, p_how text, p_email text, p_url text, p_vacancy boolean, p_ai boolean, p_featured boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c companies; me profiles; ontario boolean; paid boolean; n int; feat boolean := false; jid uuid := gen_random_uuid(); held boolean := false;
  title text := btrim(coalesce(p_title, '')); body text := btrim(coalesce(p_desc, ''));
begin
  if auth.uid() is null or not is_active() then raise exception 'Sign in to post a job.'; end if;
  select * into me from profiles where id = auth.uid();
  select * into c from companies where id = p_company;
  if c.id is null or c.status <> 'published'
     or not exists (select 1 from business_team t where t.company_id = c.id and t.user_id = auth.uid() and t.role in ('owner', 'manager')) then
    raise exception 'Jobs are posted by approved business pages. Add your business page first, or ask its owner to make you a manager.';
  end if;
  if welcome_days_left(auth.uid()) > 0 and not is_staff() then
    raise exception 'safety: Job posts unlock after your welcome week|To keep fake job ads out, new members can post jobs once their first week is over.|week';
  end if;
  paid := me.plan in ('plus', 'advisor') or is_staff();
  if not paid and exists (select 1 from jobs where posted_by = auth.uid() and status in ('open', 'held') and closes_at > now()) then
    raise exception 'You already have a job open. Free members can have 1 job at a time. Close your other job, or upgrade to Plus for unlimited jobs and one featured job a month.';
  end if;
  if char_length(title) < 2 then raise exception 'Add a job title.'; end if;
  if p_type not in ('Full-time', 'Part-time', 'Contract', 'Freelance', 'Seasonal') or p_where not in ('onsite', 'hybrid', 'remote') or p_per not in ('hour', 'year', 'project') then
    raise exception 'Choose the type, where and how the pay is counted.';
  end if;
  if p_to is not null and p_from is not null and p_to < p_from then raise exception 'The “to” amount should be higher than the “from” amount.'; end if;
  if char_length(body) < 40 then raise exception 'Tell people a little more about the job (a few sentences).'; end if;
  -- Ontario's job-posting rules, for employers with 25 or more people
  ontario := upper(c.province) = 'ON' and coalesce(p_big, false);
  if ontario then
    if p_from is null then raise exception 'Ontario employers with 25 or more people must show the pay.'; end if;
    if p_per = 'year' and p_to is not null and p_to - p_from > 50000 and p_to <= 200000 then raise exception 'In Ontario a yearly pay range can’t be wider than $50,000.'; end if;
    if p_vacancy is null or p_ai is null then raise exception 'Say whether it’s an existing job and whether you use AI to screen applicants.'; end if;
    if body ~* 'canadian\s+experience' or title ~* 'canadian\s+experience' then raise exception 'Ontario job posts can’t ask for “Canadian experience”. Please take it out.'; end if;
  end if;
  if job_scam(title || ' ' || body) then raise exception 'Job posts can’t ask applicants to pay anything, buy equipment or send banking details.'; end if;
  if p_how = 'email' and coalesce(p_email, '') !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'Add the email address for applications.'; end if;
  if p_how = 'url' then
    if coalesce(p_url, '') !~* '^https?://[^\s./]+\.[^\s]+$' then raise exception 'Add the full link, starting with https://'; end if;
    if site_block_reason(split_part(regexp_replace(lower(p_url), '^https?://(www\.)?', ''), '/', 1)) is not null then
      raise exception 'That link is on our list of unsafe sites, so it can’t be used.';
    end if;
  end if;
  if p_how not in ('hub', 'email', 'url') then raise exception 'Choose how people apply.'; end if;
  -- one featured job a month (Toronto calendar month) on Plus and Advisor
  if coalesce(p_featured, false) then
    if not paid then raise exception 'Featured jobs are part of Plus. You can still post this job for free.'; end if;
    select count(*) into n from jobs where posted_by = auth.uid() and featured_until is not null
      and date_trunc('month', created_at at time zone 'America/Toronto') = date_trunc('month', now() at time zone 'America/Toronto');
    if n >= 1 and not is_staff() then raise exception 'You’ve used this month’s featured job. You can post this one without featuring it.'; end if;
    feat := true;
  end if;
  -- a new business page's first job is checked by the team before it shows
  held := not is_staff() and c.created_at > now() - interval '14 days' and not exists (select 1 from jobs where company_id = c.id);

  insert into jobs (id, company_id, posted_by, title, job_type, work_where, team_big, pay_from, pay_to, pay_per, description, apply_how, apply_email, apply_url,
                    existing_vacancy, ai_used, featured_until, status)
  values (jid, c.id, auth.uid(), left(title, 120), p_type, p_where, coalesce(p_big, false), p_from, p_to, p_per, left(body, 5000), p_how,
          case when p_how = 'email' then lower(btrim(p_email)) end, case when p_how = 'url' then btrim(p_url) end,
          case when ontario then p_vacancy end, case when ontario then p_ai end,
          case when feat then now() + interval '30 days' end, case when held then 'held' else 'open' end);
  if not held then perform job_announce(jid); end if;
  return jsonb_build_object('id', jid, 'held', held);
end $$;
revoke execute on function post_job(uuid, text, text, text, boolean, numeric, numeric, text, text, text, text, text, boolean, boolean, boolean) from public, anon;
grant execute on function post_job(uuid, text, text, text, boolean, numeric, numeric, text, text, text, text, text, boolean, boolean, boolean) to authenticated;

-- close (the poster, the page's managers), approve or remove (the team)
create or replace function job_set_status(p_job uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = p_job;
  if j.id is null or not job_manager(p_job) then raise exception 'Not allowed.'; end if;
  if p_status = 'closed' then
    update jobs set status = 'closed' where id = p_job and status in ('open', 'held');
  elsif p_status in ('open', 'removed') and is_staff() then
    update jobs set status = p_status, closes_at = case when p_status = 'open' and j.status = 'held' then now() + interval '30 days' else closes_at end where id = p_job;
    update job_reports set status = case when p_status = 'removed' then 'actioned' else 'dismissed' end where job_id = p_job and status = 'open';
    if p_status = 'open' and j.status = 'held' then perform job_announce(p_job); end if;
    insert into mod_log (actor_id, action, kind, target_id, label) values (auth.uid(), case when p_status = 'removed' then 'remove' else 'approve' end, 'business', j.company_id::text, left('Job: ' || j.title, 160));
  else
    raise exception 'Not allowed.';
  end if;
end $$;
revoke execute on function job_set_status(uuid, text) from public, anon;
grant execute on function job_set_status(uuid, text) to authenticated;

create or replace function job_view(p_job uuid) returns void
language sql security definer set search_path = public as $$
  update jobs set views = views + 1 where id = p_job and status = 'open' and posted_by is distinct from auth.uid();
$$;
grant execute on function job_view(uuid) to anon, authenticated;

-- apply on SME Hub: a note is required; a CV and the profile are optional. Recommended applicants are marked.
create or replace function apply_job(p_job uuid, p_note text, p_cv_path text, p_cv_name text, p_share boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare j jobs; aid uuid; ref uuid; em text;
begin
  if auth.uid() is null or not is_active() then raise exception 'Sign in to apply.'; end if;
  select * into j from jobs where id = p_job and status = 'open' and closes_at > now();
  if j.id is null then raise exception 'This job has closed.'; end if;
  if j.apply_how <> 'hub' then raise exception 'This job takes applications outside SME Hub.'; end if;
  if j.posted_by = auth.uid() then raise exception 'You posted this job.'; end if;
  if char_length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'Add a short note so the owner knows why you’re a good fit.'; end if;
  if (select count(*) from job_applications where applicant_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You can send up to 20 applications a day.';
  end if;
  if p_cv_path is not null and p_cv_path !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.(pdf|docx?)$') then raise exception 'Upload your CV again.'; end if;
  select email into em from auth.users where id = auth.uid();
  select id into ref from job_referrals where job_id = j.id and (member_id = auth.uid() or (member_id is null and lower(email) = lower(coalesce(em, '')))) order by created_at limit 1;
  insert into job_applications (job_id, applicant_id, note, cv_path, cv_name, share_profile, referral_id)
  values (j.id, auth.uid(), left(btrim(p_note), 3000), p_cv_path, left(p_cv_name, 200), coalesce(p_share, true), ref)
  on conflict (job_id, applicant_id) do nothing
  returning id into aid;
  if aid is null then raise exception 'You already applied for this job.'; end if;
  return aid;
end $$;
revoke execute on function apply_job(uuid, text, text, text, boolean) from public, anon;
grant execute on function apply_job(uuid, text, text, text, boolean) to authenticated;

create or replace function refer_job(p_job uuid, p_member uuid, p_name text, p_email text, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare j jobs; rid uuid;
begin
  if auth.uid() is null or not is_active() then raise exception 'Sign in to recommend someone.'; end if;
  select * into j from jobs where id = p_job and status = 'open' and closes_at > now();
  if j.id is null then raise exception 'This job has closed.'; end if;
  if p_member is not null and not is_connected(p_member) then raise exception 'Choose one of your connections.'; end if;
  if p_member is null and (char_length(btrim(coalesce(p_name, ''))) = 0 or coalesce(p_email, '') !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$') then
    raise exception 'Choose a connection, or add their name and email.';
  end if;
  if (select count(*) from job_referrals where referrer_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You can recommend up to 10 people a day.';
  end if;
  if exists (select 1 from job_referrals where job_id = j.id and referrer_id = auth.uid() and (member_id = p_member or (p_member is null and lower(email) = lower(btrim(p_email))))) then
    raise exception 'You already sent them this job.';
  end if;
  insert into job_referrals (job_id, referrer_id, member_id, name, email, note)
  values (j.id, auth.uid(), p_member, left(btrim(coalesce(p_name, '')), 120), lower(left(btrim(coalesce(p_email, '')), 200)), left(btrim(coalesce(p_note, '')), 1000))
  returning id into rid;
  return rid;
end $$;
revoke execute on function refer_job(uuid, uuid, text, text, text) from public, anon;
grant execute on function refer_job(uuid, uuid, text, text, text) to authenticated;

create or replace function report_job(p_job uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in to report a job.'; end if;
  if (select count(*) from job_reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then raise exception 'You’ve sent a lot of reports today. The team will look at them.'; end if;
  insert into job_reports (job_id, reporter_id, reason) values (p_job, auth.uid(), left(coalesce(p_reason, ''), 300)) on conflict do nothing;
end $$;
revoke execute on function report_job(uuid, text) from public, anon;
grant execute on function report_job(uuid, text) to authenticated;

-- counts for the list ("N members recommended someone") and for My job posts
create or replace function job_counts(p_ids uuid[]) returns table (job_id uuid, refs int, apps int, recommended int)
language sql stable security definer set search_path = public as $$
  select j.id,
    (select count(distinct referrer_id) from job_referrals r where r.job_id = j.id)::int,
    case when job_manager(j.id) then (select count(*) from job_applications a where a.job_id = j.id)::int else null end,
    case when job_manager(j.id) then (select count(*) from job_applications a where a.job_id = j.id and a.referral_id is not null)::int else null end
  from jobs j where j.id = any (p_ids)
$$;
grant execute on function job_counts(uuid[]) to anon, authenticated;

-- the CVs: a private bucket, read only through the server (signed links for the job's managers)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-cvs', 'job-cvs', false, 5242880, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "members upload their own CV" on storage.objects;
create policy "members upload their own CV" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-cvs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "members remove their own CV" on storage.objects;
create policy "members remove their own CV" on storage.objects for delete to authenticated
  using (bucket_id = 'job-cvs' and (storage.foldername(name))[1] = auth.uid()::text);

-- the team's overview row counts held jobs too
create or replace function safety_overview() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not is_staff() then null else jsonb_build_object(
    'held', (select count(*) from held_items where decided_at is null) + (select count(*) from jobs where status = 'held'),
    'held_oldest', least((select min(created_at) from held_items where decided_at is null), (select min(created_at) from jobs where status = 'held')),
    'tries', (select count(*) from signup_log where at > now() - interval '7 days'),
    'joined', (select count(*) from signup_log where at > now() - interval '7 days' and outcome = 'allowed'),
    'blocked', (select count(*) from signup_log where at > now() - interval '7 days' and outcome = 'blocked'),
    'reasons', coalesce((select jsonb_agg(jsonb_build_array(r, n) order by n desc) from (
        select case when reason like 'Form filled in%' then 'Form filled in too fast'
                    when reason like '%sign-up from one connection%' then 'Too many sign-ups from one connection'
                    else reason end r, count(*) n
        from signup_log where at > now() - interval '7 days' and outcome = 'blocked' group by 1) x), '[]'),
    'links_blocked', (select count(*) from held_items where created_at > now() - interval '7 days' and exists (select 1 from unnest(reasons) r where r like 'Link to a%')),
    'links_checked', (select count(*) from link_cache where checked_at > now() - interval '7 days')
  ) end
$$;
