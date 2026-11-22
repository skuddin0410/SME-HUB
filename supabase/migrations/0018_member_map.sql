-- Member map: how many members are in each city, with each member's own location privacy applied.
-- Only city names and counts leave the database, never who lives where.
create function member_map_cities(p_type text default null, p_province text default null)
returns table (location text, members int)
language sql stable security definer set search_path = public as $$
  select p.location, count(*)::int
  from profiles p
  where p.status = 'active' and p.location <> ''
    and (auth.uid() is null or not blocked_between(auth.uid(), p.id))
    and field_visible(p.id, 'location')
    and (p_type is null or p.profile_type = p_type)
    and (p_province is null or p.location ilike '%, ' || replace(replace(p_province, '%', ''), '_', ''))
  group by p.location
  order by count(*) desc
  limit 200;
$$;
grant execute on function member_map_cities(text, text) to anon, authenticated;
