-- Security tests. Each check prints PASS or FAIL. Run with supabase/tests/run.sh.
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned

create schema t;
create function t.expect_denied(label text, stmt text) returns text language plpgsql as $$
begin
  execute stmt;
  return 'FAIL  ' || label || ' (was allowed)';
exception when others then
  return 'PASS  ' || label;
end $$;
create function t.expect(label text, ok boolean) returns text language sql as $$
  select case when ok then 'PASS  ' else 'FAIL  ' end || label $$;
grant usage on schema t to anon, authenticated;

insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','alice@x.ca'), ('00000000-0000-0000-0000-00000000000b','bob@x.ca'),
 ('00000000-0000-0000-0000-00000000000c','carol@x.ca'), ('00000000-0000-0000-0000-00000000000d','dave@x.ca');
update profiles set member_type = 'plus' where id = '00000000-0000-0000-0000-00000000000a';
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000d';
\set a '''00000000-0000-0000-0000-00000000000a'''
\set b '''00000000-0000-0000-0000-00000000000b'''
\set c '''00000000-0000-0000-0000-00000000000c'''

-- ===== alice (SMB Plus) =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into posts (author_id, body, visibility) values (auth.uid(),'pub','public'),(auth.uid(),'mem','members'),(auth.uid(),'con','connections'),(auth.uid(),'priv','private');
insert into connections (requester_id, addressee_id) values (auth.uid(), :b);
insert into groups (slug, name, is_private, created_by) values ('secret','Secret', true, auth.uid());
insert into posts (author_id, body, group_id) select auth.uid(), 'grp', id from groups;
insert into companies (owner_id, slug, name) values (auth.uid(), 'alice-co', 'Alice Co');
update profiles set role = 'admin', member_type = 'advisor', status = 'active' where id = auth.uid();
select t.expect('member cannot promote self or change own plan', (select role = 'member' and member_type = 'plus' from profiles where id = auth.uid()));
update posts set pinned_at = now() where body = 'pub';
select t.expect('member cannot pin a post', (select pinned_at is null from posts where body = 'pub'));
select t.expect_denied('plan limit: second listing on SMB Plus', $$insert into companies (owner_id, slug, name) values (auth.uid(), 'alice-2', 'Second')$$);
select t.expect_denied('cannot review own business', $$insert into company_reviews (company_id, author_id, rating) select id, auth.uid(), 5 from companies$$);
select t.expect_denied('post image must be in our storage', $$insert into posts (author_id, body, image_url) values (auth.uid(), 'x', 'https://evil.example/track.png')$$);
select t.expect_denied('avatar must be in our storage', $$update profiles set avatar_url = 'https://evil.example/a.png' where id = auth.uid()$$);
select t.expect_denied('profile field length limit', $$update profiles set headline = repeat('x', 500) where id = auth.uid()$$);
select t.expect_denied('cannot message a non-connection', $$insert into messages (sender_id, recipient_id, body) values (auth.uid(), '00000000-0000-0000-0000-00000000000c', 'hi')$$);
select t.expect_denied('cannot invite a non-connection to a group', $$insert into group_invites (group_id, user_id, invited_by) select id, '00000000-0000-0000-0000-00000000000c', auth.uid() from groups$$);

