-- Update 15: one master list of industries (32) and specialities (335) for the whole site, kept in the database so the
-- Hub team can add to it without code. The Business Directory, Add a business, member Details and Businesses for Sale use it.
-- Old category names move across automatically (CATALIAS in the zip). Also: the About page's weekly briefing sign-ups.

create table if not exists industries (
  name text primary key check (char_length(name) between 2 and 60),
  icon text not null default 'grid' check (icon ~ '^[a-z0-9]{1,20}$'),
  sort int not null default 100
);
create table if not exists specialities (
  industry text not null references industries (name) on update cascade on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  sort int not null default 100,
  primary key (industry, name)
);
alter table industries enable row level security;
alter table specialities enable row level security;
create policy "anyone reads industries" on industries for select to anon, authenticated using (true);
create policy "team manages industries" on industries for all to authenticated using (is_staff()) with check (is_staff());
create policy "anyone reads specialities" on specialities for select to anon, authenticated using (true);
create policy "team manages specialities" on specialities for all to authenticated using (is_staff()) with check (is_staff());
revoke all on industries, specialities from anon, authenticated;
grant select on industries, specialities to anon, authenticated;
grant insert, update, delete on industries, specialities to authenticated;

insert into industries (name, icon, sort) values
  ('Food & Drink', 'store', 1),
  ('Catering & Events', 'cal', 2),
  ('Retail & Shops', 'tag', 3),
  ('Online & E-commerce', 'cash', 4),
  ('Professional Services', 'briefcase', 5),
  ('Finance, Accounting & Insurance', 'coin', 6),
  ('Legal', 'book', 7),
  ('Real Estate & Property', 'city', 8),
  ('Construction & Trades', 'building', 9),
  ('Home Services', 'home', 10),
  ('Cleaning & Facilities', 'spark', 11),
  ('Automotive', 'key', 12),
  ('Logistics & Transport', 'send', 13),
  ('Manufacturing & Makers', 'factory', 14),
  ('Wholesale & Import/Export', 'box', 15),
  ('Technology & IT', 'spark', 16),
  ('Marketing, Media & Design', 'edit', 17),
  ('Health & Medical', 'help', 18),
  ('Wellness, Fitness & Beauty', 'users', 19),
  ('Education & Training', 'cap', 20),
  ('Childcare & Family', 'hand', 21),
  ('Pets & Animals', 'pin', 22),
  ('Arts, Culture & Entertainment', 'play', 23),
  ('Travel, Tourism & Hospitality', 'flag', 24),
  ('Agriculture & Farming', 'pie', 25),
  ('Energy & Environment', 'trend', 26),
  ('Staffing & HR', 'users', 27),
  ('Security & Safety', 'shield', 28),
  ('Personal & Lifestyle Services', 'hand', 29),
  ('Non-profit & Community', 'flag', 30),
  ('Government & Public Sector Suppliers', 'capitol', 31),
  ('Other', 'grid', 32)
