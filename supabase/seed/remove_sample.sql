-- Removes every sample record before launch. Deleting the sample accounts also removes their
-- profiles, posts, comments, reactions, connections, messages and group memberships.
begin;
-- sample courses (Update 4); enrolments, progress, work and reviews go with them
delete from courses where is_sample;
-- sample businesses for sale (Update 5); their saves, enquiries, reports and views go with them
delete from sale_listings where is_sample;
delete from posts where is_sample;
delete from comments where is_sample;
delete from groups where is_sample and not exists (
  select 1 from group_members m join profiles p on p.id = m.user_id where m.group_id = groups.id and not p.is_sample
);
-- sample pages owned by the team (not by a sample member)
delete from companies where slug = 'lakeshore-catering-toronto';
delete from auth.users where raw_app_meta_data ->> 'sample' = 'true' or email like '%@demo.invalid';
commit;