-- ===== bob =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.expect('pending request does not unlock connections-only posts', (select string_agg(body, ',' order by body) = 'mem,pub' from posts));
select t.expect_denied('cannot message before the request is accepted', $$insert into messages (sender_id, recipient_id, body) values (auth.uid(), '00000000-0000-0000-0000-00000000000a', 'hi')$$);
update connections set status = 'accepted' where addressee_id = auth.uid();
select t.expect('accepted connection sees connections-only posts', (select string_agg(body, ',' order by body) = 'con,mem,pub' from posts));
insert into messages (sender_id, recipient_id, body) values (auth.uid(), :a, 'hello alice');
select t.expect_denied('cannot join a private group uninvited', $$insert into group_members (group_id, user_id) select id, auth.uid() from groups$$);
select t.expect_denied('cannot post as someone else', $$insert into posts (author_id, body) values ('00000000-0000-0000-0000-00000000000a', 'forged')$$);
select t.expect_denied('cannot send a message as someone else', $$insert into messages (sender_id, recipient_id, body) values ('00000000-0000-0000-0000-00000000000a', auth.uid(), 'forged')$$);
select t.expect_denied('free plan: no business listing', $$insert into companies (owner_id, slug, name) values (auth.uid(), 'bob-co', 'Bob Co')$$);
select t.expect_denied('cannot invite self into a group', $$insert into group_invites (group_id, user_id, invited_by) select id, auth.uid(), auth.uid() from groups$$);
update companies set name = 'Hacked' where slug = 'alice-co';
delete from posts where body = 'pub';
update profiles set full_name = 'Hacked' where id = :a;
insert into company_reviews (company_id, author_id, rating, body) select id, auth.uid(), 4, 'Good' from companies;
select t.expect_denied('one review per member per business', $$insert into company_reviews (company_id, author_id, rating) select id, auth.uid(), 1 from companies$$);
select t.expect_denied('rating must be 1 to 5', $$update company_reviews set rating = 9 where author_id = auth.uid()$$);
select t.expect('cannot read reports', (select count(*) = 0 from reports));
select t.expect('cannot read others'' notifications', (select count(*) = 0 from notifications where user_id <> auth.uid()));

-- ===== alice again =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect('others cannot edit my business, delete my post or rename me',
  (select name = 'Alice Co' from companies where slug = 'alice-co') and exists (select 1 from posts where body = 'pub') and (select full_name = 'alice' from profiles where id = auth.uid()));
select t.expect('message delivered to the recipient', (select count(*) = 1 from messages where recipient_id = auth.uid()));
update messages set body = 'tampered', read_at = now() where recipient_id = auth.uid();
select t.expect('recipient can mark read but not rewrite a message', (select body = 'hello alice' and read_at is not null from messages));
update companies set owner_id = :b where slug = 'alice-co';
select t.expect('a listing cannot be handed to another member', (select owner_id = auth.uid() from companies where slug = 'alice-co'));
insert into group_invites (group_id, user_id, invited_by) select id, :b, auth.uid() from groups;

-- ===== bob joins by invitation =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into group_members (group_id, user_id) select id, auth.uid() from groups;
select t.expect('invited member joins the private group and sees its posts', (select count(*) = 1 from posts where body = 'grp'));
select t.expect('invitation is used up after joining', (select count(*) = 0 from group_invites));
do $$ begin for i in 1..35 loop begin insert into comments (post_id, author_id, body) select id, auth.uid(), 'c' || i from posts where body = 'pub'; exception when others then null; end; end loop; end $$;
select t.expect('comment rate limit: 35 tries, exactly 30 saved', (select count(*) = 30 from comments));

-- ===== carol (stranger) =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.expect('stranger sees only public and members posts', (select string_agg(body, ',' order by body) = 'mem,pub' from posts));
select t.expect('stranger cannot read private messages', (select count(*) = 0 from messages));
select t.expect('stranger cannot see other people''s connections', (select count(*) = 0 from connections));
select t.expect('stranger cannot see invitations', (select count(*) = 0 from group_invites));
insert into blocks values (auth.uid(), :a);
select t.expect('blocking hides the blocked member''s posts', (select count(*) = 0 from posts));
do $$ begin for i in 1..14 loop begin insert into posts (author_id, body) values (auth.uid(), 'spam'); exception when others then null; end; end loop; end $$;
select t.expect('post rate limit: 14 tries, exactly 10 saved', (select count(*) = 10 from posts where author_id = auth.uid()));

-- ===== visitor (not signed in) =====
set role anon; set request.jwt.claim.sub = '';
select t.expect('visitor sees public posts only', (select string_agg(distinct body, ',') = 'pub' from posts where body <> 'spam'));
select t.expect('visitor cannot read messages, connections, notifications or reports',
  (select count(*) from messages) + (select count(*) from connections) + (select count(*) from notifications) + (select count(*) from reports) = 0);
select t.expect_denied('visitor cannot post', $$insert into posts (author_id, body) values ('00000000-0000-0000-0000-00000000000a', 'anon')$$);
select t.expect_denied('visitor cannot review', $$insert into company_reviews (company_id, author_id, rating) select id, '00000000-0000-0000-0000-00000000000c', 1 from companies$$);