on conflict (name) do nothing;
insert into specialities (industry, name, sort) values
  ('Food & Drink', 'Restaurants', 1),
  ('Food & Drink', 'Cafés and coffee shops', 2),
  ('Food & Drink', 'Bakeries', 3),
  ('Food & Drink', 'Bars and pubs', 4),
  ('Food & Drink', 'Breweries, wineries and distilleries', 5),
  ('Food & Drink', 'Food trucks', 6),
  ('Food & Drink', 'Fast food and takeout', 7),
  ('Food & Drink', 'Fine dining', 8),
  ('Food & Drink', 'Ethnic and international cuisine', 9),
  ('Food & Drink', 'Halal food', 10),
  ('Food & Drink', 'Kosher food', 11),
  ('Food & Drink', 'Vegan and vegetarian', 12),
  ('Food & Drink', 'Specialty foods', 13),
  ('Food & Drink', 'Desserts and ice cream', 14),
  ('Food & Drink', 'Juice and smoothie bars', 15),
  ('Food & Drink', 'Meal prep and delivery', 16),
  ('Food & Drink', 'Tea shops', 17),
  ('Food & Drink', 'Butchers and delis', 18),
  ('Catering & Events', 'Catering', 1),
  ('Catering & Events', 'Event planning', 2),
  ('Catering & Events', 'Wedding services', 3),
  ('Catering & Events', 'Venues and halls', 4),
  ('Catering & Events', 'Party rentals', 5),
  ('Catering & Events', 'Audio-visual services', 6),
  ('Catering & Events', 'DJs and entertainers', 7),
  ('Catering & Events', 'Photographers and videographers', 8),
  ('Catering & Events', 'Florists and decor', 9),
  ('Catering & Events', 'Trade show and booth services', 10),
  ('Catering & Events', 'Corporate events', 11),
  ('Catering & Events', 'Conference organizers', 12),
  ('Retail & Shops', 'Clothing and fashion', 1),
  ('Retail & Shops', 'Shoes and accessories', 2),
  ('Retail & Shops', 'Jewellery', 3),
  ('Retail & Shops', 'Gift shops', 4),
  ('Retail & Shops', 'Convenience stores', 5),
  ('Retail & Shops', 'Grocery stores', 6),
  ('Retail & Shops', 'Health food stores', 7),
  ('Retail & Shops', 'Furniture and home decor', 8),
  ('Retail & Shops', 'Electronics', 9),
  ('Retail & Shops', 'Books and stationery', 10),
  ('Retail & Shops', 'Toys and games', 11),
  ('Retail & Shops', 'Sporting goods', 12),
  ('Retail & Shops', 'Hardware stores', 13),
  ('Retail & Shops', 'Pharmacies', 14),
  ('Retail & Shops', 'Thrift and consignment', 15),
  ('Retail & Shops', 'Cannabis retail', 16),
  ('Retail & Shops', 'Cosmetics and beauty products', 17),
  ('Retail & Shops', 'Eyewear', 18),
  ('Online & E-commerce', 'Online stores', 1),
  ('Online & E-commerce', 'Shopify and marketplace sellers', 2),
  ('Online & E-commerce', 'Amazon sellers', 3),
  ('Online & E-commerce', 'Dropshipping', 4),
  ('Online & E-commerce', 'Subscription boxes', 5),
  ('Online & E-commerce', 'Digital products', 6),
  ('Online & E-commerce', 'Print on demand', 7),
  ('Online & E-commerce', 'Etsy and handmade sellers', 8),
  ('Professional Services', 'Business consulting', 1),
  ('Professional Services', 'Management consulting', 2),
  ('Professional Services', 'Coaching and mentoring', 3),
  ('Professional Services', 'Translation and interpretation', 4),
  ('Professional Services', 'Virtual assistants', 5),
  ('Professional Services', 'Project management', 6),
  ('Professional Services', 'Engineering services', 7),
  ('Professional Services', 'Architecture', 8),
  ('Professional Services', 'Surveying', 9),
  ('Professional Services', 'Research and analysis', 10),
  ('Professional Services', 'Immigration consultants', 11),
  ('Professional Services', 'Notaries and commissioners', 12),
  ('Finance, Accounting & Insurance', 'Accounting and CPAs', 1),
  ('Finance, Accounting & Insurance', 'Bookkeeping', 2),
  ('Finance, Accounting & Insurance', 'Tax preparation', 3),
  ('Finance, Accounting & Insurance', 'Payroll services', 4),
  ('Finance, Accounting & Insurance', 'Financial planning', 5),
  ('Finance, Accounting & Insurance', 'Insurance brokers', 6),
  ('Finance, Accounting & Insurance', 'Mortgage brokers', 7),
  ('Finance, Accounting & Insurance', 'Business loans and lending', 8),
  ('Finance, Accounting & Insurance', 'Credit unions and banks', 9),
  ('Finance, Accounting & Insurance', 'Investment advisors', 10),
  ('Finance, Accounting & Insurance', 'Grant writing and funding help', 11),
  ('Finance, Accounting & Insurance', 'Collections', 12),
  ('Finance, Accounting & Insurance', 'Payment processing', 13),
  ('Legal', 'Business law', 1),
  ('Legal', 'Corporate and incorporation', 2),
  ('Legal', 'Employment law', 3),
  ('Legal', 'Immigration law', 4),
  ('Legal', 'Real estate law', 5),
  ('Legal', 'Intellectual property and trademarks', 6),
  ('Legal', 'Family law', 7),
  ('Legal', 'Litigation', 8),
  ('Legal', 'Paralegals', 9),
  ('Legal', 'Contracts and agreements', 10),
  ('Legal', 'Wills and estates', 11),
  ('Real Estate & Property', 'Real estate agents', 1),
  ('Real Estate & Property', 'Commercial real estate', 2),
  ('Real Estate & Property', 'Property management', 3),
  ('Real Estate & Property', 'Coworking and office space', 4),
  ('Real Estate & Property', 'Storage and warehouses', 5),
  ('Real Estate & Property', 'Home staging', 6),
  ('Real Estate & Property', 'Appraisers and inspectors', 7),
  ('Real Estate & Property', 'Short-term rentals', 8),
  ('Construction & Trades', 'General contractors', 1),
  ('Construction & Trades', 'Renovations', 2),
  ('Construction & Trades', 'Electricians', 3),
  ('Construction & Trades', 'Plumbers', 4),
  ('Construction & Trades', 'HVAC, heating and cooling', 5),
  ('Construction & Trades', 'Roofing', 6),
  ('Construction & Trades', 'Carpentry', 7),
  ('Construction & Trades', 'Flooring', 8),
  ('Construction & Trades', 'Painting', 9),
  ('Construction & Trades', 'Masonry and concrete', 10),
  ('Construction & Trades', 'Drywall', 11),
  ('Construction & Trades', 'Welding and metal work', 12),
  ('Construction & Trades', 'Windows and doors', 13),
  ('Construction & Trades', 'Solar installation', 14),
  ('Construction & Trades', 'Excavation', 15),
  ('Construction & Trades', 'Kitchen and bath', 16),
  ('Construction & Trades', 'Commercial fit-outs', 17),
  ('Home Services', 'Landscaping and lawn care', 1),
  ('Home Services', 'Snow removal', 2),
  ('Home Services', 'Handyman', 3),
  ('Home Services', 'Pest control', 4),
  ('Home Services', 'Moving services', 5),
  ('Home Services', 'Junk removal', 6),
  ('Home Services', 'Interior design', 7),
  ('Home Services', 'Appliance repair', 8),
  ('Home Services', 'Locksmiths', 9),
  ('Home Services', 'Pool and hot tub', 10),
  ('Home Services', 'Home security installation', 11),
  ('Home Services', 'Window cleaning', 12),
  ('Cleaning & Facilities', 'Commercial cleaning', 1),
  ('Cleaning & Facilities', 'Residential cleaning', 2),
  ('Cleaning & Facilities', 'Carpet and upholstery cleaning', 3),
  ('Cleaning & Facilities', 'Janitorial services', 4),
  ('Cleaning & Facilities', 'Restoration (fire and flood)', 5),
  ('Cleaning & Facilities', 'Waste management', 6),
  ('Cleaning & Facilities', 'Facility management', 7),
  ('Cleaning & Facilities', 'Laundry and dry cleaning', 8),
  ('Automotive', 'Auto repair', 1),
  ('Automotive', 'Auto body and collision', 2),
  ('Automotive', 'Car dealers', 3),
  ('Automotive', 'Used cars', 4),
  ('Automotive', 'Car wash and detailing', 5),
  ('Automotive', 'Tires', 6),
  ('Automotive', 'Towing', 7),
  ('Automotive', 'Auto parts', 8),
  ('Automotive', 'Fleet services', 9),
  ('Automotive', 'Driving schools', 10),
  ('Automotive', 'EV charging', 11),
  ('Logistics & Transport', 'Trucking and freight', 1),
  ('Logistics & Transport', 'Courier and delivery', 2),
  ('Logistics & Transport', 'Last-mile delivery', 3),
  ('Logistics & Transport', 'Freight forwarding', 4),
  ('Logistics & Transport', 'Customs brokers', 5),
  ('Logistics & Transport', 'Warehousing and fulfillment', 6),
  ('Logistics & Transport', 'Taxi and rideshare', 7),
  ('Logistics & Transport', 'Limousine services', 8),
  ('Logistics & Transport', 'Moving and relocation', 9),
  ('Logistics & Transport', 'Shipping and packaging', 10),
  ('Logistics & Transport', 'Cold chain', 11),
  ('Manufacturing & Makers', 'Food and beverage manufacturing', 1),
  ('Manufacturing & Makers', 'Metal fabrication', 2),
  ('Manufacturing & Makers', 'Plastics', 3),
  ('Manufacturing & Makers', 'Textiles and apparel', 4),
  ('Manufacturing & Makers', 'Woodworking and furniture', 5),
  ('Manufacturing & Makers', 'Printing', 6),
  ('Manufacturing & Makers', 'Packaging', 7),
  ('Manufacturing & Makers', 'Electronics manufacturing', 8),
  ('Manufacturing & Makers', 'Machinery and equipment', 9),
  ('Manufacturing & Makers', 'Chemicals and cosmetics', 10),
  ('Manufacturing & Makers', 'Handmade and crafts', 11),
  ('Manufacturing & Makers', '3D printing', 12),
  ('Manufacturing & Makers', 'Signs and displays', 13),
  ('Wholesale & Import/Export', 'Wholesale distributors', 1),
  ('Wholesale & Import/Export', 'Importers', 2),
  ('Wholesale & Import/Export', 'Exporters', 3),
  ('Wholesale & Import/Export', 'Food wholesale', 4),
  ('Wholesale & Import/Export', 'Industrial supplies', 5),
  ('Wholesale & Import/Export', 'Office supplies', 6),
  ('Wholesale & Import/Export', 'Sourcing agents', 7),
  ('Wholesale & Import/Export', 'Trading companies', 8),
  ('Technology & IT', 'Software development', 1),
  ('Technology & IT', 'Web design and development', 2),
  ('Technology & IT', 'Mobile apps', 3),
  ('Technology & IT', 'IT support and managed services', 4),
  ('Technology & IT', 'Cybersecurity', 5),
  ('Technology & IT', 'Cloud services', 6),
  ('Technology & IT', 'AI and automation', 7),
  ('Technology & IT', 'Data and analytics', 8),
  ('Technology & IT', 'SaaS products', 9),
  ('Technology & IT', 'Computer repair', 10),
  ('Technology & IT', 'Telecom and internet', 11),
  ('Technology & IT', 'Hardware and devices', 12),
  ('Technology & IT', 'Blockchain and fintech', 13),
  ('Technology & IT', 'Game development', 14),
  ('Marketing, Media & Design', 'Marketing agencies', 1),
  ('Marketing, Media & Design', 'Digital marketing', 2),
  ('Marketing, Media & Design', 'Social media management', 3),
  ('Marketing, Media & Design', 'SEO and SEM', 4),
  ('Marketing, Media & Design', 'Content writing', 5),
  ('Marketing, Media & Design', 'Branding', 6),
  ('Marketing, Media & Design', 'Graphic design', 7),
  ('Marketing, Media & Design', 'Public relations', 8),
  ('Marketing, Media & Design', 'Advertising', 9),
  ('Marketing, Media & Design', 'Video production', 10),
  ('Marketing, Media & Design', 'Photography', 11),
  ('Marketing, Media & Design', 'Podcasting', 12),
  ('Marketing, Media & Design', 'Printing and promotional products', 13),
  ('Marketing, Media & Design', 'Publishing and magazines', 14),
  ('Marketing, Media & Design', 'Influencers and creators', 15),
  ('Health & Medical', 'Medical clinics', 1),
  ('Health & Medical', 'Dentists', 2),
  ('Health & Medical', 'Pharmacies', 3),
  ('Health & Medical', 'Physiotherapy', 4),
  ('Health & Medical', 'Chiropractors', 5),
  ('Health & Medical', 'Optometrists', 6),
  ('Health & Medical', 'Mental health and counselling', 7),
  ('Health & Medical', 'Home care and senior care', 8),
  ('Health & Medical', 'Massage therapy', 9),
  ('Health & Medical', 'Naturopaths', 10),
  ('Health & Medical', 'Medical labs and imaging', 11),
  ('Health & Medical', 'Medical supplies', 12),
  ('Health & Medical', 'Hearing clinics', 13),
  ('Health & Medical', 'Dietitians', 14),
  ('Wellness, Fitness & Beauty', 'Gyms and fitness studios', 1),
  ('Wellness, Fitness & Beauty', 'Personal trainers', 2),
  ('Wellness, Fitness & Beauty', 'Yoga and pilates', 3),
  ('Wellness, Fitness & Beauty', 'Martial arts', 4),
  ('Wellness, Fitness & Beauty', 'Spas', 5),
  ('Wellness, Fitness & Beauty', 'Hair salons', 6),
  ('Wellness, Fitness & Beauty', 'Barbers', 7),
  ('Wellness, Fitness & Beauty', 'Nail salons', 8),
  ('Wellness, Fitness & Beauty', 'Estheticians and skincare', 9),
  ('Wellness, Fitness & Beauty', 'Tattoo and piercing', 10),
  ('Wellness, Fitness & Beauty', 'Makeup artists', 11),
  ('Wellness, Fitness & Beauty', 'Wellness coaches', 12),
  ('Wellness, Fitness & Beauty', 'Meditation and holistic', 13),
  ('Education & Training', 'Tutoring', 1),
  ('Education & Training', 'Private schools', 2),
  ('Education & Training', 'Language schools', 3),
  ('Education & Training', 'Driving schools', 4),
  ('Education & Training', 'Career and skills training', 5),
  ('Education & Training', 'Corporate training', 6),
  ('Education & Training', 'Music lessons', 7),
  ('Education & Training', 'Art classes', 8),
  ('Education & Training', 'Test prep', 9),
  ('Education & Training', 'Online courses', 10),
  ('Education & Training', 'Early learning', 11),
  ('Education & Training', 'Coding schools', 12),
  ('Childcare & Family', 'Daycares', 1),
  ('Childcare & Family', 'Home childcare', 2),
  ('Childcare & Family', 'Nannies and babysitters', 3),
  ('Childcare & Family', 'After-school programs', 4),
  ('Childcare & Family', 'Camps', 5),
  ('Childcare & Family', 'Kids activities', 6),
  ('Childcare & Family', 'Party services for kids', 7),
  ('Childcare & Family', 'Elder care', 8),
  ('Pets & Animals', 'Veterinarians', 1),
  ('Pets & Animals', 'Pet grooming', 2),
  ('Pets & Animals', 'Pet stores', 3),
  ('Pets & Animals', 'Dog walking', 4),
  ('Pets & Animals', 'Pet sitting and boarding', 5),
  ('Pets & Animals', 'Pet training', 6),
  ('Pets & Animals', 'Pet food', 7),
  ('Arts, Culture & Entertainment', 'Artists and galleries', 1),
  ('Arts, Culture & Entertainment', 'Music and bands', 2),
  ('Arts, Culture & Entertainment', 'Recording studios', 3),
  ('Arts, Culture & Entertainment', 'Theatre and performing arts', 4),
  ('Arts, Culture & Entertainment', 'Film and TV production', 5),
  ('Arts, Culture & Entertainment', 'Dance studios', 6),
  ('Arts, Culture & Entertainment', 'Escape rooms and games', 7),
  ('Arts, Culture & Entertainment', 'Bowling and recreation', 8),
  ('Arts, Culture & Entertainment', 'Museums', 9),
  ('Arts, Culture & Entertainment', 'Writers and authors', 10),
  ('Travel, Tourism & Hospitality', 'Hotels and motels', 1),
  ('Travel, Tourism & Hospitality', 'Bed and breakfasts', 2),
  ('Travel, Tourism & Hospitality', 'Travel agencies', 3),
  ('Travel, Tourism & Hospitality', 'Tour operators', 4),
  ('Travel, Tourism & Hospitality', 'Outdoor adventures', 5),
  ('Travel, Tourism & Hospitality', 'Campgrounds', 6),
  ('Travel, Tourism & Hospitality', 'Vacation rentals', 7),
  ('Travel, Tourism & Hospitality', 'Indigenous tourism', 8),
  ('Agriculture & Farming', 'Farms', 1),
  ('Agriculture & Farming', 'Greenhouses', 2),
  ('Agriculture & Farming', 'Orchards and vineyards', 3),
  ('Agriculture & Farming', 'Livestock', 4),
  ('Agriculture & Farming', 'Dairy', 5),
  ('Agriculture & Farming', 'Organic farming', 6),
  ('Agriculture & Farming', 'Farm equipment', 7),
  ('Agriculture & Farming', 'Agri-tech', 8),
  ('Agriculture & Farming', 'Farmers markets', 9),
  ('Agriculture & Farming', 'Fishing and seafood', 10),
  ('Agriculture & Farming', 'Forestry', 11),
  ('Agriculture & Farming', 'Beekeeping', 12),
  ('Energy & Environment', 'Solar and renewable energy', 1),
  ('Energy & Environment', 'Energy efficiency', 2),
  ('Energy & Environment', 'Environmental consulting', 3),
  ('Energy & Environment', 'Recycling', 4),
  ('Energy & Environment', 'EV and clean tech', 5),
  ('Energy & Environment', 'Water treatment', 6),
  ('Energy & Environment', 'Oil and gas services', 7),
  ('Energy & Environment', 'Sustainability consulting', 8),
  ('Staffing & HR', 'Staffing agencies', 1),
  ('Staffing & HR', 'Recruiters', 2),
  ('Staffing & HR', 'HR consulting', 3),
  ('Staffing & HR', 'Payroll and benefits', 4),
  ('Staffing & HR', 'Training and development', 5),
  ('Staffing & HR', 'Background checks', 6),
  ('Security & Safety', 'Security guards', 1),
  ('Security & Safety', 'Alarm and camera systems', 2),
  ('Security & Safety', 'Health and safety consulting', 3),
  ('Security & Safety', 'First aid training', 4),
  ('Security & Safety', 'Fire protection', 5),
  ('Security & Safety', 'Private investigators', 6),
  ('Personal & Lifestyle Services', 'Tailoring and alterations', 1),
  ('Personal & Lifestyle Services', 'Shoe repair', 2),
  ('Personal & Lifestyle Services', 'Dry cleaning', 3),
  ('Personal & Lifestyle Services', 'Funeral services', 4),
  ('Personal & Lifestyle Services', 'Wedding officiants', 5),
  ('Personal & Lifestyle Services', 'Personal shoppers', 6),
  ('Personal & Lifestyle Services', 'Professional organizers', 7),
  ('Personal & Lifestyle Services', 'Life coaching', 8),
  ('Non-profit & Community', 'Charities', 1),
  ('Non-profit & Community', 'Business associations', 2),
  ('Non-profit & Community', 'Chambers of commerce', 3),
  ('Non-profit & Community', 'Community organizations', 4),
  ('Non-profit & Community', 'Religious organizations', 5),
  ('Non-profit & Community', 'Social enterprises', 6),
  ('Non-profit & Community', 'Co-operatives', 7),
  ('Non-profit & Community', 'Indigenous organizations', 8),
  ('Non-profit & Community', 'Newcomer services', 9),
  ('Government & Public Sector Suppliers', 'Government contractors', 1),
  ('Government & Public Sector Suppliers', 'Municipal services', 2),
  ('Government & Public Sector Suppliers', 'Public procurement suppliers', 3),
  ('Government & Public Sector Suppliers', 'Defence and aerospace suppliers', 4),
  ('Other', 'Something else', 1)
