-- Update 42: weekly threads, the weekly group check-in, anonymous questions and group hosts.
-- Everything runs in the database: threads are created by the schedule (8 am Toronto time), the one-promotion rule,
-- who may answer, the Update 41 safety checks on replies, and an anonymous author who is never in any public response.

-- ============================================================ weekly threads
create table if not exists weekly_threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('mon', 'wed', 'fri', 'group')),
  group_id uuid references groups (id) on delete cascade,
  week_start date not null,                                   -- the Monday (Toronto) of its week
  title text not null check (char_length(title) <= 160),
  sub text not null default '' check (char_length(sub) <= 400),
  rules text[] not null default '{}',
  host_id uuid references profiles (id) on delete set null,   -- group check-ins: the group host
  advisors uuid[] not null default '{}',                      -- Ask an Advisor: who is answering this week
  opens_at timestamptz not null,
  closes_at timestamptz not null,                             -- open 7 days, then archived (still readable)
  created_at timestamptz not null default now(),
  check ((kind = 'group') = (group_id is not null))
);
create unique index if not exists weekly_threads_one on weekly_threads (kind, coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid), week_start);
create index if not exists weekly_threads_latest on weekly_threads (kind, group_id, opens_at desc);
alter table weekly_threads enable row level security;
drop policy if exists "threads readable" on weekly_threads;
create policy "threads readable" on weekly_threads for select using (
  group_id is null or not is_private_group(group_id) or is_group_member(group_id) or is_staff()
);
revoke all on weekly_threads from anon, authenticated;
grant select on weekly_threads to anon, authenticated;

create table if not exists thread_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references weekly_threads (id) on delete cascade,
  parent_id uuid references thread_replies (id) on delete cascade,     -- an Advisor's or the host's answer under a reply
  author_id uuid not null references profiles (id) on delete cascade,
  business_id uuid references companies (id) on delete set null,       -- Friday promotions: the business promoted
  body text not null check (char_length(body) between 1 and 2000),
  is_host boolean not null default false,
  is_advisor boolean not null default false,
  helpful int not null default 0,
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists thread_replies_thread on thread_replies (thread_id, created_at desc);
create index if not exists thread_replies_author on thread_replies (author_id, created_at desc);
alter table thread_replies enable row level security;
drop policy if exists "replies readable" on thread_replies;
create policy "replies readable" on thread_replies for select using (
  exists (select 1 from weekly_threads t where t.id = thread_id)       -- the thread's own rule decides
  and (hidden_at is null or author_id = auth.uid() or is_staff())
  and not has_blocked(author_id)
);
drop policy if exists "own replies removable" on thread_replies;
create policy "own replies removable" on thread_replies for delete to authenticated using (author_id = auth.uid() or is_staff());
drop policy if exists "team hides replies" on thread_replies;
create policy "team hides replies" on thread_replies for update to authenticated using (is_staff()) with check (is_staff());
revoke all on thread_replies from anon, authenticated;
grant select on thread_replies to anon, authenticated;
grant delete, update on thread_replies to authenticated;

