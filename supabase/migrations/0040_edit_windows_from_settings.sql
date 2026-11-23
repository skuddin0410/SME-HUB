-- The edit windows follow what the team saved under Feed settings (0 = off, forever = no limit); default stays 10 minutes.
create or replace function public._edit_window(k text) returns interval
language sql stable security definer set search_path = public as $$
  select case coalesce((select value ->> k from public.hub_settings where key = 'feed'), '10')
    when '0' then interval '0 minutes'
    when 'forever' then interval '100 years'
    when '60' then interval '60 minutes'
    else interval '10 minutes' end
$$;
revoke all on function public._edit_window(text) from public, anon, authenticated;

create or replace function public.edit_window() returns interval
language sql stable security definer set search_path = public as $$ select public._edit_window('edit') $$;
create or replace function public.comment_edit_window() returns interval
language sql stable security definer set search_path = public as $$ select public._edit_window('cedit') $$;
