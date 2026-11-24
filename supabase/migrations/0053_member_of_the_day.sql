-- Update 11: "Member of the Week" becomes "Member of the Day", in the left panel.
-- The Hub team can pick each day's member; a day with no pick is filled automatically the first time it is shown,
-- and the row keeps who was featured so nobody comes round again within 90 days.

create table if not exists member_of_day (
  day date primary key,
  member_id uuid not null references profiles (id) on delete cascade,
  picked_by uuid references profiles (id) on delete set null, -- null: chosen automatically
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists member_of_day_member on member_of_day (member_id, day desc);
alter table member_of_day enable row level security;

-- who is featured is public (visitors see the card); only the team chooses
create policy "member of the day readable" on member_of_day for select to anon, authenticated using (true);
create policy "team picks member of the day" on member_of_day for insert to authenticated
  with check (is_staff() and picked_by = auth.uid() and emailed_at is null);
create policy "team changes member of the day" on member_of_day for update to authenticated
  using (is_staff()) with check (is_staff() and picked_by = auth.uid());
create policy "team removes member of the day" on member_of_day for delete to authenticated using (is_staff());
revoke all on member_of_day from anon, authenticated;
grant select on member_of_day to anon, authenticated;
grant insert, delete on member_of_day to authenticated;
grant update (member_id, picked_by) on member_of_day to authenticated;

-- today in Canada's business time zone
create or replace function motd_today() returns date language sql stable set search_path = public as $$
  select (now() at time zone 'America/Toronto')::date
$$;

-- the automatic choice for a day: a ready profile (photo, headline, city, "Can help with", business page), active,
-- not featured in the last 90 days; real members before sample ones, then paid and active this week first
create or replace function motd_auto(p_day date) returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from profiles p
  where p.ready_count = 5 and p.status = 'active'
    and not exists (select 1 from member_of_day x where x.member_id = p.id and x.day > p_day - 90 and x.day < p_day)
  order by p.is_sample,
           ((p.plan in ('plus', 'advisor'))::int
            + (exists (select 1 from posts q where q.author_id = p.id and q.created_at > now() - interval '7 days')
               or exists (select 1 from comments c where c.author_id = p.id and c.created_at > now() - interval '7 days'))::int) desc,
           md5(p.id::text || p_day::text)
  limit 1
$$;

-- today's Member of the Day, for the card. Fills the day automatically when the team has not picked anyone,
-- or when the picked member has since been suspended or removed.
create or replace function member_of_the_day() returns jsonb
language plpgsql security definer set search_path = public as $$
declare d date := motd_today(); m uuid; r jsonb;
begin
  select x.member_id into m from member_of_day x join profiles p on p.id = x.member_id
   where x.day = d and p.status = 'active';
  if m is null then
    m := motd_auto(d);
    if m is null then return null; end if;
    insert into member_of_day (day, member_id) values (d, m)
    on conflict (day) do update set member_id = excluded.member_id, picked_by = null, emailed_at = null
      where not exists (select 1 from profiles p where p.id = member_of_day.member_id and p.status = 'active');
    select x.member_id into m from member_of_day x where x.day = d;
  end if;
  select jsonb_build_object(
           'id', p.id, 'full_name', p.full_name, 'headline', p.headline, 'location', p.location, 'avatar_url', p.avatar_url,
           'about', left(regexp_replace(split_part(coalesce(p.bio, ''), E'\n', 1), '\s+', ' ', 'g'), 160), 'day', d)
    into r from profiles p where p.id = m;
  return r;
end $$;
revoke execute on function motd_auto(date), member_of_the_day() from public;
revoke execute on function motd_auto(date) from anon, authenticated;
grant execute on function member_of_the_day() to anon, authenticated;
grant execute on function motd_today() to anon, authenticated;

-- the daily email to the featured member ("You're today's Member of the Day"), sent once by the server
create or replace function motd_claim_email(p_day date) returns uuid
language sql security definer set search_path = public as $$
  update member_of_day set emailed_at = now() where day = p_day and emailed_at is null returning member_id
$$;
revoke execute on function motd_claim_email(date) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function member_of_the_day(), motd_claim_email(date) to service_role;
  end if;
end $$;