create table if not exists thread_votes (
  reply_id uuid not null references thread_replies (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (reply_id, user_id)
);
alter table thread_votes enable row level security;
drop policy if exists "own votes" on thread_votes;
create policy "own votes" on thread_votes for select to authenticated using (user_id = auth.uid());
revoke all on thread_votes from anon, authenticated;
grant select on thread_votes to authenticated;

-- the Monday (Toronto) of the week a moment falls in, and 8 am Toronto on a given day
create or replace function toronto_week(p_at timestamptz) returns date
language sql stable as $$ select date_trunc('week', (p_at at time zone 'America/Toronto'))::date $$;
create or replace function toronto_8am(p_day date) returns timestamptz
language sql stable as $$ select (p_day + time '08:00') at time zone 'America/Toronto' $$;

-- "Ontario" from a location such as "Toronto, ON" or "Ontario"; "Canada" when it can't tell
create or replace function province_of(p_loc text) returns text
language sql immutable as $$
  select coalesce((select pname from (values
    ('ON', 'Ontario'), ('QC', 'Quebec'), ('BC', 'British Columbia'), ('AB', 'Alberta'), ('MB', 'Manitoba'), ('SK', 'Saskatchewan'),
    ('NS', 'Nova Scotia'), ('NB', 'New Brunswick'), ('NL', 'Newfoundland and Labrador'), ('PE', 'Prince Edward Island'),
    ('YT', 'Yukon'), ('NT', 'Northwest Territories'), ('NU', 'Nunavut')) v(code, pname)
    where upper(btrim(split_part(coalesce(p_loc, ''), ',', greatest(1, array_length(string_to_array(coalesce(p_loc, ''), ','), 1))))) = code
       or lower(btrim(coalesce(p_loc, ''))) = lower(pname)
       or lower(btrim(split_part(coalesce(p_loc, ''), ',', greatest(1, array_length(string_to_array(coalesce(p_loc, ''), ','), 1))))) = lower(pname)
    limit 1), 'Canada')
$$;

-- ============================================================ group hosts
alter table groups add column if not exists host_id uuid references profiles (id) on delete set null;
create or replace function group_host(p_group uuid) returns uuid
language sql stable security definer set search_path = public as $$ select coalesce(host_id, created_by) from groups where id = p_group $$;

create table if not exists host_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  group_id uuid references groups (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references profiles (id) on delete set null
);
create unique index if not exists host_requests_one_pending on host_requests (user_id) where status = 'pending';
alter table host_requests enable row level security;
drop policy if exists "own or team host requests" on host_requests;
create policy "own or team host requests" on host_requests for select to authenticated using (user_id = auth.uid() or is_staff());
revoke all on host_requests from anon, authenticated;
grant select on host_requests to authenticated;

-- "I'd like to host"
create or replace function request_host() returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not is_active() then raise exception 'Sign in to offer to host.'; end if;
  if exists (select 1 from host_requests where user_id = auth.uid() and status = 'pending') then return 'already'; end if;
  insert into host_requests (user_id) values (auth.uid());
  return 'sent';
end $$;
revoke execute on function request_host() from public, anon;
grant execute on function request_host() to authenticated;

-- the team: make a member the host of a group (they also become a group moderator), or decline
create or replace function host_decide(p_request uuid, p_group uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r host_requests; nm text;
begin
  if not is_staff() then raise exception 'Only the Hub team can do that.'; end if;
  select * into r from host_requests where id = p_request and status = 'pending' for update;
  if r.id is null then raise exception 'Someone on the team already decided this one.'; end if;
  select full_name into nm from profiles where id = r.user_id;
  if p_approve then
    if p_group is null or not exists (select 1 from groups where id = p_group and status = 'active' and not is_private) then raise exception 'Choose a public group.'; end if;
    update groups set host_id = r.user_id where id = p_group;
    insert into group_members (group_id, user_id, role) values (p_group, r.user_id, 'moderator')
      on conflict (group_id, user_id) do update set role = case when group_members.role = 'admin' then 'admin' else 'moderator' end;
    update weekly_threads set host_id = r.user_id where group_id = p_group and closes_at > now();
  end if;
  update host_requests set status = case when p_approve then 'approved' else 'declined' end, group_id = p_group, decided_at = now(), decided_by = auth.uid() where id = r.id;
  insert into mod_log (actor_id, action, kind, target_id, label) values (auth.uid(), case when p_approve then 'approve' else 'reject' end, 'member', r.user_id::text, left('Group host: ' || coalesce(nm, ''), 160));
end $$;
revoke execute on function host_decide(uuid, uuid, boolean) from public, anon;
grant execute on function host_decide(uuid, uuid, boolean) to authenticated;

-- a member is a host when they host at least one group
create or replace function is_host(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$ select exists (select 1 from groups where host_id = p_user and status = 'active') $$;

-- ============================================================ replying, voting
create or replace function safety_hold_reply(p_row thread_replies, p_reasons text[], p_where text) returns void
language sql security definer set search_path = public as $$
  insert into held_items (kind, author_id, payload, body, where_label, reasons) values ('thread_reply', p_row.author_id, to_jsonb(p_row), left(p_row.body, 4000), left(p_where, 200), p_reasons);
$$;
revoke execute on function safety_hold_reply(thread_replies, text[], text) from public, anon, authenticated;

create or replace function thread_reply(p_thread uuid, p_body text, p_parent uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t weekly_threads; me profiles; par thread_replies; r thread_replies; reasons text[];
  body text := btrim(coalesce(p_body, ''));
  advisor boolean; biz uuid;
begin
  if auth.uid() is null or not is_active() then raise exception 'Sign in to reply.'; end if;
  select * into me from profiles where id = auth.uid();
  select * into t from weekly_threads where id = p_thread;
  if t.id is null then raise exception 'This thread has ended.'; end if;
  if t.group_id is not null and is_private_group(t.group_id) and not is_group_member(t.group_id) then raise exception 'This thread has ended.'; end if;
  if t.closes_at <= now() and not is_staff() then raise exception 'This thread is archived. A new one opens on its day each week.'; end if;
  if char_length(body) not between 1 and 2000 then raise exception 'Write a reply of up to 2,000 characters.'; end if;
  if (select count(*) from thread_replies where author_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'You can post up to 20 replies an hour. Try again a little later.';
  end if;
  advisor := me.plan = 'advisor' or me.member_type = 'advisor';
  if p_parent is not null then
    select * into par from thread_replies where id = p_parent and thread_id = t.id and parent_id is null and hidden_at is null;
    if par.id is null then raise exception 'That reply isn’t here any more.'; end if;
    if not (is_staff() or (t.kind = 'wed' and advisor) or (t.kind = 'group' and auth.uid() = t.host_id)) then
      raise exception 'Only the Advisors answering this week, or the group host, can answer here.';
    end if;
  elsif t.kind = 'fri' then
    -- one promotion a week: per business page, or per member when they have no page
    select c.id into biz from business_team bt join companies c on c.id = bt.company_id
      where bt.user_id = auth.uid() and bt.role in ('owner', 'manager') and c.status = 'published' order by bt.added_at limit 1;
    if exists (select 1 from thread_replies where thread_id = t.id and parent_id is null and author_id = auth.uid())
       or exists (select 1 from held_items where kind = 'thread_reply' and decided_at is null and author_id = auth.uid() and payload ->> 'thread_id' = t.id::text and payload ->> 'parent_id' is null) then
      raise exception 'You’ve posted your promotion for this week. Next one opens on Friday.';
    end if;
    if biz is not null and exists (select 1 from thread_replies where thread_id = t.id and parent_id is null and business_id = biz) then
      raise exception 'Someone on your business page already posted this week’s promotion. Next one opens on Friday.';
    end if;
  end if;
  r := row(gen_random_uuid(), t.id, p_parent, auth.uid(), biz, body,
           t.kind = 'group' and auth.uid() = t.host_id, advisor, 0, null, now())::thread_replies;
  -- Update 41: new-member link limits, scam words, look-alike links and repeated text, as for comments
  reasons := safety_check('reply', auth.uid(), body);
  if cardinality(reasons) > 0 then
    perform safety_hold_reply(r, reasons, 'In “' || t.title || '”');
    return jsonb_build_object('held', true);
  end if;
  insert into thread_replies select r.*;
  return jsonb_build_object('id', r.id);
end $$;
revoke execute on function thread_reply(uuid, text, uuid) from public, anon;
grant execute on function thread_reply(uuid, text, uuid) to authenticated;

create or replace function thread_vote(p_reply uuid, p_on boolean) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Sign in to vote.'; end if;
  if not exists (select 1 from thread_replies r join weekly_threads t on t.id = r.thread_id
                 where r.id = p_reply and r.hidden_at is null and (t.group_id is null or not is_private_group(t.group_id) or is_group_member(t.group_id))) then
    raise exception 'That reply isn’t here any more.';
  end if;
  if p_on then
    insert into thread_votes (reply_id, user_id) values (p_reply, auth.uid()) on conflict do nothing;
  else
    delete from thread_votes where reply_id = p_reply and user_id = auth.uid();
  end if;
  update thread_replies set helpful = (select count(*) from thread_votes where reply_id = p_reply) where id = p_reply returning helpful into n;
  return n;
end $$;
revoke execute on function thread_vote(uuid, boolean) from public, anon;
grant execute on function thread_vote(uuid, boolean) to authenticated;

-- ============================================================ the schedule (hourly): threads at 8 am, host nudges
create table if not exists host_nudges (post_id uuid primary key references posts (id) on delete cascade, at timestamptz not null default now());
alter table host_nudges enable row level security;
revoke all on host_nudges from anon, authenticated;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission', 'sale_enquiry', 'deadline', 'match_booked', 'advisor_booking', 'advisor_cancel', 'lead', 'event', 'consult', 'group_question'));

create or replace function weekly_threads_tick() returns int
language plpgsql security definer set search_path = public as $$
declare
  nowt timestamp := now() at time zone 'America/Toronto';
  wk date := toronto_week(now());
  made int := 0; d date; adv uuid[]; g record; tid uuid; nadv int; wkno int;
begin
  perform set_config('app.safety_skip', '1', true);
  -- Monday: What are you working on this week?
  d := wk;
  if now() >= toronto_8am(d) then
    insert into weekly_threads (kind, week_start, title, sub, rules, opens_at, closes_at)
    values ('mon', wk, 'What are you working on this week?', 'Share one thing you want to get done this week. Come back on Friday and tell us how it went.',
            array['One goal per post, in a sentence or two', 'Cheer each other on. No pitching here.'], toronto_8am(d), toronto_8am(d) + interval '7 days')
    on conflict do nothing;
    if found then made := made + 1; end if;

    -- every public group: the weekly check-in, opened by its host
    for g in select id, name, group_host(id) host from groups where status = 'active' and not is_private loop
      insert into weekly_threads (kind, group_id, week_start, title, sub, rules, host_id, opens_at, closes_at)
      values ('group', g.id, wk, 'Weekly check-in: ' || g.name,
              'What’s your biggest question about ' || lower(replace(g.name, '&', 'and')) || ' this week? ' ||
                coalesce(split_part((select full_name from profiles where id = g.host), ' ', 1) || ', the group host, makes sure every one gets an answer.', 'Every question gets an answer.'),
              array['Questions only, one per post', 'Answer one, ask one'], g.host, toronto_8am(d), toronto_8am(d) + interval '7 days')
      on conflict do nothing
      returning id into tid;
      if tid is not null then
        made := made + 1;
        if g.host is not null then
          insert into thread_replies (thread_id, author_id, body, is_host) values (tid, g.host, 'I’ll start: what’s one thing that took longer than it should have this month?', true);
        end if;
        tid := null;
      end if;
    end loop;
  end if;
  -- Wednesday: Ask an Advisor, with this week's rota of up to 4 Advisors
  d := wk + 2;
  if now() >= toronto_8am(d) and not exists (select 1 from weekly_threads where kind = 'wed' and week_start = wk) then
    select count(*) into nadv from profiles p left join advisor_profiles a on a.user_id = p.id
      where (p.plan = 'advisor' or p.member_type = 'advisor') and p.status = 'active' and coalesce(a.active, true);
    wkno := (wk - date '2026-01-05') / 7;
    select coalesce(array_agg(id), '{}') into adv from (
      select p.id from profiles p left join advisor_profiles a on a.user_id = p.id
      where (p.plan = 'advisor' or p.member_type = 'advisor') and p.status = 'active' and coalesce(a.active, true)
      order by p.id offset case when nadv > 4 then (wkno * 4) % nadv else 0 end limit 4) x;
    if cardinality(adv) < 4 and nadv > 4 then   -- wrap around the end of the list
      select adv || coalesce(array_agg(id), '{}') into adv from (
        select p.id from profiles p left join advisor_profiles a on a.user_id = p.id
        where (p.plan = 'advisor' or p.member_type = 'advisor') and p.status = 'active' and coalesce(a.active, true) and not (p.id = any (adv))
        order by p.id limit 4 - cardinality(adv)) y;
    end if;
    insert into weekly_threads (kind, week_start, title, sub, rules, advisors, opens_at, closes_at)
    values ('wed', wk, 'Ask an Advisor', 'SME Advisors answer here every Wednesday from 12 to 2 pm ET: bookkeeping, tax, law, hiring and marketing. Ask anything, as long as it isn’t a sales pitch.',
            array['One question per post', 'Advisors give general guidance, not formal advice', 'Need more? Book a free consultation from their profile'], adv, toronto_8am(d), toronto_8am(d) + interval '7 days')
    on conflict do nothing;
    if found then made := made + 1; end if;
  end if;
  -- Friday: Wins and promote your business
  d := wk + 4;
  if now() >= toronto_8am(d) then
    insert into weekly_threads (kind, week_start, title, sub, rules, opens_at, closes_at)
    values ('fri', wk, 'Wins and promote your business', 'The one place on SME Hub to promote your business. Tell us what you do, who you help and this week’s offer. Then cheer on someone else’s win.',
            array['One promotion per business each week', 'Say who you help, not just what you sell', 'Every other day, pitches go here, not in the feed'], toronto_8am(d), toronto_8am(d) + interval '7 days')
    on conflict do nothing;
    if found then made := made + 1; end if;
  end if;

  -- a question in a group with no reply after 4 hours: tell the host (once)
  insert into host_nudges (post_id)
  select p.id from posts p join groups gr on gr.id = p.group_id
  where p.kind = 'question' and p.status = 'published' and p.hidden_at is null
    and p.created_at < now() - interval '4 hours' and p.created_at > now() - interval '3 days'
    and group_host(gr.id) is not null and group_host(gr.id) is distinct from p.author_id
    and not exists (select 1 from comments c where c.post_id = p.id)
    and not exists (select 1 from host_nudges h where h.post_id = p.id)
  on conflict do nothing;
  insert into notifications (user_id, actor_id, type, post_id, href, note)
  select group_host(p.group_id), group_host(p.group_id), 'group_question', p.id, '/posts/' || p.id,
         left('No answer yet in ' || gr.name || ': ' || coalesce(nullif(p.title, ''), p.body), 200)
  from host_nudges h join posts p on p.id = h.post_id join groups gr on gr.id = p.group_id
  where h.at > now() - interval '5 minutes';
  perform set_config('app.safety_skip', '', true);
  return made;
end $$;
revoke execute on function weekly_threads_tick() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('weekly-threads', '2 * * * *', 'select public.weekly_threads_tick()');
  end if;
exception when others then
  raise notice 'weekly-threads not scheduled: %', sqlerrm;
end $$;

-- ============================================================ anonymous questions
-- The real author is kept only in post_owners, which only the author and the team can read. posts.author_id is
-- empty for these, so no feed, search, notification or page source can ever carry it.
alter table posts alter column author_id drop not null;
alter table posts add column if not exists is_anonymous boolean not null default false;
alter table posts add column if not exists anon_where text check (anon_where is null or char_length(anon_where) <= 60);
alter table posts drop constraint if exists posts_anonymous_shape;
alter table posts add constraint posts_anonymous_shape check ((is_anonymous and author_id is null and kind = 'question') or (not is_anonymous and author_id is not null)) not valid;

create table if not exists post_owners (
  post_id uuid primary key references posts (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists post_owners_owner on post_owners (owner_id, created_at desc);
alter table post_owners enable row level security;
drop policy if exists "owner or team" on post_owners;
create policy "owner or team" on post_owners for select to authenticated using (owner_id = auth.uid() or is_staff());
revoke all on post_owners from anon, authenticated;
grant select on post_owners to authenticated;

-- when the real account is deleted, its anonymous questions go too
create or replace function post_owners_gone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from posts where id = old.post_id;
  return null;
end $$;
drop trigger if exists post_owners_gone on post_owners;
create trigger post_owners_gone after delete on post_owners for each row execute function post_owners_gone();

create or replace function post_owner(p_post uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce((select author_id from posts where id = p_post), (select owner_id from post_owners where post_id = p_post))
$$;
revoke execute on function post_owner(uuid) from public, anon, authenticated;

-- reactions and comments still notify the real author (privately)
create or replace function notify_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid := post_owner(new.post_id);
begin
  if owner is not null and owner <> new.user_id then
    insert into notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end $$;
create or replace function notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid := post_owner(new.post_id);
begin
  if owner is not null and owner <> new.author_id then
    insert into notifications (user_id, actor_id, type, post_id) values (owner, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end $$;

-- which of these posts are mine (for "You asked this anonymously")
create or replace function my_anon_posts(p_ids uuid[]) returns setof uuid
language sql stable security definer set search_path = public as $$
  select post_id from post_owners where owner_id = auth.uid() and post_id = any (p_ids)
$$;
revoke execute on function my_anon_posts(uuid[]) from public, anon;
grant execute on function my_anon_posts(uuid[]) to authenticated;

-- for the team: who really asked
create or replace function anon_owners(p_ids uuid[]) returns table (post_id uuid, owner_id uuid, full_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select o.post_id, o.owner_id, p.full_name, p.avatar_url from post_owners o join profiles p on p.id = o.owner_id where is_staff() and o.post_id = any (p_ids)
$$;
revoke execute on function anon_owners(uuid[]) from public, anon;
grant execute on function anon_owners(uuid[]) to authenticated;

-- ask a question anonymously: 3 a week; in the welcome week it always goes to Held for review first
create or replace function ask_anonymously(p_title text, p_body text, p_group uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles; pid uuid := gen_random_uuid(); reasons text[]; n int; pl jsonb; where_ text;
  body text := btrim(coalesce(p_body, '')); title text := btrim(coalesce(p_title, ''));
begin
  if auth.uid() is null or not is_active() then raise exception 'Sign in to ask a question.'; end if;
  select * into me from profiles where id = auth.uid();
  if char_length(body) not between 1 and 5000 then raise exception 'Write your question first.'; end if;
  if char_length(title) > 120 then raise exception 'Keep the title to 120 characters.'; end if;
  if p_group is not null then
    if not is_group_member(p_group) then raise exception 'Join the group to ask there.'; end if;
    if exists (select 1 from groups where id = p_group and status <> 'active') then raise exception 'This group is archived, so it takes no new posts.'; end if;
  end if;
  select (select count(*) from post_owners where owner_id = auth.uid() and created_at > now() - interval '7 days')
       + (select count(*) from held_items where author_id = auth.uid() and kind = 'post' and (payload ->> 'is_anonymous')::boolean and created_at > now() - interval '7 days' and coalesce(decision, '') <> 'approve')
    into n;
  if n >= 3 then raise exception 'safety: That’s the most anonymous questions for this week|You can ask up to 3 questions anonymously a week. You can still ask under your own name.'; end if;
  if (select count(*) from post_owners where owner_id = auth.uid() and created_at > now() - interval '1 hour')
     + (select count(*) from posts where author_id = auth.uid() and created_at > now() - interval '1 hour') >= safety_num('posts', 5) and not is_staff() then
    raise exception 'safety: That’s the most posts for now|You can post up to % times an hour. Try again a little later.', safety_num('posts', 5);
  end if;

  where_ := province_of(me.location);
  pl := jsonb_build_object('id', pid, 'author_id', null, 'body', body, 'title', title, 'kind', 'question', 'visibility', 'public',
                                'group_id', p_group, 'is_anonymous', true, 'anon_where', where_, '_owner', auth.uid());
  reasons := safety_check('post', auth.uid(), title || ' ' || body);   -- raises for links in the welcome week
  if welcome_days_left(auth.uid()) > 0 and not is_staff() then reasons := reasons || 'Anonymous question from a new member'::text; end if;
  if cardinality(reasons) > 0 then
    insert into held_items (kind, author_id, payload, body, where_label, reasons)
    values ('post', auth.uid(), pl,
            left(coalesce(nullif(title, '') || E'\n', '') || body, 4000), case when p_group is not null then 'In a group · anonymous' else 'Feed · anonymous' end, reasons || 'Asked anonymously'::text);
    return jsonb_build_object('held', true);
  end if;
  perform set_config('app.safety_skip', '1', true);
  insert into posts (id, author_id, body, title, kind, visibility, group_id, is_anonymous, anon_where)
  values (pid, null, body, title, 'question', 'public', p_group, true, where_);
  insert into post_owners (post_id, owner_id) values (pid, auth.uid());
  perform set_config('app.safety_skip', '', true);
  return jsonb_build_object('id', pid);
end $$;
revoke execute on function ask_anonymously(text, text, uuid) from public, anon;
grant execute on function ask_anonymously(text, text, uuid) to authenticated;

-- the asker can remove their anonymous question
create or replace function delete_anon_post(p_post uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from post_owners where post_id = p_post and owner_id = auth.uid()) and not is_staff() then raise exception 'Not allowed.'; end if;
  delete from posts where id = p_post and is_anonymous;
end $$;
revoke execute on function delete_anon_post(uuid) from public, anon;
grant execute on function delete_anon_post(uuid) to authenticated;

-- ============================================================ Held for review covers replies and anonymous questions
alter table held_items drop constraint if exists held_items_kind_check;
alter table held_items add constraint held_items_kind_check check (kind in ('post', 'comment', 'message', 'thread_reply'));

create or replace function held_decide(p_id uuid, p_decision text, p_reason text) returns held_items
language plpgsql security definer set search_path = public as $$
declare h held_items; tbl text; cols text; payload jsonb;
begin
  if not is_staff() then raise exception 'Only the Hub team can do that.'; end if;
  if p_decision not in ('approve', 'remove', 'limit', 'suspend') then raise exception 'Unknown decision.'; end if;
  select * into h from held_items where id = p_id and decided_at is null for update;
  if h.id is null then raise exception 'Someone on the team already decided this one.'; end if;
  if p_decision = 'approve' then
    tbl := case h.kind when 'post' then 'posts' when 'comment' then 'comments' when 'thread_reply' then 'thread_replies' else 'messages' end;
    payload := h.payload - '_owner';
    select string_agg(quote_ident(column_name), ', ') into cols from information_schema.columns
      where table_schema = 'public' and table_name = tbl and is_generated = 'NEVER' and column_name in (select jsonb_object_keys(payload));
    perform set_config('app.safety_skip', '1', true);
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)', tbl, cols, cols, tbl) using payload;
    if h.payload ? '_owner' then
      insert into post_owners (post_id, owner_id) values ((h.payload ->> 'id')::uuid, (h.payload ->> '_owner')::uuid);
    end if;
    perform set_config('app.safety_skip', '', true);
  elsif p_decision = 'limit' then
    update profiles set limited_until = now() + interval '7 days' where id = h.author_id;
  elsif p_decision = 'suspend' then
    update profiles set status = 'suspended' where id = h.author_id;
  end if;
  update held_items set decided_at = now(), decided_by = auth.uid(), decision = p_decision where id = p_id returning * into h;
  insert into mod_log (actor_id, action, kind, target_id, label, reason)
  values (auth.uid(), case p_decision when 'approve' then 'approve' when 'limit' then 'limit' when 'suspend' then 'suspend' else 'remove' end, 'held', h.id::text, left(h.body, 120), nullif(left(coalesce(p_reason, ''), 300), ''));
  return h;
end $$;

-- thread replies the team hides are logged like posts
create or replace function mod_log_thread_replies() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hidden_at is distinct from old.hidden_at then
    insert into mod_log (actor_id, action, kind, target_id, label) values (auth.uid(), case when new.hidden_at is null then 'unhide' else 'hide' end, 'post', new.id::text, left(new.body, 120));
  end if;
  return null;
end $$;
drop trigger if exists mod_log_thread_replies on thread_replies;
create trigger mod_log_thread_replies after update of hidden_at on thread_replies for each row execute function mod_log_thread_replies();

-- the threads that exist this week, straight away (the schedule keeps them coming)
select weekly_threads_tick();
