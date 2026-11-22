-- Who could introduce me to this member: my connections who are also connected to them.
create function intro_candidates(p_target uuid) returns table (id uuid, full_name text, headline text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.headline, p.avatar_url
  from profiles p
  where auth.uid() is not null and is_active() and p_target <> auth.uid() and p.status = 'active'
    and can_ask_intro(p.id, p_target)
    and not blocked_between(auth.uid(), p.id) and not blocked_between(auth.uid(), p_target)
    and not exists (select 1 from intro_requests r where r.requester_id = auth.uid() and r.via_id = p.id and r.target_id = p_target)
  order by p.full_name
  limit 20;
$$;
revoke execute on function intro_candidates(uuid) from public, anon;
grant execute on function intro_candidates(uuid) to authenticated;
