-- Update 15: Grant Finder. Programs are public (visitors and search engines can read them); each member's saves,
-- tracker stage and readiness checklist are private. The Hub team adds and checks programs.
-- Final plan (SK): finding funding is free. Free: every match, unlimited saves and deadlines, checklist and tracker,
-- 10 AI questions and 1 AI draft a month. Plus: 100 AI questions and 5 AI drafts a month. Never a fee to get a grant.

create table if not exists grant_programs (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 160),
  by_org text not null default '' check (char_length(by_org) <= 200),
  type text not null check (type in ('grant', 'loan', 'tax', 'wage', 'train')),
  amount text not null default '' check (char_length(amount) <= 160),
  use_for text not null default '' check (char_length(use_for) <= 200),
  prov text not null default 'CA' check (prov in ('CA', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  deadline text not null default '' check (char_length(deadline) <= 160),
  checked text not null default '' check (char_length(checked) <= 40),
  fit text not null default '' check (char_length(fit) <= 200),
  who text[] not null default '{}',
  how text[] not null default '{}',
  url text check (url is null or url ~ '^https://'),
  active boolean not null default true,
  sort int not null default 100,
  updated_at timestamptz not null default now()
);

create table if not exists grant_saves (
  user_id uuid not null references profiles (id) on delete cascade,
  program_id text not null references grant_programs (id) on delete cascade,
  stage text not null default 'Saved' check (stage in ('Saved', 'Preparing', 'Submitted', 'Approved')),
  ready jsonb not null default '{}' check (jsonb_typeof(ready) = 'object' and pg_column_size(ready) < 500),
  created_at timestamptz not null default now(),
  primary key (user_id, program_id)
);

create table if not exists grant_ai_use (
  user_id uuid not null references profiles (id) on delete cascade,
  month date not null,
  questions int not null default 0,
  drafts int not null default 0,
  primary key (user_id, month)
);

create table if not exists grant_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  url text not null default '' check (char_length(url) <= 500),
  created_at timestamptz not null default now()
);

alter table grant_programs enable row level security;
alter table grant_saves enable row level security;
alter table grant_ai_use enable row level security;
alter table grant_suggestions enable row level security;

create policy "anyone reads active programs" on grant_programs for select to anon, authenticated using (active or is_staff());
create policy "team manages programs" on grant_programs for all to authenticated using (is_staff()) with check (is_staff());
create policy "own saves" on grant_saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own ai use" on grant_ai_use for select to authenticated using (user_id = auth.uid());
create policy "members suggest programs" on grant_suggestions for insert to authenticated with check (user_id = auth.uid());
create policy "team reads suggestions" on grant_suggestions for select to authenticated using (is_staff());

revoke all on grant_programs, grant_saves, grant_ai_use, grant_suggestions from anon, authenticated;
grant select on grant_programs to anon, authenticated;
grant insert, update, delete on grant_programs to authenticated;
grant select, insert, update, delete on grant_saves to authenticated;
grant select on grant_ai_use to authenticated;
grant select, insert on grant_suggestions to authenticated;

-- each member: up to 10 suggestions a day
create or replace function grant_suggestion_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from grant_suggestions where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'you can suggest up to 10 programs a day';
  end if;
  return new;
end $$;
create trigger grant_suggestion_limit before insert on grant_suggestions for each row execute function grant_suggestion_limit();
revoke execute on function grant_suggestion_limit() from public, anon, authenticated;

-- AI allowance for this month: questions and drafts left, by plan
create or replace function grant_ai_left() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'plus', coalesce(p.plan in ('plus', 'advisor'), false),
    'questions', (case when p.plan in ('plus', 'advisor') then 100 else 10 end) - coalesce(u.questions, 0),
    'drafts', (case when p.plan in ('plus', 'advisor') then 5 else 1 end) - coalesce(u.drafts, 0),
    'qmax', case when p.plan in ('plus', 'advisor') then 100 else 10 end,
    'dmax', case when p.plan in ('plus', 'advisor') then 5 else 1 end)
  from profiles p left join grant_ai_use u on u.user_id = p.id and u.month = date_trunc('month', now() at time zone 'America/Toronto')::date
  where p.id = auth.uid();
$$;

-- uses one AI question or draft; false when this month's allowance is used up
create or replace function grant_ai_take(p_kind text) returns boolean
language plpgsql security definer set search_path = public as $$
declare l jsonb := grant_ai_left(); m date := date_trunc('month', now() at time zone 'America/Toronto')::date;
begin
  if auth.uid() is null or l is null or p_kind not in ('question', 'draft') then return false; end if;
  if (l->>(case when p_kind = 'question' then 'questions' else 'drafts' end))::int <= 0 then return false; end if;
  insert into grant_ai_use (user_id, month, questions, drafts) values (auth.uid(), m, (p_kind = 'question')::int, (p_kind = 'draft')::int)
  on conflict (user_id, month) do update set questions = grant_ai_use.questions + (p_kind = 'question')::int, drafts = grant_ai_use.drafts + (p_kind = 'draft')::int;
  return true;
end $$;
revoke execute on function grant_ai_left(), grant_ai_take(text) from public, anon;
grant execute on function grant_ai_left(), grant_ai_take(text) to authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on grant_programs, grant_saves, grant_ai_use, grant_suggestions to service_role;
  end if;
end $$;

