-- Business directory: the numbers on the page header, the category tiles and the filter lists.
-- Counts only (no addresses). Public, like the directory itself.
create function directory_facets() returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from companies where status = 'published'),
    'open_now', (select count(*) from companies c where c.status = 'published' and business_is_open(c.hours, c.closures, c.tz)),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('category', category, 'n', n) order by n desc, category)
                            from (select category, count(*)::int as n from companies where status = 'published' and category <> '' group by category) x), '[]'::jsonb),
    'provinces', coalesce((select jsonb_agg(province order by province) from (select distinct province from companies where status = 'published' and province <> '') x), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('city', city, 'province', province) order by city)
                        from (select distinct city, province from companies where status = 'published' and city <> '') x), '[]'::jsonb)
  );
$$;
grant execute on function directory_facets() to anon, authenticated;
