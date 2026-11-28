-- Update 41: Safety and trust (bots, spam and phishing).
-- Every rule here runs in the database, so it holds whether a request comes from the site, the API or a script:
--   * sign-up log (the team's Sign-ups tab), throwaway-email domains
--   * welcome week for new members, and daily or hourly limits for everyone
--   * link checks against the team's blocked sites and look-alikes of smehub.ca and canadiansme.ca
--   * "Held for review": posts, comments and messages the automatic checks stop before anyone sees them
--   * protected names (nobody can call themselves "SME Hub Support")
-- Google Web Risk and Cloudflare Turnstile are checked by the server (they need keys); their results land here.

-- ---------- the team's settings ----------
create table if not exists safety_config (
  id int primary key default 1 check (id = 1),
  cfg jsonb not null default '{"bot":true,"code":true,"throwaway":true,"perIp":3,"days":7,"fast":3,"links":false,"conn":10,"msgs":20,"groups":false,"offers":false,"allConn":50,"allMsgs":100,"posts":5,"dupes":3,"webrisk":true,"leave":true,"twostep":true,"paidLinks":false}',
  words text[] not null default array['password','one-time code','6-digit code','gift card','bitcoin','crypto','wire the money','e-transfer deposit','verify your account','account will be closed','WhatsApp me','Telegram'],
  names text[] not null default array['SME Hub','CanadianSME','Support','Admin','Moderator','Official','Verification'],
  allow_email text[] not null default '{}',     -- email domains the team allowed although they are on the throwaway list
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);
insert into safety_config (id) values (1) on conflict do nothing;
-- when the server last refreshed the temporary-inbox list (weekly)
alter table safety_config add column if not exists list_at timestamptz;
alter table safety_config enable row level security;
drop policy if exists "members read the safety rules" on safety_config;
create policy "members read the safety rules" on safety_config for select to authenticated using (true);
drop policy if exists "team changes the safety rules" on safety_config;
create policy "team changes the safety rules" on safety_config for update to authenticated using (is_staff()) with check (is_staff());
revoke all on safety_config from anon, authenticated;
grant select, update on safety_config to authenticated;

create or replace function safety_cfg() returns jsonb
language sql stable security definer set search_path = public as $$ select cfg from safety_config where id = 1 $$;
create or replace function safety_num(k text, d int) returns int
language sql stable security definer set search_path = public as $$ select coalesce((select (cfg ->> k)::int from safety_config where id = 1), d) $$;
create or replace function safety_on(k text, d boolean) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce((select (cfg ->> k)::boolean from safety_config where id = 1), d) $$;

-- ---------- sign-ups ----------
create table if not exists signup_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  email_masked text not null default '' check (char_length(email_masked) <= 120),
  outcome text not null check (outcome in ('allowed', 'blocked')),
  reason text not null default '' check (char_length(reason) <= 120),
  country text not null default '' check (char_length(country) <= 8)
);
create index if not exists signup_log_at on signup_log (at desc);
alter table signup_log enable row level security;
drop policy if exists "team reads sign-ups" on signup_log;
create policy "team reads sign-ups" on signup_log for select to authenticated using (is_staff());
revoke all on signup_log from anon, authenticated;
grant select on signup_log to authenticated;

-- temporary-inbox domains (a maintained public list, refreshed weekly by the server; this is a starting set)
create table if not exists disposable_domains (domain text primary key check (domain ~ '^[a-z0-9.-]{3,253}$'));
insert into disposable_domains (domain) values
  ('mailinator.com'),('yopmail.com'),('10minutemail.com'),('guerrillamail.com'),('tempmail.com'),('temp-mail.org'),('trashmail.com'),
  ('sharklasers.com'),('getnada.com'),('dispostable.com'),('maildrop.cc'),('throwawaymail.com'),('mintemail.com'),('fakeinbox.com'),
  ('mohmal.com'),('emailondeck.com'),('tempail.com'),('tempinbox.com'),('spamgourmet.com'),('mailnesia.com'),('mytemp.email'),('tmpmail.org')
