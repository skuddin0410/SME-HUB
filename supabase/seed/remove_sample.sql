-- Removes every sample record before launch. Deleting the sample accounts also removes their
-- profiles, posts, comments, reactions, connections, messages and group memberships.
begin;
delete from posts where is_sample;
delete from comments where is_sample;
delete from groups where is_sample and not exists (
  select 1 from group_members m join profiles p on p.id = m.user_id where m.group_id = groups.id and not p.is_sample
);
delete from auth.users where raw_app_meta_data ->> 'sample' = 'true' or email like '%@demo.invalid';
commit;
