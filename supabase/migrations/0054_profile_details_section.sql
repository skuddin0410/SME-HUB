-- The "Details" section on a profile (from the hand-off's profile page): the fields the team set up in
-- Profile settings, grouped (About, Business, Contact, Work history and any the team added), each shown only
-- to the audience the team chose, or that the member chose for the fields the team left unlocked.

-- the member's own answers to the built-in fields that had nowhere to live yet
alter table profile_details add column if not exists core jsonb not null default '{}' check (jsonb_typeof(core) = 'object');

create or replace function validate_profile_details() returns trigger
language plpgsql set search_path = public as $$
declare t text; k text; v text; h jsonb;
begin
  foreach t in array new.helps_with || new.needs || new.availability loop
    if char_length(t) < 1 or char_length(t) > 60 then raise exception 'each item must be 1 to 60 characters'; end if;
  end loop;
  if pg_column_size(new.social_links) > 3000 or pg_column_size(new.custom_fields) > 6000 or pg_column_size(new.visibility) > 1500
     or pg_column_size(new.core) > 4000 then
    raise exception 'too much profile data';
  end if;
  -- social links must be plain https addresses (no javascript: or data: links)
  for k, v in select key, value from jsonb_each_text(new.social_links) loop
    if v !~ '^https://[^\s<>"'']{3,200}$' then raise exception 'social links must be https addresses'; end if;
  end loop;
  for k, v in select key, value from jsonb_each_text(new.visibility) loop
    if v not in ('public', 'members', 'conn', 'only') then raise exception 'unknown visibility'; end if;
    if k not in ('location', 'website', 'bio', 'helps_with', 'needs', 'availability', 'social_links', 'custom_fields', 'followers', 'last_active',
                 'nick', 'founded', 'team', 'email', 'phone', 'web', 'social', 'history')
       and k !~ '^x[a-z0-9]{1,15}$' then -- fields the team added (Profile settings) have keys like x1k2j3
      raise exception 'unknown profile field';
    end if;
  end loop;
  -- the built-in answers: short text, a real year, an email and a phone that look right, up to 6 past roles
  for k, v in select key, value from jsonb_each_text(new.core - 'history') loop
    if k not in ('nick', 'industry', 'founded', 'team', 'email', 'phone') then raise exception 'unknown profile field'; end if;
    if char_length(v) > 120 then raise exception 'each answer must be 120 characters or fewer'; end if;
  end loop;
  if new.core ? 'founded' and (new.core->>'founded') !~ '^(18|19|20)\d\d$' then raise exception 'year founded must be a year'; end if;
  if new.core ? 'email' and (new.core->>'email') !~ '^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$' then raise exception 'that email does not look right'; end if;
  if new.core ? 'phone' and (new.core->>'phone') !~ '^[0-9+()\-. ]{7,25}$' then raise exception 'that phone number does not look right'; end if;
  if new.core ? 'history' then
    if jsonb_typeof(new.core->'history') <> 'array' or jsonb_array_length(new.core->'history') > 6 then raise exception 'up to 6 past roles'; end if;
    for h in select value from jsonb_array_elements(new.core->'history') loop
      if jsonb_typeof(h) <> 'object' or char_length(coalesce(h->>'role', '')) not between 1 and 80
         or char_length(coalesce(h->>'org', '')) > 80 or char_length(coalesce(h->>'years', '')) > 40 then
        raise exception 'each past role needs a role of up to 80 characters';
      end if;
    end loop;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- the team's field list (Profile settings), or the hand-off's defaults until the team saves its own
create or replace function profile_field_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select value->'fields' from hub_settings where key = 'profiles' and jsonb_typeof(value->'fields') = 'array'),
    '[{"k":"first","vis":"public","lock":true},{"k":"last","vis":"public","lock":true},{"k":"nick","vis":"members","lock":false},
      {"k":"biz","vis":"public","lock":true},{"k":"industry","vis":"public","lock":true},{"k":"city","vis":"public","lock":true},
      {"k":"founded","vis":"members","lock":false},{"k":"team","vis":"members","lock":false},
      {"k":"email","vis":"conn","lock":false},{"k":"phone","vis":"conn","lock":false},{"k":"web","vis":"public","lock":false},
      {"k":"social","vis":"public","lock":false},{"k":"history","vis":"members","lock":false}]'::jsonb)