-- The preview's 12 programs. Real program names; amounts and dates are the preview's samples until the team checks each one.
insert into grant_programs (id, name, by_org, type, amount, use_for, prov, deadline, checked, fit, who, how, url, sort) values
('canexport', 'CanExport SMEs', 'Trade Commissioner Service (federal)', 'grant', 'Up to $50,000', 'Selling to new markets outside Canada', 'CA', 'Opens in intakes; check the official page', 'Nov 2026', 'Your business sells products you could export',
 array['Canadian business with 1 to 500 employees', 'Revenue between $100,000 and $100 million', 'Has a plan to reach a new export market'], array['Check you qualify on the official page', 'Prepare your export plan and budget', 'Apply online on the official page'], 'https://www.tradecommissioner.gc.ca/funding-financement/canexport/sme-pme/index.aspx?lang=eng', 1),
('csbfp', 'Canada Small Business Financing Program', 'Government of Canada, through your bank or credit union', 'loan', 'Up to $1,150,000', 'Equipment, leasehold improvements, property', 'CA', 'Ongoing', 'Nov 2026', 'You told us you plan to renovate your store',
 array['For-profit business in Canada', 'Revenue of $10 million or less a year'], array['Talk to your bank or credit union', 'Bring quotes for what you want to buy', 'The bank applies for the government guarantee'], 'https://ised-isde.canada.ca/site/canada-small-business-financing-program/en', 2),
('irap', 'Industrial Research Assistance Program (IRAP)', 'National Research Council of Canada', 'grant', 'Varies by project', 'Research, new products and innovation', 'CA', 'Ongoing', 'Nov 2026', 'You are building a new product',
 array['Incorporated, for-profit business', '500 employees or fewer', 'A technology project with growth potential'], array['Contact an IRAP adviser', 'Talk through your project', 'The adviser tells you if you can apply'], 'https://nrc.canada.ca/en/support-technology-innovation', 3),
('sred', 'SR&ED tax incentive', 'Canada Revenue Agency', 'tax', 'Refundable credit of up to 35% for eligible small corporations', 'Experimental development and research work', 'CA', 'Claim within 18 months of your tax year end', 'Nov 2026', 'You do product development work',
 array['Business doing eligible research or development in Canada', 'Keeps records of the work and its costs'], array['Keep records of the work as you go', 'File the claim with your tax return', 'Use the CRA forms listed on the official page'], 'https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html', 4),
('csj', 'Canada Summer Jobs', 'Employment and Social Development Canada', 'wage', 'Part of a student’s wages', 'Hiring young people for the summer', 'CA', 'Applications usually open in winter', 'Nov 2026', 'You hire summer staff',
 array['Employer with 50 or fewer full-time staff (private sector)', 'Hiring someone aged 15 to 30'], array['Watch for the next intake', 'Describe the job and the skills it teaches', 'Apply on the official page'], 'https://www.canada.ca/en/employment-social-development/services/funding/canada-summer-jobs.html', 5),
('welf', 'Women Entrepreneurship Loan Fund', 'Government of Canada, with partner lenders', 'loan', 'Up to $50,000', 'Starting or growing a business', 'CA', 'Ongoing', 'Nov 2026', 'Women-owned businesses',
 array['Business majority-owned and led by women'], array['Choose a partner lender in your region', 'Apply with your business plan'], 'https://ised-isde.canada.ca/site/women-entrepreneurship-strategy/en', 6),
('belf', 'Black Entrepreneurship Loan Fund', 'Government of Canada, with partner lenders', 'loan', 'Up to $250,000', 'Starting or growing a business', 'CA', 'Ongoing', 'Oct 2026', 'Black-owned businesses',
 array['Business majority-owned and led by Black entrepreneurs'], array['Apply through the partner organization', 'Bring your business plan and financials'], 'https://ised-isde.canada.ca/site/black-entrepreneurship-program/en', 7),
('starterplus', 'Starter Company Plus', 'Ontario, through local Small Business Enterprise Centres', 'grant', 'Up to $5,000', 'Starting or growing a small business', 'ON', 'Depends on your local centre', '', 'You are in Ontario',
 array['Ontario resident, 18 or older', 'Business is new or under 5 years old'], array['Contact your local Small Business Enterprise Centre', 'Take the training', 'Pitch your plan for the grant'], 'https://www.ontario.ca/page/starter-company-plus', 8),
('cojg', 'Canada-Ontario Job Grant', 'Ontario', 'train', 'Up to $10,000 per person trained', 'Training your staff', 'ON', 'Ongoing', '', 'You are in Ontario and have staff',
 array['Ontario employer', 'Training is from an outside trainer'], array['Choose a training course', 'Apply before the training starts'], 'https://www.ontario.ca/page/canada-ontario-job-grant', 9),
('feddev', 'FedDev Ontario business programs', 'Federal Economic Development Agency for Southern Ontario', 'loan', 'Varies by program', 'Growth, productivity and expansion', 'ON', 'Depends on the program', '', 'You are in southern Ontario',
 array['Business in southern Ontario', 'Programs change; check each one'], array['Read the current programs on the official page'], 'https://www.feddev-ontario.canada.ca/en', 10),
('bcetg', 'B.C. Employer Training Grant', 'British Columbia', 'train', 'Part of training costs', 'Training your staff', 'BC', 'Depends on the stream', '', '',
 array['B.C. employer'], array['Check which stream is open', 'Apply before the training starts'], 'https://www.workbc.ca/plan-career/education-and-training/employer-training-grant', 11),
('abjg', 'Canada-Alberta Job Grant', 'Alberta', 'train', 'Part of training costs', 'Training your staff', 'AB', 'Ongoing', '', '',
 array['Alberta employer'], array['Apply before the training starts'], 'https://www.alberta.ca/canada-alberta-job-grant', 12)
on conflict (id) do nothing;
