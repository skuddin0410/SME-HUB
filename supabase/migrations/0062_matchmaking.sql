-- AI matchmaking (handoff: matches). A member answers five questions once a round; the Hub ranks members who can
-- help (needs, skills, place, free time, plan), books a 20-minute introduction and asks how it went.
-- The ranking follows the handoff's rules; it runs here so the browser never sees members it should not.

create table match_prefs (
  user_id uuid primary key references profiles (id) on delete cascade,
  goal text not null default 'advice' check (goal in ('customers', 'advice', 'supplier', 'peers')),
  needs text[] not null default '{}' check (cardinality(needs) <= 12),
  where_pref text not null default 'any' check (where_pref in ('near', 'any')),
  avail text[] not null default '{}' check (avail <@ array['Weekday mornings', 'Weekday afternoons', 'Evenings']),
  format text not null default 'one' check (format in ('one', 'group')),
  updated_at timestamptz not null default now()
);
alter table match_prefs enable row level security;
create policy "own match prefs" on match_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on match_prefs from anon, authenticated;
grant select, insert, update, delete on match_prefs to authenticated;

-- skips, bookings and feedback, per round (a round is a calendar month)
create table match_actions (
  user_id uuid not null references profiles (id) on delete cascade,
  other_id uuid not null references profiles (id) on delete cascade,
  round date not null default date_trunc('month', now() at time zone 'America/Toronto')::date,
  action text not null check (action in ('skip', 'book', 'circle')),
  slot text not null default '' check (char_length(slot) <= 60),
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz not null default now(),
  primary key (user_id, other_id, round)
);
create index match_actions_other on match_actions (other_id, round);
alter table match_actions enable row level security;
create policy "own match actions" on match_actions for select to authenticated using (user_id = auth.uid() or other_id = auth.uid());
revoke all on match_actions from anon, authenticated;
grant select on match_actions to authenticated;

-- the meaningful words of a phrase, as 5-letter stems ("pricing" and "price" both give "prici"/"price")
create function mm_stems(t text) returns text[]
language sql immutable as $$
  select coalesce(array_agg(distinct left(w, 5)), '{}') from regexp_split_to_table(lower(coalesce(t, '')), '[^a-z0-9]+') w
  where length(w) > 3 and w <> all (array['help','with','have','from','that','this','what','your','anyone','tips','first','before','does','need','looking','would','they','them','there','about','into','their','some','when','which','will','just','been','were','more','than','after','business','businesses','small','owner','owners','best','good','should','could','where','find','make','getting','start']);
$$;
create function mm_overlap(a text, b text) returns boolean language sql immutable as $$ select mm_stems(a) && mm_stems(b) $$;

create function mm_province(loc text) returns text language sql immutable as $$ select substring(coalesce(loc, '') from ',\s*([A-Z]{2})\s*$') $$;

-- the ranked list for the signed-in member: score 5 to 98, and the reasons, best first
create function match_candidates()
returns table (member_id uuid, full_name text, avatar_url text, headline text, location text, plan text, score int, why text[], both_free text[])
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid(); pr match_prefs; mine profile_details; my_loc text; my_prov text; rec record;
  s int; w text[]; b text[]; n text; cand_helps text; prov_name text;