on conflict do nothing;
alter table disposable_domains enable row level security;
revoke all on disposable_domains from anon, authenticated;

create or replace function email_is_throwaway(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select safety_on('throwaway', true)
    and exists (select 1 from disposable_domains d where d.domain = lower(split_part(p_email, '@', 2)))
    and not (lower(split_part(p_email, '@', 2)) = any (select lower(unnest(allow_email)) from safety_config where id = 1))
$$;
revoke execute on function email_is_throwaway(text) from public, anon, authenticated;

-- ---------- sites ----------
create table if not exists blocked_sites (
  domain text primary key check (domain ~ '^[a-z0-9.-]{3,253}$'),
  why text not null default 'Phishing or look-alike' check (char_length(why) <= 80),
  added_by uuid references profiles (id) on delete set null,      -- null: added automatically (Google Web Risk)
  seen int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists allowed_sites (
  domain text primary key check (domain ~ '^[a-z0-9.-]{3,253}$'),
  added_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
insert into allowed_sites (domain) values ('canada.ca'), ('bdc.ca'), ('cra-arc.gc.ca'), ('zoom.us') on conflict do nothing;
alter table blocked_sites enable row level security;
alter table allowed_sites enable row level security;
drop policy if exists "team manages blocked sites" on blocked_sites;
create policy "team manages blocked sites" on blocked_sites for all to authenticated using (is_staff()) with check (is_staff());
drop policy if exists "team manages allowed sites" on allowed_sites;
create policy "team manages allowed sites" on allowed_sites for all to authenticated using (is_staff()) with check (is_staff());
revoke all on blocked_sites, allowed_sites from anon, authenticated;
grant select, insert, update, delete on blocked_sites, allowed_sites to authenticated;

-- Google Web Risk answers, kept 30 minutes as its terms ask (server only)
create table if not exists link_cache (domain text primary key, bad text, checked_at timestamptz not null default now());
alter table link_cache enable row level security;
revoke all on link_cache from anon, authenticated;

-- "Don't warn me again about this site"
create table if not exists link_trust (
  user_id uuid not null references profiles (id) on delete cascade,
  domain text not null check (domain ~ '^[a-z0-9.-]{3,253}$'),
  primary key (user_id, domain)
);
alter table link_trust enable row level security;
drop policy if exists "own trusted sites" on link_trust;
create policy "own trusted sites" on link_trust for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on link_trust from anon, authenticated;
grant select, insert, delete on link_trust to authenticated;

-- swapped-letter tricks: Cyrillic and Greek letters that look like Latin ones
create or replace function safety_fold(t text) returns text
language sql immutable as $$
  select translate(lower(coalesce(t, '')), 'аеорсхуіјѕԁһӏνοαεκмтвн', 'aeopcxyijsdhlvoaekmtbh')
$$;

-- the domains in a piece of text (http, www or a bare name.tld)
create or replace function safety_domains(t text) returns text[]
language sql immutable as $$
  select coalesce(array_agg(distinct d), '{}') from (
    select regexp_replace(regexp_replace(lower(m[1]), '^(https?://)?(www\.)?', ''), '[/?#:].*$', '') as d
    from regexp_matches(coalesce(t, ''), '((?:https?://|www\.)[^\s<>"'']+|\m[[:alnum:]-]+(?:\.[[:alnum:]-]+)*\.(?:com|ca|net|org|io|co|xyz|biz|info|ly|me|app|shop|online|site|link|click|top)\M[^\s<>"'']*)', 'gi') as m
  ) x where d ~ '\.'
$$;

create or replace function safety_has_link(t text) returns boolean
language sql immutable as $$ select cardinality(safety_domains(t)) > 0 $$;

-- why a domain is blocked: the team's list, then look-alikes of our own sites (allowed sites never are)
create or replace function site_block_reason(p_domain text) returns text
language plpgsql stable security definer set search_path = public as $$
declare d text := regexp_replace(lower(coalesce(p_domain, '')), '^www\.', ''); f text; w text;
begin
  if d = '' then return null; end if;
  if d ~ '(^|\.)(smehub|canadiansme)\.ca$' then return null; end if;
  if exists (select 1 from allowed_sites a where d = a.domain or d like '%.' || a.domain) then return null; end if;
  select why into w from blocked_sites b where d = b.domain or d like '%.' || b.domain order by length(b.domain) desc limit 1;
  if w is not null then return w; end if;
  f := safety_fold(d);
  if f ~ '(smehub|sme-hub)' then return 'Look-alike of SME Hub'; end if;
  if f ~ '(canadiansme|canadian-sme)' then return 'Look-alike of CanadianSME'; end if;
  return null;
end $$;
grant execute on function site_block_reason(text) to anon, authenticated;

-- ---------- welcome week ----------
alter table profiles add column if not exists limited_until timestamptz;     -- "Limit for 7 days" from the team
alter table profiles add column if not exists safety_ok_at timestamptz;      -- "Looks fine" from the team

-- days of welcome week left for a member (0 = none): 7 days, or 3 after a profile photo and one connection
create or replace function welcome_days_left(p_user uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare p profiles; quick boolean; target int; age int;
begin
  select * into p from profiles where id = p_user;
  if p.id is null then return 0; end if;
  if exists (select 1 from team_roles where user_id = p_user) then return 0; end if;
  if p.limited_until is not null and p.limited_until > now() then
    return greatest(1, ceil(extract(epoch from p.limited_until - now()) / 86400)::int);
  end if;
  quick := p.avatar_url is not null and exists (select 1 from connections c where c.status = 'accepted' and (c.requester_id = p_user or c.addressee_id = p_user));
  target := case when quick then safety_num('fast', 3) else safety_num('days', 7) end;
  age := ((now() at time zone 'America/Toronto')::date - (p.created_at at time zone 'America/Toronto')::date) + 1;   -- day 1 is the day they joined
  return greatest(0, target - age + 1);
end $$;
grant execute on function welcome_days_left(uuid) to authenticated;

-- what the Home page's Welcome week card shows
create or replace function my_welcome_week() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when welcome_days_left(auth.uid()) = 0 then null else jsonb_build_object(
    'left', welcome_days_left(auth.uid()),
    'days', safety_num('days', 7), 'fast', safety_num('fast', 3),
    'day', ((now() at time zone 'America/Toronto')::date - (p.created_at at time zone 'America/Toronto')::date) + 1,
    'photo', p.avatar_url is not null,
    'conn', exists (select 1 from connections c where c.status = 'accepted' and (c.requester_id = p.id or c.addressee_id = p.id)),
    'conn_day', safety_num('conn', 10), 'msgs_day', safety_num('msgs', 20),
    'limited', p.limited_until is not null and p.limited_until > now())
  end from profiles p where p.id = auth.uid()
$$;
revoke execute on function my_welcome_week() from public, anon;
grant execute on function my_welcome_week() to authenticated;

-- paid by card: a strong sign the member is real (only used when the team turns "paidLinks" on)
create or replace function safety_paid(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select safety_on('paidLinks', false) and exists (select 1 from profiles where id = p_user and plan in ('plus', 'advisor'))
$$;

create or replace function safety_staff(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$ select exists (select 1 from team_roles where user_id = p_user) $$;

-- who the rules apply to: a member acting for themselves. Rows written by the server (no signed-in member), on someone's
-- behalf (an introduction that turns into a connection request, a for-sale enquiry copied into a thread), approved by the
-- team, or written by the team are not checked again.
create or replace function safety_skip(p_actor uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select current_setting('app.safety_skip', true) = '1' or auth.uid() is null or auth.uid() is distinct from p_actor or safety_staff(p_actor)
$$;

create or replace function safety_today() returns timestamptz
language sql stable as $$ select (date_trunc('day', now() at time zone 'America/Toronto')) at time zone 'America/Toronto' $$;

-- ---------- held for review ----------
create table if not exists held_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('post', 'comment', 'message')),
  author_id uuid not null references profiles (id) on delete cascade,
  payload jsonb not null,                  -- the row exactly as it was sent, put in place if the team approves it
  body text not null default '',
  where_label text not null default '' check (char_length(where_label) <= 200),
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references profiles (id) on delete set null,
  decision text check (decision in ('approve', 'remove', 'limit', 'suspend'))
);
create index if not exists held_items_open on held_items (created_at desc) where decided_at is null;
alter table held_items enable row level security;
drop policy if exists "team reads held items" on held_items;
create policy "team reads held items" on held_items for select to authenticated using (is_staff());
revoke all on held_items from anon, authenticated;
grant select on held_items to authenticated;

-- the checks for one piece of text. Raises "safety: ..." for a hard stop; returns the reasons to hold it (empty: fine)
create or replace function safety_check(p_kind text, p_author uuid, p_text text) returns text[]
language plpgsql volatile security definer set search_path = public as $$
declare
  left_days int := welcome_days_left(p_author);
  day_n int;
  reasons text[] := '{}';
  d text; why text; hits text[] := '{}'; w text; n int; norm text;
  low text := lower(coalesce(p_text, ''));
begin
  if safety_skip(p_author) then return '{}'; end if;
  if exists (select 1 from profiles where id = p_author and status = 'suspended') then
    raise exception 'safety: Your account is suspended. Email support@smehub.ca if you think this is a mistake.';
  end if;
  if left_days > 0 and p_kind <> 'broadcast' and not safety_on('links', false) and not safety_paid(p_author) and safety_has_link(p_text) then
    raise exception 'safety: Links unlock after your welcome week|%|week', case p_kind
      when 'post' then 'Your post has a link in it. Take the link out to post it now, or post it in a few days.'
      when 'comment' then 'Take the link out of your comment to post it now.'
      when 'message' then 'Take the link out of your message to send it now.'
      when 'reply' then 'Take the link out of your reply to post it now.'
      else 'Take the link out to post it now, or post it in a few days.' end;
  end if;
  -- links to blocked or look-alike sites
  foreach d in array safety_domains(p_text) loop
    why := site_block_reason(d);
    if why is not null then
      reasons := reasons || case when why like 'Look-alike%' then 'Link to a look-alike site' else 'Link to a blocked site' end;
      update blocked_sites set seen = seen + 1 where domain = d;
    end if;
  end loop;
  -- scam words from new members
  if left_days > 0 then
    select (now() at time zone 'America/Toronto')::date - (created_at at time zone 'America/Toronto')::date + 1 into day_n from profiles where id = p_author;
    foreach w in array (select words from safety_config where id = 1) loop
      if position(lower(w) in low) > 0 then hits := hits || w; end if;
    end loop;
    if cardinality(hits) > 0 then
      reasons := reasons || ('Scam words: ' || array_to_string(hits[1:3], ', ')) || ('New member (day ' || day_n || ')');
    end if;
  end if;
  -- the same text again and again
  norm := btrim(regexp_replace(low, '\s+', ' ', 'g'));
  if length(norm) >= 20 then
    select count(*) into n from (
      select btrim(coalesce(title, '') || ' ' || body) as body from posts where author_id = p_author and created_at > now() - interval '7 days'
      union all select body from comments where author_id = p_author and created_at > now() - interval '7 days'
      union all select body from held_items where author_id = p_author and created_at > now() - interval '7 days'
      union all select body from messages where p_kind = 'message' and sender_id = p_author and created_at > now() - interval '1 day'
    ) x where btrim(regexp_replace(lower(x.body), '\s+', ' ', 'g')) = norm;
    if n + 1 >= safety_num('dupes', 3) then
      reasons := reasons || case when p_kind = 'message' then 'Same text sent to ' || (n + 1) || ' members' else 'Same text posted ' || (n + 1) || ' times' end;
    end if;
  end if;
  -- a sender whose name pretends to be the Hub team (names set before the rule existed)
  if exists (select 1 from profiles p, unnest((select names from safety_config where id = 1)) nm
             where p.id = p_author and safety_fold(p.full_name) ~* ('\m' || regexp_replace(lower(nm), '([.+*?^$(){}|\[\]\\])', '\\\1', 'g') || '\M')) then
    reasons := reasons || ('Look-alike name: “' || (select full_name from profiles where id = p_author) || '”');
  end if;
  return reasons;
end $$;
revoke execute on function safety_check(text, uuid, text) from public, anon, authenticated;

create or replace function safety_hold(p_kind text, p_author uuid, p_row jsonb, p_body text, p_where text, p_reasons text[]) returns void
language sql security definer set search_path = public as $$
  insert into held_items (kind, author_id, payload, body, where_label, reasons) values (p_kind, p_author, p_row, left(coalesce(p_body, ''), 4000), left(coalesce(p_where, ''), 200), p_reasons);
$$;
revoke execute on function safety_hold(text, uuid, jsonb, text, text, text[]) from public, anon, authenticated;

-- did the member's last save just get held? (so the screen can say "being checked" instead of "saved")
create or replace function safety_just_held() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from held_items where author_id = auth.uid() and decided_at is null and created_at > now() - interval '20 seconds')
$$;
revoke execute on function safety_just_held() from public, anon;
grant execute on function safety_just_held() to authenticated;

-- posts: offers in the welcome week, posts an hour, then the checks above
create or replace function safety_posts() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text[]; n int;
begin
  if safety_skip(new.author_id) then return new; end if;
  if new.kind = 'offer' and welcome_days_left(new.author_id) > 0 and not safety_on('offers', false) then
    raise exception 'safety: Offers unlock after your welcome week|You can post questions, wins and introductions now. Offers open up in a few days.|week';
  end if;
  select count(*) into n from posts where author_id = new.author_id and created_at > now() - interval '1 hour';
  if n >= safety_num('posts', 5) then raise exception 'safety: That’s the most posts for now|You can post up to % times an hour. Try again a little later.', safety_num('posts', 5); end if;
  r := safety_check('post', new.author_id, btrim(coalesce(new.title, '') || ' ' || coalesce(new.body, '')));
  if cardinality(r) > 0 then
    perform safety_hold('post', new.author_id, to_jsonb(new), coalesce(nullif(new.title, '') || E'\n', '') || coalesce(new.body, ''),
      case when new.group_id is not null then 'In a group' when new.business_id is not null then 'As a business' else 'Feed' end, r);
    return null;
  end if;
  return new;
end $$;
drop trigger if exists safety_posts on posts;
create trigger safety_posts before insert on posts for each row execute function safety_posts();

create or replace function safety_comments() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text[];
begin
  if safety_skip(new.author_id) then return new; end if;
  r := safety_check('comment', new.author_id, new.body);
  if cardinality(r) > 0 then
    perform safety_hold('comment', new.author_id, to_jsonb(new), new.body,
      left('On “' || coalesce((select coalesce(nullif(title, ''), left(body, 60)) from posts where id = new.post_id), 'a post') || '”', 200), r);
    return null;
  end if;
  return new;
end $$;
drop trigger if exists safety_comments on comments;
create trigger safety_comments before insert on comments for each row execute function safety_comments();

create or replace function safety_messages() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text[]; n int; cap int;
begin
  if current_setting('app.system_message', true) = '1' or safety_skip(new.sender_id) then return new; end if;
  cap := case when welcome_days_left(new.sender_id) > 0 then safety_num('msgs', 20) else safety_num('allMsgs', 100) end;
  select count(*) into n from messages where sender_id = new.sender_id and created_at >= safety_today();
  if n >= cap then
    raise exception 'safety: That’s the most messages for today|You can send up to % messages a day%. More tomorrow.%', cap,
      case when welcome_days_left(new.sender_id) > 0 then ' in your welcome week' else '' end, case when welcome_days_left(new.sender_id) > 0 then '|week' else '' end;
  end if;
  r := safety_check('message', new.sender_id, new.body);
  if cardinality(r) > 0 then
    perform safety_hold('message', new.sender_id, to_jsonb(new), new.body, 'To ' || coalesce((select full_name from profiles where id = new.recipient_id), 'a member'), r);
    return null;
  end if;
  return new;
end $$;
drop trigger if exists safety_messages on messages;
create trigger safety_messages before insert on messages for each row execute function safety_messages();

create or replace function safety_connections() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int; cap int;
begin
  if safety_skip(new.requester_id) then return new; end if;
  if exists (select 1 from profiles where id = new.requester_id and status = 'suspended') then raise exception 'safety: Your account is suspended. Email support@smehub.ca if you think this is a mistake.'; end if;
  cap := case when welcome_days_left(new.requester_id) > 0 then safety_num('conn', 10) else safety_num('allConn', 50) end;
  select count(*) into n from connections where requester_id = new.requester_id and created_at >= safety_today();
  if n >= cap then
    raise exception 'safety: That’s the most connection requests for today|You can send up to % a day%. This stops spam accounts from adding everyone at once.%', cap,
      case when welcome_days_left(new.requester_id) > 0 then ' in your welcome week' else '' end, case when welcome_days_left(new.requester_id) > 0 then '|week' else '' end;
  end if;
  return new;
end $$;
drop trigger if exists safety_connections on connections;
create trigger safety_connections before insert on connections for each row execute function safety_connections();

create or replace function safety_groups() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if safety_skip(new.created_by) then return new; end if;
  if welcome_days_left(new.created_by) > 0 and not safety_on('groups', false) then
    raise exception 'safety: Starting groups unlocks after your welcome week|You can join and post in groups now. Starting your own opens up in a few days.|week';
  end if;
  return new;
end $$;
drop trigger if exists safety_groups on groups;
create trigger safety_groups before insert on groups for each row execute function safety_groups();

create or replace function safety_sale() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if safety_skip(new.seller_id) then return new; end if;
  if welcome_days_left(new.seller_id) > 0 and not safety_on('offers', false) then
    raise exception 'safety: Listing a business for sale unlocks after your welcome week|You can browse and save listings now.|week';
  end if;
  return new;
end $$;
drop trigger if exists safety_sale on sale_listings;
create trigger safety_sale before insert on sale_listings for each row execute function safety_sale();

-- a group admin's message to every member: checked once (not once per member), and it doesn't count against the daily cap
create or replace function message_group_members(p_group uuid, p_body text) returns int
language plpgsql security definer set search_path = public as $$
declare n int; body text := btrim(coalesce(p_body, ''));
begin
  if auth.uid() is null or not is_active() then raise exception 'Sign in to send a message.'; end if;
  if not is_group_admin(p_group) then raise exception 'Only the group admin can message all members.'; end if;
  if not (select msg_all from group_settings) then raise exception 'Messaging all members is switched off right now.'; end if;
  if not exists (select 1 from groups where id = p_group and status = 'active') then raise exception 'This group is not active.'; end if;
  if char_length(body) not between 1 and 4000 then raise exception 'Write a message of up to 4,000 characters.'; end if;
  if (select count(*) from group_broadcasts where group_id = p_group and created_at > now() - interval '1 day') >= 3 then
    raise exception 'You can message all members up to 3 times a day.';
  end if;
  if cardinality(safety_check('broadcast', auth.uid(), body)) > 0 then
    raise exception 'safety: This message can’t go to every member. Take out links to unknown sites and any request for codes, passwords or money, then try again.';
  end if;
  perform set_config('app.system_message', '1', true);
  insert into messages (sender_id, recipient_id, body)
    select auth.uid(), user_id, body from group_members where group_id = p_group and user_id <> auth.uid();
  get diagnostics n = row_count;
  perform set_config('app.system_message', '', true);
  insert into group_broadcasts (group_id, sender_id, recipients) values (p_group, auth.uid(), n);
  return n;
end $$;

-- ---------- protected names ----------
create or replace function safety_name_taken(p_name text) returns text
language sql stable security definer set search_path = public as $$
  -- the first protected name a name uses (letters that look alike count), or null
  select nm from unnest((select names from safety_config where id = 1)) nm
  where safety_fold(p_name) ~* ('\m' || regexp_replace(lower(nm), '([.+*?^$(){}|\[\]\\])', '\\\1', 'g') || '\M') limit 1
$$;

create or replace function safety_profile_name() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if current_setting('app.safety_skip', true) = '1' or auth.uid() is null or is_staff() then return new; end if;
  if tg_op = 'UPDATE' and new.full_name is not distinct from old.full_name then return new; end if;
  nm := safety_name_taken(new.full_name);
  if nm is not null then raise exception 'safety: Names can’t include “%”, so nobody can pretend to be the SME Hub team.', nm; end if;
  return new;
end $$;
drop trigger if exists safety_profile_name on profiles;
create trigger safety_profile_name before update of full_name on profiles for each row execute function safety_profile_name();

create or replace function safety_company_name() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if current_setting('app.safety_skip', true) = '1' or auth.uid() is null or is_staff() then return new; end if;
  if tg_op = 'UPDATE' and new.name is not distinct from old.name then return new; end if;
  nm := safety_name_taken(new.name);
  if nm is not null then raise exception 'safety: Business names can’t include “%”, so nobody can pretend to be the SME Hub team.', nm; end if;
  return new;
end $$;
drop trigger if exists safety_company_name on companies;
create trigger safety_company_name before insert or update of name on companies for each row execute function safety_company_name();

-- ---------- the log covers the new team actions ----------
alter table mod_log drop constraint if exists mod_log_action_check;
alter table mod_log add constraint mod_log_action_check check (action in ('hide', 'unhide', 'suspend', 'unsuspend', 'remove', 'restore', 'reject', 'approve', 'dismiss', 'limit', 'unlimit', 'block', 'unblock', 'settings', 'cleared'));
alter table mod_log drop constraint if exists mod_log_kind_check;
alter table mod_log add constraint mod_log_kind_check check (kind in ('post', 'member', 'story', 'course_review', 'business', 'business_review', 'advisor_review', 'pavilion', 'held', 'site', 'safety'));
alter table mod_log add column if not exists reason text check (reason is null or char_length(reason) <= 300);

-- the team's decision on a held item. Approve puts the row in place exactly as it was sent.
create or replace function held_decide(p_id uuid, p_decision text, p_reason text) returns held_items
language plpgsql security definer set search_path = public as $$
declare h held_items; tbl text; cols text;
begin
  if not is_staff() then raise exception 'Only the Hub team can do that.'; end if;
  if p_decision not in ('approve', 'remove', 'limit', 'suspend') then raise exception 'Unknown decision.'; end if;
  select * into h from held_items where id = p_id and decided_at is null for update;
  if h.id is null then raise exception 'Someone on the team already decided this one.'; end if;
  if p_decision = 'approve' then
    tbl := case h.kind when 'post' then 'posts' when 'comment' then 'comments' else 'messages' end;
    select string_agg(quote_ident(column_name), ', ') into cols from information_schema.columns
      where table_schema = 'public' and table_name = tbl and is_generated = 'NEVER' and column_name in (select jsonb_object_keys(h.payload));
    perform set_config('app.safety_skip', '1', true);
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)', tbl, cols, cols, tbl) using h.payload;
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
revoke execute on function held_decide(uuid, text, text) from public, anon;
grant execute on function held_decide(uuid, text, text) to authenticated;

-- the team's other safety actions, each written to the audit log (who, when, what, why)
create or replace function safety_log(p_action text, p_kind text, p_target text, p_label text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Only the Hub team can do that.'; end if;
  insert into mod_log (actor_id, action, kind, target_id, label, reason)
  values (auth.uid(), p_action, p_kind, left(coalesce(p_target, ''), 200), left(coalesce(p_label, ''), 160), nullif(left(coalesce(p_reason, ''), 300), ''));
end $$;
revoke execute on function safety_log(text, text, text, text, text) from public, anon;
grant execute on function safety_log(text, text, text, text, text) to authenticated;

-- "Looks fine", "Limit for 7 days" or "Suspend" from the Sign-ups tab
create or replace function safety_member_action(p_member uuid, p_action text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not is_staff() then raise exception 'Only the Hub team can do that.'; end if;
  select full_name into nm from profiles where id = p_member;
  if nm is null then raise exception 'Member not found.'; end if;
  if p_action = 'fine' then
    update profiles set safety_ok_at = now() where id = p_member;
    perform safety_log('cleared', 'member', p_member::text, nm, p_reason);
  elsif p_action = 'limit' then
    update profiles set limited_until = now() + interval '7 days' where id = p_member;
    perform safety_log('limit', 'member', p_member::text, nm, p_reason);
  elsif p_action = 'unlimit' then
    update profiles set limited_until = null where id = p_member;
    perform safety_log('unlimit', 'member', p_member::text, nm, p_reason);
  elsif p_action = 'suspend' then
    update profiles set status = 'suspended' where id = p_member;   -- the suspend itself is logged by the profiles trigger
  else
    raise exception 'Unknown action.';
  end if;
end $$;
revoke execute on function safety_member_action(uuid, text, text) from public, anon;
grant execute on function safety_member_action(uuid, text, text) to authenticated;

-- the overview row and the Sign-ups tab
create or replace function safety_overview() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not is_staff() then null else jsonb_build_object(
    'held', (select count(*) from held_items where decided_at is null),
    'held_oldest', (select min(created_at) from held_items where decided_at is null),
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
revoke execute on function safety_overview() from public, anon;
grant execute on function safety_overview() to authenticated;

-- "Joined, but worth watching": new accounts acting like spammers
create or replace function safety_watch() returns table (id uuid, full_name text, headline text, avatar_url text, created_at timestamptz, why text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.headline, p.avatar_url, p.created_at,
    concat_ws(' · ',
      case when (p.created_at at time zone 'America/Toronto')::date = (now() at time zone 'America/Toronto')::date then 'Joined today'
           when (p.created_at at time zone 'America/Toronto')::date = (now() at time zone 'America/Toronto')::date - 1 then 'Joined yesterday'
           else 'Joined ' || to_char(p.created_at at time zone 'America/Toronto', 'Mon FMDD') end,
      case when c.n >= 8 then 'sent ' || c.n || ' connection requests in an hour' end,
      case when h.n >= 2 then h.n || ' posts, comments or messages held' end)
  from profiles p
  left join lateral (select max(k) n from (select count(*) k from connections x where x.requester_id = p.id group by date_trunc('hour', x.created_at)) z) c on true
  left join lateral (select count(*) n from held_items x where x.author_id = p.id) h on true
  where is_staff() and p.status = 'active' and p.created_at > now() - interval '14 days'
    and (p.safety_ok_at is null) and (coalesce(c.n, 0) >= 8 or coalesce(h.n, 0) >= 2)
    and (p.limited_until is null or p.limited_until < now())
  order by p.created_at desc limit 50
$$;
revoke execute on function safety_watch() from public, anon;
grant execute on function safety_watch() to authenticated;

-- ---------- two-step sign-in required for SME Advisors and business page owners ----------
create or replace function twostep_required(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select safety_on('twostep', true) and (
    exists (select 1 from profiles where id = p_user and (plan = 'advisor' or profile_type = 'advisor'))
    or exists (select 1 from business_team t join companies c on c.id = t.company_id where t.user_id = p_user and t.role = 'owner' and c.status <> 'deleted'))
$$;
revoke execute on function twostep_required(uuid) from public, anon;
grant execute on function twostep_required(uuid) to authenticated;

-- ---------- keep sign-up logs 90 days (PIPEDA), held decisions a year ----------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('safety-trim', '23 4 * * *', $q$delete from public.signup_log where at < now() - interval '90 days'; delete from public.held_items where decided_at < now() - interval '365 days'; delete from public.link_cache where checked_at < now() - interval '8 days'$q$);
  end if;
exception when others then
  raise notice 'safety-trim not scheduled: %', sqlerrm;
end $$;