on conflict do nothing;

-- the old names, mapped to the new list
create or replace function industry_alias(c text) returns text language sql immutable set search_path = public as $$
  select case c when 'Retail' then 'Retail & Shops' when 'Finance & Accounting' then 'Finance, Accounting & Insurance' when 'Technology' then 'Technology & IT' when 'Manufacturing' then 'Manufacturing & Makers' when 'Marketing & Design' then 'Marketing, Media & Design' when 'Health & Wellness' then 'Health & Medical' when 'Law' then 'Legal' when 'Construction' then 'Construction & Trades' when 'Logistics' then 'Logistics & Transport' when 'Food and hospitality' then 'Food & Drink' when 'Food and drink' then 'Food & Drink' when 'Professional services' then 'Professional Services' when 'Construction and trades' then 'Construction & Trades' when 'Transportation and trade' then 'Logistics & Transport' when 'Transport and logistics' then 'Logistics & Transport' when 'Energy and environment' then 'Energy & Environment' when 'Health and wellness' then 'Health & Medical' when 'Tech and online' then 'Technology & IT' when 'Finance' then 'Finance, Accounting & Insurance' else c end;
$$;

-- Business Directory: the same list, a speciality on each business ("sub"), and old categories moved across
alter table companies add column if not exists sub text not null default '' check (char_length(sub) <= 80);
update business_settings set categories = array['Food & Drink', 'Catering & Events', 'Retail & Shops', 'Online & E-commerce', 'Professional Services', 'Finance, Accounting & Insurance', 'Legal', 'Real Estate & Property', 'Construction & Trades', 'Home Services', 'Cleaning & Facilities', 'Automotive', 'Logistics & Transport', 'Manufacturing & Makers', 'Wholesale & Import/Export', 'Technology & IT', 'Marketing, Media & Design', 'Health & Medical', 'Wellness, Fitness & Beauty', 'Education & Training', 'Childcare & Family', 'Pets & Animals', 'Arts, Culture & Entertainment', 'Travel, Tourism & Hospitality', 'Agriculture & Farming', 'Energy & Environment', 'Staffing & HR', 'Security & Safety', 'Personal & Lifestyle Services', 'Non-profit & Community', 'Government & Public Sector Suppliers', 'Other'];
alter table business_settings alter column categories set default array['Food & Drink', 'Catering & Events', 'Retail & Shops', 'Online & E-commerce', 'Professional Services', 'Finance, Accounting & Insurance', 'Legal', 'Real Estate & Property', 'Construction & Trades', 'Home Services', 'Cleaning & Facilities', 'Automotive', 'Logistics & Transport', 'Manufacturing & Makers', 'Wholesale & Import/Export', 'Technology & IT', 'Marketing, Media & Design', 'Health & Medical', 'Wellness, Fitness & Beauty', 'Education & Training', 'Childcare & Family', 'Pets & Animals', 'Arts, Culture & Entertainment', 'Travel, Tourism & Hospitality', 'Agriculture & Farming', 'Energy & Environment', 'Staffing & HR', 'Security & Safety', 'Personal & Lifestyle Services', 'Non-profit & Community', 'Government & Public Sector Suppliers', 'Other'];
update companies set category = industry_alias(category) where category <> industry_alias(category);
update companies set category = 'Other' where category <> '' and not exists (select 1 from industries i where i.name = companies.category);

