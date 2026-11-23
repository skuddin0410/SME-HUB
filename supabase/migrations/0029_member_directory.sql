-- Member directory (the "Member directory" screen): search_members plus the extra lines each card and the map panel show.
-- recommended_by counts visible recommendations; last_active is the latest post, comment or sign-up, shown only when the member allows it.
create function member_directory(
  q text default '', p_type text default null, p_province text default null, p_help text default null, p_avail text default null,
  p_limit int default 60, p_offset int default 0
) returns table (id uuid, full_name text, headline text, location text, avatar_url text, profile_type text, member_type text, founding_number int,
                 helps_with text[], needs text[], recommended_by int, last_active timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare needle text := '%' || replace(replace(replace(extensions.unaccent(lower(coalesce(q, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  return query
  select p.id, p.full_name, p.headline,
         case when field_visible(p.id, 'location') then p.location else '' end,
         p.avatar_url, p.profile_type, p.member_type, p.founding_number,
         case when d.user_id is not null and field_visible(p.id, 'helps_with') then d.helps_with else '{}' end,
         case when d.user_id is not null and field_visible(p.id, 'needs') then d.needs else '{}' end,
         (select count(*)::int from recommendations r where r.subject_id = p.id and not r.hidden),
         case when field_visible(p.id, 'last_active') then
           greatest(p.created_at,
                    (select max(po.created_at) from posts po where po.author_id = p.id),
                    (select max(c.created_at) from comments c where c.author_id = p.id))
         else null end
  from profiles p left join profile_details d on d.user_id = p.id
  where p.status = 'active'
    and (auth.uid() is null or not blocked_between(auth.uid(), p.id))
    and (p_type is null or p.profile_type = p_type)
    and (p_province is null or (field_visible(p.id, 'location') and p.location ilike '%, ' || replace(replace(p_province, '%', ''), '_', '')))
    and (p_help is null or (d.user_id is not null and field_visible(p.id, 'helps_with') and p_help = any (d.helps_with)))
    and (p_avail is null or (d.user_id is not null and field_visible(p.id, 'availability') and p_avail = any (d.availability)))
    and (coalesce(q, '') = '' or extensions.unaccent(lower(p.full_name || ' ' || p.headline || ' ' || case when field_visible(p.id, 'location') then p.location else '' end || ' ' || case when d.user_id is not null and field_visible(p.id, 'helps_with') then array_to_string(d.helps_with, ' ') else '' end)) like needle)
  order by p.founding_number nulls last, p.full_name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;
grant execute on function member_directory(text, text, text, text, text, int, int) to anon, authenticated;
