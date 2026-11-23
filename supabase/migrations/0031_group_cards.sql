-- Group cards: a few member faces and the number of posts this week, for the groups asked about.
-- Members of a private group are only shown to people in it.
create function group_card_extras(p_ids uuid[])
returns table (group_id uuid, posts_week int, faces jsonb)
language sql stable security definer set search_path = public as $$
  select g.id,
    (select count(*)::int from posts p where p.group_id = g.id and p.created_at > now() - interval '7 days'),
    case when g.is_private and not exists (select 1 from group_members me where me.group_id = g.id and me.user_id = auth.uid()) then '[]'::jsonb
    else coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.full_name, 'avatar', x.avatar_url))
                   from (select pr.id, pr.full_name, pr.avatar_url from group_members gm join profiles pr on pr.id = gm.user_id
                         where gm.group_id = g.id and pr.status = 'active' order by gm.created_at limit 5) x), '[]'::jsonb) end
  from groups g
  where g.id = any (p_ids) and g.status = 'active'
$$;
grant execute on function group_card_extras(uuid[]) to anon, authenticated;