-- ===== suspended member =====
reset role; update profiles set status = 'suspended' where id = :b;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.expect_denied('suspended member cannot post', $$insert into posts (author_id, body) values (auth.uid(), 'x')$$);
select t.expect_denied('suspended member cannot message', $$insert into messages (sender_id, recipient_id, body) values (auth.uid(), '00000000-0000-0000-0000-00000000000a', 'x')$$);
update profiles set status = 'active' where id = auth.uid();
select t.expect('suspended member cannot reinstate self', (select status = 'suspended' from profiles where id = auth.uid()));

-- ===== admin =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
update posts set pinned_at = now() where body = 'pub';
update profiles set status = 'active' where id = :b;
select t.expect('admin can pin posts and reinstate members',
  (select pinned_at is not null from posts where body = 'pub') and (select status = 'active' from profiles where id = :b));
select t.expect('admin sees every post for moderation', (select count(*) >= 5 from posts));

-- ===== reactions, reposts, connection count (0006) =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into reposts (post_id, user_id) select id, auth.uid() from posts where body = 'pub';
insert into reactions (post_id, user_id, kind) select id, auth.uid(), 'love' from posts where body = 'pub'
  on conflict (post_id, user_id) do update set kind = excluded.kind;
select t.expect_denied('member cannot repost in someone else''s name', $$insert into reposts (post_id, user_id) select id, '00000000-0000-0000-0000-00000000000c' from posts where body = 'pub'$$);
select t.expect_denied('unknown reaction kind is refused', $$update reactions set kind = 'angry' where user_id = auth.uid()$$);
update reactions set kind = 'celebrate' where user_id <> auth.uid();
select t.expect('member cannot change another member''s reaction', (select count(*) = 0 from reactions where user_id <> auth.uid() and kind = 'celebrate'));
select t.expect('post_extras reports kinds, own reaction and reposts',
  (select reposts = 1 and reposted and my_kind = 'love' and 'love' = any (kinds) from post_extras(array(select id from posts where body = 'pub'))));
select t.expect('post_extras says nothing about posts the caller cannot see',
  (select count(*) = 0 from post_extras(array(select id from posts where body = 'priv'))));
reset role;
select t.expect('private post exists for the check above', (select count(*) = 1 from posts where body = 'priv'));
set role anon; set request.jwt.claim.sub = '';
select t.expect('visitor gets a connection count without reading connection rows', connection_count('00000000-0000-0000-0000-00000000000a') >= 0);

-- ===== search and connection degrees (0007) =====
reset role;
-- a chain: a - b - c, and d on their own
delete from connections;
insert into connections (requester_id, addressee_id, status) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'accepted'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'accepted');
update profiles set full_name = 'Daniel Okafor', headline = 'Owner, Northside Logistics' where id = '00000000-0000-0000-0000-00000000000b';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect('degrees: connection is 1st, friend of a friend is 2nd, stranger is 3rd+',
  (select array_agg(degree order by id) = array[1, 2, 3] from connection_degrees(array[
    '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d']::uuid[])));
select t.expect('degrees: no row for yourself', (select count(*) = 0 from connection_degrees(array['00000000-0000-0000-0000-00000000000a']::uuid[])));
select t.expect('mutual connections counted', mutual_connections('00000000-0000-0000-0000-00000000000c') = 1);
select t.expect('people search matches the start of a word and a stemmed word',
  (select count(*) = 1 from search_profiles('dan:* & logistic:*')));
select t.expect('post search column is filled', (select count(*) > 0 from posts where fts @@ to_tsquery('english', 'pub:*')));
set role anon; set request.jwt.claim.sub = '';
select t.expect_denied('visitor cannot ask for connection degrees', $$select * from connection_degrees(array['00000000-0000-0000-0000-00000000000b']::uuid[])$$);
select t.expect_denied('visitor cannot ask for mutual connections', $$select mutual_connections('00000000-0000-0000-0000-00000000000b')$$);

-- ===== two roles only (0008) =====
reset role;
select t.expect_denied('moderator is no longer a valid role', $$update profiles set role = 'moderator' where id = '00000000-0000-0000-0000-00000000000b'$$);

