-- Two roles only: member and admin. The moderator tier is removed.
update profiles set role = 'member' where role = 'moderator';
alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('member', 'admin'));

-- "staff" now simply means admin, so every existing rule that checks is_staff() keeps working
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