$$;
revoke execute on function profile_field_list() from public, anon, authenticated;

-- One member's Details for this viewer: for every field, who it is shown to, whether this viewer may see it,
-- and the answer only when they may. The member themself and the Hub team see everything.
create or replace function profile_details_section(p_member uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  viewer uuid := auth.uid();
  p profiles%rowtype;
  d profile_details%rowtype;
  biz_name text; biz_cat text;
  connected boolean := false;
  out jsonb := '{}'::jsonb;
  f jsonb; k text; lvl text; ok boolean; val jsonb;
begin
  select * into p from profiles where id = p_member and status = 'active';
  if not found then return null; end if;
  if viewer is not null and viewer <> p_member and blocked_between(viewer, p_member) then return null; end if;
  select * into d from profile_details where user_id = p_member;
  select c.name, c.category into biz_name, biz_cat from companies c
   where c.owner_id = p_member and c.status = 'published' order by c.created_at limit 1;
  if viewer is not null and viewer <> p_member then
    connected := exists (select 1 from connections where status = 'accepted'
      and ((requester_id = viewer and addressee_id = p_member) or (requester_id = p_member and addressee_id = viewer)));
  end if;
  for f in select value from jsonb_array_elements(profile_field_list()) loop
    k := f->>'k';
    if k is null then continue; end if;
    lvl := coalesce(case when coalesce((f->>'lock')::boolean, false) then null else d.visibility->>k end, f->>'vis', 'public');
    -- the member's older privacy choices still apply to their city and social links
    if k = 'city' and coalesce(d.visibility->>'location', 'public') <> 'public' and lvl = 'public' then lvl := d.visibility->>'location'; end if;
    if k = 'social' and coalesce(d.visibility->>'social_links', 'public') <> 'public' and lvl = 'public' then lvl := d.visibility->>'social_links'; end if;
    ok := (viewer is not null and (viewer = p_member or is_staff()))
          or lvl = 'public' or (lvl = 'members' and viewer is not null) or (lvl = 'conn' and connected);
    val := case k
      when 'first' then to_jsonb(nullif(split_part(btrim(p.full_name), ' ', 1), ''))
      when 'last' then to_jsonb(nullif(btrim(substr(btrim(p.full_name), char_length(split_part(btrim(p.full_name), ' ', 1)) + 1)), ''))
      when 'nick' then d.core->'nick'
      when 'biz' then to_jsonb(coalesce(biz_name, nullif(btrim(split_part(coalesce(p.headline, ''), ', ', 2)), '')))
      when 'industry' then coalesce(d.core->'industry', to_jsonb(biz_cat))
      when 'city' then to_jsonb(nullif(btrim(coalesce(p.location, '')), ''))
      when 'founded' then d.core->'founded'
      when 'team' then d.core->'team'
      when 'email' then d.core->'email'
      when 'phone' then d.core->'phone'
      when 'web' then to_jsonb(nullif(btrim(coalesce(p.website, '')), ''))
      when 'social' then case when d.social_links is null or d.social_links = '{}'::jsonb then null else d.social_links end
      when 'history' then case when jsonb_array_length(coalesce(d.core->'history', '[]')) > 0 then d.core->'history' end
      else d.custom_fields->k
    end;
    if val = 'null'::jsonb then val := null; end if;
    out := out || jsonb_build_object(k, jsonb_build_object('vis', lvl, 'ok', ok, 'v', case when ok then val end));
  end loop;
  return out;
end $$;
revoke execute on function profile_details_section(uuid) from public;
grant execute on function profile_details_section(uuid) to anon, authenticated;