create or replace function companies_sub_check() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.sub <> '' and not exists (select 1 from specialities s where s.industry = new.category and s.name = new.sub) then
    raise exception 'choose a speciality from the list';
  end if;
  return new;
end $$;
drop trigger if exists companies_sub_check on companies;
create trigger companies_sub_check before insert or update of sub, category on companies for each row execute function companies_sub_check();

-- Directory search also matches the speciality and industry. p_terms holds plain word stems, with everyday words
-- such as "plumber" or "lawyer" already turned into the list's words by the site.
drop function if exists search_businesses(text, text, text, text, text, boolean, text, int, int);
create function search_businesses(
  q text default '', p_cat text default '', p_prov text default '', p_city text default '', p_kind text default '',
  p_open boolean default false, p_sort text default 'rating', p_limit int default 24, p_offset int default 0, p_terms text default ''
) returns table (id uuid, slug text, name text, category text, description text, logo_url text, cover_url text, city text, province text,
                 kind text, rating numeric, reviews int, followers int, is_open boolean, claimable boolean, sub text)
language sql stable set search_path = public as $$
  with base as (
    select c.*, r.rating as avg_rating, coalesce(r.n, 0)::int as review_n,
           business_is_open(c.hours, c.closures, c.tz) as open_now
    from companies c
    left join lateral (select round(avg(cr.rating), 1) as rating, count(*) as n from company_reviews cr where cr.company_id = c.id and cr.status = 'published') r on true
    where c.status = 'published'
      and (coalesce(q, '') = '' or c.fts @@ to_tsquery('english', q)
           or (coalesce(p_terms, '') <> '' and not exists (
                 select 1 from unnest(string_to_array(left(lower(p_terms), 200), ' ')) w
                 where w <> '' and position(w in lower(c.sub || ' ' || c.category)) = 0)))
      and (coalesce(p_cat, '') = '' or c.category = p_cat)
      and (coalesce(p_prov, '') = '' or c.province = upper(p_prov))
      and (coalesce(p_city, '') = '' or c.city = p_city)
      and (coalesce(p_kind, '') = '' or c.kind = p_kind)
  )
  select b.id, b.slug, b.name, b.category, b.description, b.logo_url, b.cover_url, b.city, b.province, b.kind,
         b.avg_rating, b.review_n, business_follower_count(b.id), b.open_now, b.claimable, b.sub
  from base b
  where not coalesce(p_open, false) or b.open_now
  order by case when p_sort = 'rating' then b.avg_rating end desc nulls last,
           case when p_sort = 'rating' then b.review_n end desc,
           case when p_sort = 'new' then b.created_at end desc,
           b.name
  limit least(greatest(coalesce(p_limit, 24), 1), 60) offset greatest(coalesce(p_offset, 0), 0);