-- ===== welcome email sent once (0009) =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.expect('first confirmation claims the welcome email', claim_welcome_email() = true);
select t.expect('a second claim (link clicked twice) does not', claim_welcome_email() = false);
select t.expect('members cannot read who was welcomed', (select count(*) = 0 from welcome_emails));
select t.expect_denied('members cannot mark themselves welcomed directly', $$insert into welcome_emails (user_id) values ('00000000-0000-0000-0000-00000000000b')$$);
set role anon; set request.jwt.claim.sub = '';
select t.expect_denied('visitors cannot claim a welcome email', $$select claim_welcome_email()$$);
reset role;
select t.expect('the claim is stored once', (select count(*) = 1 from welcome_emails where user_id = '00000000-0000-0000-0000-00000000000c'));

-- ===== bookmarks and reaction counts (0010) =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into saved_posts (user_id, post_id) select auth.uid(), id from posts where body = 'pub';
select t.expect('post_extras counts each reaction and shows the viewer saved it',
  (select (counts ->> 'love')::int = 1 and saved from post_extras(array(select id from posts where body = 'pub'))));
select t.expect_denied('member cannot save a post in someone else''s name', $$insert into saved_posts (user_id, post_id) select '00000000-0000-0000-0000-00000000000c', id from posts where body = 'pub'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.expect('bookmarks are private to their owner', (select count(*) = 0 from saved_posts));
select t.expect('another viewer does not see the post as saved', (select count(*) = 0 from post_extras(array(select id from posts where body = 'pub')) where saved));
set role anon; set request.jwt.claim.sub = '';
select t.expect_denied('visitors cannot save posts', $$insert into saved_posts (user_id, post_id) select '00000000-0000-0000-0000-00000000000b', id from posts where body = 'pub'$$);
reset role;

-- ===== CMS (0011) =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into messages (sender_id, recipient_id, body)
  select auth.uid(), '00000000-0000-0000-0000-00000000000a', 'secret words'
  where exists (select 1 from connections where status = 'accepted' and '00000000-0000-0000-0000-00000000000b' in (requester_id, addressee_id));
select t.expect('members cannot read the CMS activity log', (select count(*) = 0 from cms_events));
select t.expect_denied('members cannot write to the activity log', $$insert into cms_events (action, entity) values ('x','y')$$);
select t.expect_denied('members cannot list accounts and emails', $$select * from cms_users()$$);
select t.expect_denied('members cannot read the CMS overview', $$select cms_overview()$$);
select t.expect_denied('members cannot list conversations', $$select * from cms_conversations()$$);
select t.expect_denied('members cannot log CMS actions', $$select cms_log('x','y','z')$$);
select t.expect_denied('members cannot delete accounts', $$select cms_delete_account('00000000-0000-0000-0000-00000000000c')$$);
set role anon; set request.jwt.claim.sub = '';
select t.expect_denied('visitors cannot list accounts', $$select * from cms_users()$$);
select t.expect('visitors cannot read the activity log', (select count(*) = 0 from cms_events));

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.expect('admin sees hub changes in the activity log', (select count(*) > 0 from cms_events where entity = 'posts' and action = 'insert'));
select t.expect('activity log never stores message text', (select count(*) = 0 from cms_events where entity = 'messages' and (data ? 'body' or data::text like '%secret words%')));
select t.expect('admin lists accounts with emails', (select count(*) = 4 and bool_and(email like '%@x.ca') from cms_users(p_limit => 50)));
select t.expect('admin search finds a member by email', (select count(*) = 1 from cms_users(p_search => 'carol@')));
select t.expect('admin filters accounts whose email is not confirmed', (select count(*) = 4 from cms_users(p_confirmed => 'no', p_limit => 50)));
select t.expect('admin overview counts members', (select (cms_overview() ->> 'members')::int = 4));
select t.expect('admin can read connections', (select count(*) > 0 from connections));
select t.expect('admin still cannot read message text', (select count(*) = 0 from messages));
select cms_log('member.note', 'profiles', '00000000-0000-0000-0000-00000000000b', '{"note":"checked"}');
select t.expect('CMS actions are logged with the admin as actor', (select count(*) = 1 from cms_events where source = 'cms' and action = 'member.note' and actor_id = auth.uid()));
select t.expect_denied('admin cannot delete own account from the CMS', $$select cms_delete_account('00000000-0000-0000-0000-00000000000d')$$);
select cms_delete_account('00000000-0000-0000-0000-00000000000c');
reset role;
select t.expect('deleting an account removes the login and profile', (select count(*) = 0 from auth.users where id = '00000000-0000-0000-0000-00000000000c') and (select count(*) = 0 from profiles where id = '00000000-0000-0000-0000-00000000000c'));
select t.expect('the deletion is in the activity log', (select count(*) = 1 from cms_events where action = 'member.delete'));

-- ===== V2 foundation: team roles, plans, Founding badge, can(), test clock =====
reset role;
update profiles set plan = 'plus' where id = '00000000-0000-0000-0000-00000000000a';
select t.expect('an admin set the old way is in team_roles', (select count(*) = 1 from team_roles where user_id = '00000000-0000-0000-0000-00000000000d' and role = 'admin'));
select t.expect('every real member has a Founding number', (select count(*) = 0 from profiles where founding_number is null and not is_sample));

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update profiles set plan = 'advisor', founding_number = 999, is_sample = true, role = 'admin' where id = auth.uid();
select t.expect('a member cannot change their own plan, badge, sample flag or role', (select plan = 'free' and founding_number <> 999 and not is_sample and role = 'member' from profiles where id = auth.uid()));
select t.expect_denied('a member cannot give themselves a team role', $$insert into team_roles (user_id, role) values (auth.uid(), 'admin')$$);
select t.expect('a member is not staff', not is_staff() and not can('cms.access'));
select t.expect('Free cannot post an Offer', not can('post.offer', 0));
select t.expect('Free cannot host a private group', not can('group.private', 0));
select t.expect('Free gets 10 AI questions', can('ai.ask', 9) and not can('ai.ask', 10));

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect('Plus may post 2 Offers a month, not 3', can('post.offer', 0) and can('post.offer', 1) and not can('post.offer', 2));
select t.expect('Plus may host 1 private group', can('group.private', 0) and not can('group.private', 1));

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into team_roles (user_id, role, granted_by) values ('00000000-0000-0000-0000-00000000000b', 'moderator', auth.uid());
select t.expect_denied('an admin cannot change their own team role', $$update team_roles set role = 'moderator' where user_id = auth.uid()$$);
select t.expect('admin can open the CMS and manage roles', can('cms.access') and can('cms.admin'));

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.expect('a moderator is staff but not admin', is_staff() and not is_admin() and can('cms.access') and not can('cms.admin'));
select t.expect('a moderator still shows as member in the old role column', (select role = 'member' from profiles where id = auth.uid()));

reset role;
update profiles set status = 'suspended' where id = '00000000-0000-0000-0000-00000000000a';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect('a suspended member can do nothing', not can('post.offer', 0) and not can('ai.ask', 0));
reset role; set request.jwt.claim.sub = '';
update profiles set status = 'active' where id = '00000000-0000-0000-0000-00000000000a';

insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000e1', 'sample@x.ca', '{"sample": true}');
select t.expect('sample accounts are flagged and take no Founding number', (select is_sample and founding_number is null from profiles where id = '00000000-0000-0000-0000-0000000000e1'));
update founding_counter set cap = issued;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e2', 'late@x.ca');
select t.expect('after the cap, new members get no Founding number', (select founding_number is null from profiles where id = '00000000-0000-0000-0000-0000000000e2'));
select t.expect('no two members share a Founding number', (select count(*) = count(distinct founding_number) from profiles where founding_number is not null));
update founding_counter set cap = 500;

update profiles set role = 'member' where id = '00000000-0000-0000-0000-00000000000d';
select t.expect('removing admin the old way removes the team role', (select count(*) = 0 from team_roles where user_id = '00000000-0000-0000-0000-00000000000d'));
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000d';

set app.now = '2030-01-01 00:00+00';
select t.expect('tests can move the clock', app_now() = '2030-01-01 00:00+00'::timestamptz);
reset app.now;
select t.expect('the clock is real time otherwise', abs(extract(epoch from app_now() - now())) < 1);

set role anon; set request.jwt.claim.sub = '';
select t.expect_denied('visitors cannot call can()', $$select can('cms.access')$$);
select t.expect('visitors can read plan limits', (select count(*) = 21 from plan_limits));
reset role;

-- ===== Permission matrix, generated from plan_limits: every plan x every limited action =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000f1', 'free@x.ca'), ('00000000-0000-0000-0000-0000000000f2', 'plus@x.ca'),
 ('00000000-0000-0000-0000-0000000000f3', 'advisor@x.ca');
update profiles set plan = 'plus' where id = '00000000-0000-0000-0000-0000000000f2';
update profiles set plan = 'advisor' where id = '00000000-0000-0000-0000-0000000000f3';
create function t.plan_matrix() returns setof text language plpgsql as $$
declare r record; persona uuid; action text;
begin
  for r in select * from plan_limits where key in ('offers_per_month', 'private_groups', 'ai_per_month') order by plan, key loop
    action := case r.key when 'offers_per_month' then 'post.offer' when 'private_groups' then 'group.private' else 'ai.ask' end;
    persona := case r.plan when 'free' then '00000000-0000-0000-0000-0000000000f1'::uuid
                           when 'plus' then '00000000-0000-0000-0000-0000000000f2'::uuid
                           else '00000000-0000-0000-0000-0000000000f3'::uuid end;
    perform set_config('request.jwt.claim.sub', persona::text, true);
    if r.value is null then
      return next t.expect(format('%s: %s has no limit', r.plan, action), can(action, 999));
    elsif r.value = 0 then
      return next t.expect(format('%s: %s not allowed', r.plan, action), not can(action, 0));
    else
      return next t.expect(format('%s: %s allowed up to %s', r.plan, action, r.value), can(action, r.value - 1) and not can(action, r.value));
    end if;
  end loop;
end $$;
select * from t.plan_matrix();
set request.jwt.claim.sub = '';

-- ===== Phase 2: profiles and network =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000001e1','eve@x.ca'), ('00000000-0000-0000-0000-0000000001e2','fay@x.ca'),
 ('00000000-0000-0000-0000-0000000001e3','gus@x.ca'), ('00000000-0000-0000-0000-0000000001e4','hal@x.ca'),
 ('00000000-0000-0000-0000-0000000001e5','ida@x.ca'), ('00000000-0000-0000-0000-0000000001e6','jon@x.ca');
\set e1 '''00000000-0000-0000-0000-0000000001e1'''
\set e2 '''00000000-0000-0000-0000-0000000001e2'''
\set e3 '''00000000-0000-0000-0000-0000000001e3'''
\set e4 '''00000000-0000-0000-0000-0000000001e4'''
\set e5 '''00000000-0000-0000-0000-0000000001e5'''
\set e6 '''00000000-0000-0000-0000-0000000001e6'''

-- eve fills in her profile
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
update profiles set full_name = 'Zoë Tremblay', location = 'Montréal, QC', profile_type = 'advisor' where id = auth.uid();
select t.expect('member cannot make themselves an advisor', (select profile_type = 'owner' from profiles where id = auth.uid()));
update profiles set profile_type = 'maker' where id = auth.uid();
select t.expect('member can choose maker', (select profile_type = 'maker' from profiles where id = auth.uid()));
insert into profile_details (user_id, helps_with, needs, social_links, visibility)
  values (auth.uid(), '{Wholesale,Packaging}', '{Suppliers}', '{"linkedin":"https://linkedin.com/in/eve"}', '{"helps_with":"conn","needs":"only"}');
select t.expect_denied('social link must be https', $$update profile_details set social_links = '{"x":"javascript:alert(1)"}' where user_id = auth.uid()$$);
select t.expect_denied('visibility value must be known', $$update profile_details set visibility = '{"bio":"everyone"}' where user_id = auth.uid()$$);
select t.expect_denied('visibility field must be known', $$update profile_details set visibility = '{"password":"public"}' where user_id = auth.uid()$$);
select t.expect_denied('too many tags', $$update profile_details set helps_with = array(select 'tag' || g from generate_series(1,13) g) where user_id = auth.uid()$$);
select t.expect('owner sees all own fields', (select helps_with = '{Wholesale,Packaging}' and needs = '{Suppliers}' from get_profile_details(array[auth.uid()])));

-- a stranger and a visitor see only what is public
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('stranger cannot read details table directly', (select count(*) = 0 from profile_details));
select t.expect('connections-only field hidden from a stranger', (select helps_with = '{}' and needs = '{}' from get_profile_details(array['00000000-0000-0000-0000-0000000001e1'::uuid])));
select t.expect('public field shown to a stranger', (select social_links ? 'linkedin' from get_profile_details(array['00000000-0000-0000-0000-0000000001e1'::uuid])));
set role anon; set request.jwt.claim.sub = '';
select t.expect('visitor sees public fields only', (select helps_with = '{}' and social_links ? 'linkedin' from get_profile_details(array['00000000-0000-0000-0000-0000000001e1'::uuid])));
select t.expect_denied('visitor cannot record a view', $$select record_profile_view('00000000-0000-0000-0000-0000000001e1')$$);

-- connect fay (e2) and eve (e1)
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
insert into connections (requester_id, addressee_id) values (auth.uid(), :e1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
select t.expect_denied('no second connection row for the same pair', $$insert into connections (requester_id, addressee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000001e2')$$);
update connections set status = 'accepted' where addressee_id = auth.uid() and requester_id = :e2;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('a connection sees connections-only fields, not only-me fields', (select helps_with = '{Wholesale,Packaging}' and needs = '{}' from get_profile_details(array['00000000-0000-0000-0000-0000000001e1'::uuid])));

-- follows
insert into follows (follower_id, followee_id) values (auth.uid(), :e1);
select t.expect_denied('cannot follow yourself', $$insert into follows (follower_id, followee_id) values (auth.uid(), auth.uid())$$);
select t.expect_denied('cannot follow as someone else', $$insert into follows (follower_id, followee_id) values ('00000000-0000-0000-0000-0000000001e3', '00000000-0000-0000-0000-0000000001e1')$$);
set role anon; set request.jwt.claim.sub = '';
select t.expect('follower count is public', (select follower_count('00000000-0000-0000-0000-0000000001e1') = 1));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e3';
select t.expect('a stranger cannot list who follows whom', (select count(*) = 0 from follows));

-- recommendations
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e4';
select t.expect_denied('cannot recommend someone you are not connected to', $$insert into recommendations (author_id, subject_id, relationship, body) values (auth.uid(), '00000000-0000-0000-0000-0000000001e1', 'client', 'Great to work with, delivered on time.')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect_denied('recommendation must have real words', $$insert into recommendations (author_id, subject_id, relationship, body) values (auth.uid(), '00000000-0000-0000-0000-0000000001e1', 'client', 'nice')$$);
select t.expect_denied('relationship must be known', $$insert into recommendations (author_id, subject_id, relationship, body) values (auth.uid(), '00000000-0000-0000-0000-0000000001e1', 'boss', 'Great to work with, delivered on time.')$$);
insert into recommendations (author_id, subject_id, relationship, body) values (auth.uid(), :e1, 'client', 'Great to work with, delivered on time.');
select t.expect_denied('one recommendation per pair', $$insert into recommendations (author_id, subject_id, relationship, body) values (auth.uid(), '00000000-0000-0000-0000-0000000001e1', 'colleague', 'A second one that should be refused.')$$);
update recommendations set hidden = true where author_id = auth.uid();
select t.expect('author cannot hide it on the subject''s behalf', (select not hidden from recommendations where author_id = auth.uid()));
set role anon; set request.jwt.claim.sub = '';
select t.expect('visitors can read published recommendations', (select count(*) = 1 from recommendations));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
update recommendations set body = 'Edited by the person recommended, which is not allowed.' where subject_id = auth.uid();
select t.expect('subject cannot rewrite the words', (select body = 'Great to work with, delivered on time.' from recommendations where subject_id = auth.uid()));
update recommendations set hidden = true where subject_id = auth.uid();
set role anon; set request.jwt.claim.sub = '';
select t.expect('a hidden recommendation disappears for visitors', (select count(*) = 0 from recommendations));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
update recommendations set hidden = false where author_id = auth.uid();
select t.expect('author cannot unhide it', (select count(*) = 1 from recommendations where hidden));

-- warm introductions: fay (e2) asks eve (e1) to introduce her to hal (e4)
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e4';
insert into connections (requester_id, addressee_id) values (auth.uid(), :e1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
update connections set status = 'accepted' where addressee_id = auth.uid() and requester_id = :e4;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect_denied('intro must go through someone you are connected to', $$insert into intro_requests (requester_id, via_id, target_id, note) values (auth.uid(), '00000000-0000-0000-0000-0000000001e4', '00000000-0000-0000-0000-0000000001e1', 'hi')$$);
insert into intro_requests (requester_id, via_id, target_id, note) values (auth.uid(), :e1, :e4, 'Could you introduce me?');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e4';
update intro_requests set status = 'accepted';
select t.expect('only the go-between can answer an intro', (select count(*) = 0 from intro_requests));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
update intro_requests set status = 'accepted', note = 'changed' where via_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('accepting an intro sends the connection request, note unchanged', (select (select count(*) from connections where requester_id = :e2 and addressee_id = :e4 and status = 'pending') = 1 and note = 'Could you introduce me?' from intro_requests));

-- who viewed my profile: free plan sees 2 names of 3
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2'; select record_profile_view(:e1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e4'; select record_profile_view(:e1); select record_profile_view(:e1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e5'; select record_profile_view(:e1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e6';
insert into profile_details (user_id, private_browsing) values (auth.uid(), true);
select record_profile_view(:e1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1'; select record_profile_view(:e1);
select t.expect('three real viewers; self, private browser and repeat visits not counted', (select count(*) = 3 from my_profile_viewers()));
select t.expect('free plan sees 2 names, the rest hidden', (select count(*) filter (where shown) = 2 and count(*) filter (where not shown and viewer_id is null) = 1 from my_profile_viewers()));
select t.expect('30-day chart totals the views', (select sum(views) = 3 and count(*) = 30 from my_profile_view_days()));
select t.expect_denied('views table is not readable directly', $$select 1/(select count(*)::int from profile_views)$$);
reset role; set request.jwt.claim.sub = ''; update profiles set plan = 'plus' where id = :e1; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
select t.expect('paid plan sees every name', (select count(*) filter (where shown) = 3 from my_profile_viewers()));

-- search ignores accents and respects hidden fields
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('Montreal finds Montréal', (select count(*) = 1 from search_members('montreal') where id = :e1));
select t.expect('accent-free name search', (select count(*) = 1 from search_members('zoe') where id = :e1));
select t.expect('filter by province and type', (select count(*) = 1 from search_members('', 'maker', 'QC') where id = :e1));
select t.expect('filter by what they help with (visible to a connection)', (select count(*) = 1 from search_members('', null, null, 'Wholesale') where id = :e1));
select t.expect('search treats % as plain text', (select count(*) = 0 from search_members('%')));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
update profile_details set visibility = visibility || '{"location":"only"}' where user_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('a hidden city is not searchable', (select count(*) = 0 from search_members('montreal') where id = :e1));

-- blocks work both ways and cut the ties
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e3';
insert into connections (requester_id, addressee_id) values (auth.uid(), :e1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
insert into blocks (blocker_id, blocked_id) values (auth.uid(), :e3);
select t.expect('blocking removes the connection', (select count(*) = 0 from connections where :e3 in (requester_id, addressee_id) and :e1 in (requester_id, addressee_id)));
select t.expect('the blocker no longer finds the blocked member', (select count(*) = 0 from search_members('') where id = :e3));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e3';
select t.expect_denied('the blocked member cannot connect', $$insert into connections (requester_id, addressee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000001e1')$$);
select t.expect_denied('the blocked member cannot follow', $$insert into follows (follower_id, followee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000001e1')$$);
select t.expect('the blocked member no longer finds the blocker', (select count(*) = 0 from search_members('') where id = :e1));
select t.expect('the blocked member sees no details', (select count(*) = 0 or bool_and(helps_with = '{}' and social_links = '{}') from get_profile_details(array['00000000-0000-0000-0000-0000000001e1'::uuid])));
select record_profile_view(:e1);
select t.expect('a blocked member''s view is not recorded', (select count(*) = 0 from my_profile_viewers() where false) );

-- export and delete
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('export holds only my own profile', (select export_my_data() -> 'profile' ->> 'id' = '00000000-0000-0000-0000-0000000001e2'));
select t.expect('export has no search index column', (select not (export_my_data() -> 'profile' ? 'fts')));
reset role; set request.jwt.claim.sub = '';
select t.expect_denied('visitor cannot export', $$set role anon; select export_my_data()$$);
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e6';
select delete_my_account();
reset role;
select t.expect('deleting an account removes the profile and its details', (select count(*) = 0 from profiles where id = :e6) and (select count(*) = 0 from profile_details where user_id = :e6));
set request.jwt.claim.sub = '';
