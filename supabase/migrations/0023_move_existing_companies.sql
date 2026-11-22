-- Phase 4: bring existing company listings onto the new business pages.
-- City and province come from the owner's profile location ("Toronto, ON"); old categories map to the new list.
-- Runs once as the database owner, so the page rules (which only apply to signed-in members) do not fire.
update companies c
set city = trim(split_part(p.location, ',', 1)),
    province = upper(trim(split_part(p.location, ',', 2)))
from profiles p
where p.id = c.owner_id
  and c.city = ''
  and p.location like '%,%'
  and char_length(trim(split_part(p.location, ',', 2))) = 2;

update companies set category = case category
  when 'Business Consulting' then 'Professional Services'
  when 'Coaching' then 'Professional Services'
  when 'Real Estate' then 'Professional Services'
  when 'Construction' then 'Construction & Trades'
  when 'Digital Marketing' then 'Marketing & Design'
  when 'Fashion & Clothing' then 'Retail'
  when 'Finance' then 'Finance & Accounting'
  when 'IT' then 'Technology'
  when 'Law' then 'Legal'
  when 'Logistics' then 'Logistics & Transport'
  when 'Education' then 'Other'
  when 'Non-profit' then 'Other'
  when 'Travel & Hospitality' then 'Other'
  else category end
where category in ('Business Consulting', 'Coaching', 'Real Estate', 'Construction', 'Digital Marketing', 'Fashion & Clothing', 'Finance', 'IT', 'Law', 'Logistics', 'Education', 'Non-profit', 'Travel & Hospitality');