$$;
grant execute on function search_businesses(text, text, text, text, text, boolean, text, int, int, text) to anon, authenticated;

-- Businesses for Sale: the same list
alter table sale_listings drop constraint if exists sale_listings_industry_check;
update sale_listings set industry = industry_alias(industry) where industry <> industry_alias(industry);
update sale_listings set industry = 'Other' where not exists (select 1 from industries i where i.name = sale_listings.industry);
create or replace function sale_industry_check() returns trigger
language plpgsql set search_path = public as $$
begin
  new.industry := industry_alias(new.industry);
  if not exists (select 1 from industries i where i.name = new.industry) then raise exception 'choose an industry from the list'; end if;
  return new;
end $$;
drop trigger if exists sale_industry_check on sale_listings;
create trigger sale_industry_check before insert or update of industry on sale_listings for each row execute function sale_industry_check();

-- Member Details: the industry answer uses the same list
update profile_details set core = jsonb_set(core, '{industry}', to_jsonb(industry_alias(core->>'industry')))
where core ? 'industry' and core->>'industry' <> industry_alias(core->>'industry');

-- About page: the weekly Hub briefing. Anyone may sign up; only the team can read the list.
create table if not exists briefing_signups (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  user_id uuid references profiles (id) on delete set null,
  source text not null default 'about' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);
alter table briefing_signups enable row level security;
create policy "team reads briefing sign-ups" on briefing_signups for select to authenticated using (is_staff());
revoke all on briefing_signups from anon, authenticated;
grant select on briefing_signups to authenticated;
create or replace function briefing_subscribe(p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_email is null or char_length(p_email) > 254 or lower(btrim(p_email)) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return false; end if;
  insert into briefing_signups (email, user_id) values (lower(btrim(p_email)), auth.uid()) on conflict (email) do nothing;
  return true;
end $$;
revoke execute on function briefing_subscribe(text) from public;
grant execute on function briefing_subscribe(text) to anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on industries, specialities, briefing_signups to service_role;
  end if;
end $$;
