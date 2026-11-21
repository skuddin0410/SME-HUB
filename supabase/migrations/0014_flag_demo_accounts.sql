-- The older demo accounts (@demo.invalid) are sample data: flag them, take back their Founding
-- numbers and renumber real members from 1 in sign-up order.
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"sample": true}'
  where email like '%@demo.invalid';
update profiles set is_sample = true, founding_number = null
  where id in (select id from auth.users where email like '%@demo.invalid');

update profiles set founding_number = null where founding_number is not null;
with ordered as (
  select id, row_number() over (order by created_at, id) as n from profiles where not is_sample
)
update profiles p set founding_number = o.n from ordered o where o.id = p.id and o.n <= 500;
update founding_counter set issued = (select count(*) from profiles where founding_number is not null);
