-- Member profile tabs: Connections (people you both know), Groups (public ones), and the "Active today" line.
-- Connection rows stay private: another member's list is only the part you share.
create function mutual_connection_list(other uuid)
returns table (id uuid, full_name text, headline text, location text, avatar_url text, profile_type text)
language sql stable security definer set search_path = public as $$
  with mine as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as m
    from connections where status = 'accepted' and auth.uid() in (requester_id, addressee_id)
  ), theirs as (
    select case when requester_id = other then addressee_id else requester_id end as m
    from connections where status = 'accepted' and other in (requester_id, addressee_id)
  )
  select p.id, p.full_name, p.headline, case when field_visible(p.id, 'location') then p.location else '' end, p.avatar_url, p.profile_type
  from profiles p
  where auth.uid() is not null and p.status = 'active' and p.id in (select m from mine intersect select m from theirs)
    and not blocked_between(auth.uid(), p.id)
  order by p.full_name
  limit 60
$$;
revoke execute on function mutual_connection_list(uuid) from public, anon;
grant execute on function mutual_connection_list(uuid) to authenticated;

create function profile_groups(p_member uuid)
returns table (id uuid, slug text, name text, description text, members int)
language sql stable security definer set search_path = public as $$
  select g.id, g.slug, g.name, g.description, (select count(*)::int from group_members x where x.group_id = g.id)
  from groups g join group_members gm on gm.group_id = g.id and gm.user_id = p_member
  where not g.is_private and g.status = 'active'
    and (auth.uid() is null or not blocked_between(auth.uid(), p_member))
  order by g.name
  limit 30
$$;
grant execute on function profile_groups(uuid) to anon, authenticated;

create function profile_last_active(p_id uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select case when field_visible(p_id, 'last_active') then
    greatest((select created_at from profiles where id = p_id),
             (select max(created_at) from posts where author_id = p_id),
             (select max(created_at) from comments where author_id = p_id))
  end
$$;
grant execute on function profile_last_active(uuid) to anon, authenticated;
