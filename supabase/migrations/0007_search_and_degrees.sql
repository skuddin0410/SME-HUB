-- Full-text search columns, a ranked people search, and connection degrees.

-- Search columns are kept up to date by Postgres itself. Weight A outranks B outranks C.
alter table profiles add column fts tsvector generated always as (
  setweight(to_tsvector('english', full_name), 'A') ||
  setweight(to_tsvector('english', headline || ' ' || location), 'B') ||
  setweight(to_tsvector('english', bio), 'C')
) stored;
alter table posts add column fts tsvector generated always as (to_tsvector('english', body)) stored;
alter table companies add column fts tsvector generated always as (
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C')
) stored;
alter table groups add column fts tsvector generated always as (
  setweight(to_tsvector('english', name), 'A') || setweight(to_tsvector('english', description), 'C')
) stored;
create index profiles_fts on profiles using gin (fts);
create index posts_fts on posts using gin (fts);
create index companies_fts on companies using gin (fts);
create index groups_fts on groups using gin (fts);

-- People search, best match first. q is a tsquery built by the app from plain words ("dan:* & logi:*").
-- Runs with the caller's rights, so the usual profile rules apply.
create function search_profiles(q text) returns setof profiles
language sql stable set search_path = public as $$
  select p.* from profiles p
  where p.fts @@ to_tsquery('english', q)
  order by ts_rank(p.fts, to_tsquery('english', q)) desc, p.created_at desc
$$;
grant execute on function search_profiles(text) to anon, authenticated;

create index if not exists connections_requester on connections (requester_id);

-- How far each of these members is from the caller: 1 = connected, 2 = shares a connection, 3 = further.
-- Connection rows stay private; the caller only learns their own distance to the people asked about.
create function connection_degrees(ids uuid[]) returns table (id uuid, degree int)
language sql stable security definer set search_path = public as $$
  with mine as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as other
    from connections where status = 'accepted' and auth.uid() in (requester_id, addressee_id)
  ),
  second as (
    select distinct case when c.requester_id = m.other then c.addressee_id else c.requester_id end as other
    from connections c join mine m on m.other in (c.requester_id, c.addressee_id)
    where c.status = 'accepted'
  )
  select t.id,
    case when t.id in (select other from mine) then 1 when t.id in (select other from second) then 2 else 3 end
  from unnest(ids) as t (id)
  where auth.uid() is not null and t.id <> auth.uid()
$$;
revoke execute on function connection_degrees(uuid[]) from public, anon;
grant execute on function connection_degrees(uuid[]) to authenticated;

-- How many connections the caller and another member have in common.
create function mutual_connections(other uuid) returns int
language sql stable security definer set search_path = public as $$
  with of_member as (
    select m, case when requester_id = m then addressee_id else requester_id end as peer
    from connections, unnest(array[auth.uid(), other]) as m
    where status = 'accepted' and m in (requester_id, addressee_id)
  )
  select count(*)::int from (select peer from of_member group by peer having count(distinct m) = 2) shared
  where auth.uid() is not null and other <> auth.uid()
$$;
revoke execute on function mutual_connections(uuid) from public, anon;
grant execute on function mutual_connections(uuid) to authenticated;