begin
  if me is null then return; end if;
  select * into pr from match_prefs where user_id = me;
  if pr.user_id is null then return; end if;
  select * into mine from profile_details where user_id = me;
  select p.location into my_loc from profiles p where p.id = me;
  my_prov := mm_province(my_loc);
  for rec in
    select p.id, p.full_name, p.avatar_url, p.headline, p.location, p.plan, coalesce(d.helps_with, '{}') helps, coalesce(d.needs, '{}') needs, coalesce(d.availability, '{}') avail
    from profiles p left join profile_details d on d.user_id = p.id
    where p.id <> me and p.status = 'active' and coalesce(p.full_name, '') <> ''
      and not blocked_between(me, p.id)
      and not exists (select 1 from connections c where c.status = 'accepted' and ((c.requester_id = me and c.addressee_id = p.id) or (c.addressee_id = me and c.requester_id = p.id)))
      and not exists (select 1 from match_actions a where a.user_id = me and a.other_id = p.id and a.action = 'skip' and a.round = date_trunc('month', now() at time zone 'America/Toronto')::date)
    limit 2000
  loop
    s := 20; w := '{}'; cand_helps := array_to_string(rec.helps, ' ') || ' ' || coalesce(rec.headline, '');
    foreach n in array pr.needs loop
      if mm_overlap(cand_helps, n) then s := s + 28; w := w || ('Can help you with ' || lower(n)); end if;
    end loop;
    foreach n in array rec.needs loop
      if mm_overlap(array_to_string(coalesce(mine.helps_with, '{}'), ' '), n) then s := s + 22; w := w || ('Is looking for ' || lower(n) || ', which you offer'); end if;
    end loop;
    if pr.goal = 'advice' and rec.plan = 'advisor' then s := s + 14; w := w || 'Is an SMB Advisor'::text; end if;
    if pr.goal = 'peers' and rec.plan is distinct from 'advisor' then s := s + 6; end if;
    if my_prov is not null and mm_province(rec.location) = my_prov then
      prov_name := case my_prov when 'ON' then 'Ontario' when 'QC' then 'Quebec' when 'BC' then 'British Columbia' when 'AB' then 'Alberta' when 'MB' then 'Manitoba' when 'SK' then 'Saskatchewan' when 'NS' then 'Nova Scotia' when 'NB' then 'New Brunswick' when 'NL' then 'Newfoundland and Labrador' when 'PE' then 'Prince Edward Island' else my_prov end;
      s := s + case when pr.where_pref = 'near' then 16 else 6 end; w := w || ('Also based in ' || prov_name);
    elsif pr.where_pref = 'near' then s := s - 12;
    end if;
    -- free time: the member's own availability, or weekday afternoons when they have not said
    b := array(select x from unnest(case when cardinality(rec.avail) > 0 then rec.avail else array['Weekday afternoons'] end) x where x = any (pr.avail));
    if cardinality(b) > 0 then s := s + 10; w := w || ('Free on ' || lower(b[1]) || ', like you'); end if;
    if cardinality(w) = 0 then continue; end if;
    member_id := rec.id; full_name := rec.full_name; avatar_url := rec.avatar_url; headline := rec.headline; location := rec.location; plan := rec.plan;
    score := greatest(5, least(98, s)); why := w; both_free := b;
    return next;
  end loop;
end $$;

-- books a 20-minute introduction with a match: recorded for both, and the other member is told in the app
create function match_book(p_other uuid, p_slot text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not is_active() then raise exception 'matches: sign in'; end if;
  if p_other = me or blocked_between(me, p_other) or not exists (select 1 from profiles where id = p_other and status = 'active') then raise exception 'matches: that member is not available'; end if;
  if char_length(btrim(coalesce(p_slot, ''))) not between 5 and 60 then raise exception 'matches: pick a time'; end if;
  if (select count(*) from match_actions where user_id = me and action = 'book' and created_at > now() - interval '1 day') >= 10 then raise exception 'matches: that is a lot of calls for one day'; end if;
  insert into match_actions (user_id, other_id, action, slot) values (me, p_other, 'book', btrim(p_slot))
  on conflict (user_id, other_id, round) do update set action = 'book', slot = excluded.slot, feedback = null, created_at = now();
  insert into notifications (user_id, actor_id, type, href, note) values (p_other, me, 'match_booked', '/matches', left(btrim(p_slot), 60));
end $$;

create function match_skip(p_other uuid) returns void
language sql security definer set search_path = public as $$
  insert into match_actions (user_id, other_id, action) select auth.uid(), p_other, 'skip' where auth.uid() is not null and p_other <> auth.uid()
  on conflict (user_id, other_id, round) do nothing;
$$;

create function match_feedback(p_other uuid, p_vote text) returns void
language sql security definer set search_path = public as $$
  update match_actions set feedback = case when p_vote in ('up', 'down') then p_vote end
  where user_id = auth.uid() and other_id = p_other and action = 'book';
$$;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission', 'sale_enquiry', 'deadline', 'match_booked'));

revoke execute on function match_candidates(), match_book(uuid, text), match_skip(uuid), match_feedback(uuid, text) from public, anon;
grant execute on function match_candidates(), match_book(uuid, text), match_skip(uuid), match_feedback(uuid, text) to authenticated;
