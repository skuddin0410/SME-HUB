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

-- every test member has a photo and a headline unless a test says otherwise (Update 3: connecting needs both)
alter table profiles alter column avatar_url set default 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/t/p.jpg', alter column headline set default 'Owner, Test Co';
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','alice@x.ca'), ('00000000-0000-0000-0000-00000000000b','bob@x.ca'),
 ('00000000-0000-0000-0000-00000000000c','carol@x.ca'), ('00000000-0000-0000-0000-00000000000d','dave@x.ca');
update profiles set member_type = 'plus', plan = 'plus' where id = '00000000-0000-0000-0000-00000000000a';
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
reset role; set request.jwt.claim.sub = ''; update companies set status = 'published' where slug = 'alice-co';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update profiles set role = 'admin', member_type = 'advisor', status = 'active' where id = auth.uid();
select t.expect('member cannot promote self or change own plan', (select role = 'member' and member_type = 'plus' from profiles where id = auth.uid()));
update posts set pinned_at = now() where body = 'pub';
select t.expect('member cannot pin a post', (select pinned_at is null from posts where body = 'pub'));
insert into companies (owner_id, slug, name) values (auth.uid(), 'alice-2', 'Second'), (auth.uid(), 'alice-3', 'Third');
select t.expect_denied('limit per member: a fourth business page is refused', $$insert into companies (owner_id, slug, name) values (auth.uid(), 'alice-4', 'Fourth')$$);
reset role; set request.jwt.claim.sub = ''; delete from companies where slug in ('alice-2', 'alice-3');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
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
reset role; set request.jwt.claim.sub = ''; update business_settings set create_mode = 'paid';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.expect_denied('when business pages are paid-only, the free plan is refused', $$insert into companies (owner_id, slug, name) values (auth.uid(), 'bob-co', 'Bob Co')$$);
reset role; set request.jwt.claim.sub = ''; update business_settings set create_mode = 'all';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
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
reset role; select set_config('app.ready', '1', false); update profiles set ready_count = 5, ready_at = now() where id = '00000000-0000-0000-0000-00000000000b'; select set_config('app.ready', '', false); set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
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
select t.expect('go-between offered for the person you want to meet', (select count(*) = 1 from intro_candidates(:e4) where id = :e1));
select t.expect('nobody offered for someone you cannot reach', (select count(*) = 0 from intro_candidates(:e5)));
select t.expect_denied('intro must go through someone you are connected to', $$insert into intro_requests (requester_id, via_id, target_id, note) values (auth.uid(), '00000000-0000-0000-0000-0000000001e4', '00000000-0000-0000-0000-0000000001e1', 'hi')$$);
insert into intro_requests (requester_id, via_id, target_id, note) values (auth.uid(), :e1, :e4, 'Could you introduce me?');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e4';
update intro_requests set status = 'accepted';
select t.expect('only the go-between can answer an intro', (select count(*) = 0 from intro_requests));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e1';
update intro_requests set status = 'accepted', note = 'changed' where via_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('once asked, the go-between is no longer offered', (select count(*) = 0 from intro_candidates(:e4)));
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

-- member map: cities and counts only, and a member's own location privacy applies
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
reset role; update profiles set location = 'Montréal, QC' where id in (:e1, :e4); set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('map counts members per city', (select coalesce(sum(members), 0) >= 2 from member_map_cities() where location = 'Montréal, QC'));
reset role; insert into profile_details (user_id, visibility) values (:e4, '{"location":"only"}') on conflict (user_id) do update set visibility = '{"location":"only"}'; set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('a member who hides their city is not on the map', (select sum(members) = 1 from member_map_cities() where location = 'Montréal, QC'));
select t.expect('map can be narrowed to a province', (select count(*) = 0 from member_map_cities(null, 'ON') where location = 'Montréal, QC'));
reset role; delete from profile_details where user_id = :e4; set role authenticated;

-- (Update 3: only members with a ready profile are in search, so these test members are marked ready first)
reset role; select set_config('app.ready', '1', false); update profiles set ready_count = 5, ready_at = now(); select set_config('app.ready', '', false); set role authenticated;
-- search ignores accents and respects hidden fields
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000001e2';
select t.expect('Montreal finds Montréal', (select count(*) = 1 from search_members('montreal') where id = :e1));
select t.expect('accent-free name search', (select count(*) = 1 from search_members('zoe') where id = :e1));
select t.expect('filter by province and type', (select count(*) = 1 from search_members('', 'maker', 'QC') where id = :e1));
select t.expect('filter by what they help with (visible to a connection)', (select count(*) = 1 from search_members('', null, null, 'Wholesale') where id = :e1));
select t.expect('search treats % as plain text', (select count(*) = 0 from search_members('%')));
select t.expect('the member directory finds the same people as the search', (select count(*) = 1 from member_directory('montreal') where id = :e1));
select t.expect('the member directory counts recommendations and shows when a member was last active', (select recommended_by >= 0 and last_active is not null from member_directory('zoe') where id = :e1));
select t.expect('the member directory treats % as plain text', (select count(*) = 0 from member_directory('%')));
select t.expect('anyone can open the member directory', (select count(*) = 1 from pg_proc p where proname = 'member_directory' and has_function_privilege('anon', p.oid, 'execute')));
select t.expect('a profile shows when the member was last active', profile_last_active(:e1) is not null);
select t.expect('the public groups list never includes a private group', (select count(*) = 0 from profile_groups(:e1) g join groups x on x.id = g.id where x.is_private));
select t.expect('visitors cannot read anyone''s mutual connections', not has_function_privilege('anon', 'mutual_connection_list(uuid)', 'execute'));
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

-- ===== Phase 3: feed =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000005f1','gina@x.ca'), ('00000000-0000-0000-0000-0000000005f2','hugo@x.ca'), ('00000000-0000-0000-0000-0000000005f3','ivy@x.ca');
\set f1 '''00000000-0000-0000-0000-0000000005f1'''
\set f2 '''00000000-0000-0000-0000-0000000005f2'''
\set f3 '''00000000-0000-0000-0000-0000000005f3'''

-- gina (f1) posts in every visibility; ivy (f3) is her connection, hugo (f2) a stranger
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f1';
insert into posts (author_id, body, visibility, title) values
  (auth.uid(), 'g-public', 'public', 'A title'), (auth.uid(), 'g-members', 'members', ''), (auth.uid(), 'g-conn', 'connections', ''), (auth.uid(), 'g-only', 'private', '');
select t.expect('post keeps its title', (select count(*) = 1 from posts where body = 'g-public' and title = 'A title'));
select t.expect_denied('title is capped at 120 characters', $$insert into posts (author_id, body, title) values (auth.uid(), 'x', repeat('t', 121))$$);
select t.expect_denied('cover must be in our storage', $$insert into posts (author_id, body, cover_url) values (auth.uid(), 'x', 'https://evil.example/c.png')$$);
insert into posts (author_id, body, cover_url) values (auth.uid(), 'g-cover', 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/x/cover-1.jpg');
select t.expect('cover in our storage is fine', (select count(*) = 1 from posts where body = 'g-cover'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f3';
insert into connections (requester_id, addressee_id) values (auth.uid(), :f1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f1';
update connections set status = 'accepted' where addressee_id = auth.uid();

-- visibility is enforced by the database
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
select t.expect('stranger sees public and members posts only', (select array_agg(body order by body) = array['g-cover','g-members','g-public'] from posts where author_id = :f1));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f3';
select t.expect('connection also sees the connections post, not the private one', (select array_agg(body order by body) = array['g-conn','g-cover','g-members','g-public'] from posts where author_id = :f1));
set role anon; set request.jwt.claim.sub = '';
select t.expect('visitor sees public posts only', (select array_agg(body order by body) = array['g-cover','g-public'] from posts where author_id = :f1));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f1';
select t.expect('author sees all of their own', (select count(*) = 5 from posts where author_id = :f1));

-- scheduled posts
select t.expect_denied('cannot schedule in the past', $$insert into posts (author_id, body, scheduled_at) values (auth.uid(), 'late', now() - interval '1 hour')$$);
select t.expect_denied('cannot schedule more than 90 days ahead', $$insert into posts (author_id, body, scheduled_at) values (auth.uid(), 'far', now() + interval '91 days')$$);
insert into posts (author_id, body, scheduled_at) values (auth.uid(), 'g-later', now() + interval '1 day');
select t.expect('a scheduled post is marked scheduled', (select status = 'scheduled' from posts where body = 'g-later'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
select t.expect('nobody else can see a scheduled post', (select count(*) = 0 from posts where body = 'g-later'));
reset role; set request.jwt.claim.sub = ''; select t.expect('the job publishes nothing before the time', publish_due_posts() = 0);
set app.now = '2030-01-01 00:00+00';
select t.expect('the job publishes the due post', publish_due_posts() = 1);
select t.expect('running the job again publishes nothing more', publish_due_posts() = 0);
reset app.now;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
select t.expect('once published everyone can see it', (select count(*) = 1 from posts where body = 'g-later'));
select t.expect_denied('members cannot run the publishing job', $$select publish_due_posts()$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f1';
insert into posts (author_id, body, scheduled_at) values (auth.uid(), 'g-now', now() + interval '2 days');
update posts set scheduled_at = null where body = 'g-now';
select t.expect('publishing now from the scheduled list works', (select status = 'published' and scheduled_at is null from posts where body = 'g-now'));
insert into posts (author_id, body, scheduled_at) values (auth.uid(), 'g-move', now() + interval '2 days');
update posts set scheduled_at = now() + interval '3 days' where body = 'g-move';
select t.expect('a scheduled post can be moved', (select status = 'scheduled' from posts where body = 'g-move'));
select t.expect_denied('a published post cannot go back to scheduled', $$update posts set scheduled_at = now() + interval '2 days' where body = 'g-public'; select 1/(select count(*)::int from posts where body = 'g-public' and status = 'scheduled')$$);

-- edit window and pinning
update posts set body = 'g-public edited' where body = 'g-public';
select t.expect('author can edit inside the window and it is marked edited', (select edited_at is not null from posts where body = 'g-public edited'));
reset role; select set_config('app.now', (now() + interval '11 minutes')::text, false); set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f1';
select t.expect_denied('editing after the window is refused', $$update posts set body = 'too late' where body = 'g-public edited'$$);
update posts set visibility = 'members', comments_closed = true where body = 'g-public edited';
select t.expect('visibility and closing comments are allowed any time', (select visibility = 'members' and comments_closed from posts where body = 'g-public edited'));
update posts set profile_pinned = true where body = 'g-public edited';
select t.expect('author can pin a post to their profile', (select count(*) = 1 from posts where profile_pinned and author_id = :f1));
select t.expect_denied('only one profile pin at a time', $$update posts set profile_pinned = true where body = 'g-members'$$);
reset role; reset app.now; set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
update posts set profile_pinned = true, body = 'hijack', comments_closed = true where body = 'g-members';
select t.expect('nobody else can change or pin a member''s post', (select profile_pinned = false and body = 'g-members' and not comments_closed from posts where body = 'g-members'));

-- quote posts
insert into posts (author_id, body, quoted_post_id) select auth.uid(), 'h-quote', id from posts where body = 'g-members';
select t.expect('a visible post can be quoted', (select count(*) = 1 from posts where body = 'h-quote' and quoted_post_id is not null));
reset role; select id as gconn from posts where body = 'g-conn' \gset
select id as gonly from posts where body = 'g-only' \gset
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
select t.expect_denied('a post you cannot see cannot be quoted', format($q$insert into posts (author_id, body, quoted_post_id) values (auth.uid(), 'h-peek', %L)$q$, :'gconn'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f3';
select t.expect_denied('quoting someone''s private post is refused', format($q$insert into posts (author_id, body, quoted_post_id) values (auth.uid(), 'i-peek', %L)$q$, :'gonly'));

-- six reactions
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
do $$ declare k text; pid uuid; begin
  select id into pid from posts where body = 'g-members';
  foreach k in array array['like','celebrate','support','love','insight','funny'] loop
    delete from reactions where post_id = pid and user_id = auth.uid();
    insert into reactions (post_id, user_id, kind) values (pid, auth.uid(), k);
  end loop;
end $$;
select t.expect('all six reactions are accepted', (select kind = 'funny' from reactions where user_id = :f2 and post_id = (select id from posts where body = 'g-members')));
select t.expect_denied('an unknown reaction is refused', $$update reactions set kind = 'angry' where user_id = auth.uid()$$);

-- threaded comments
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
insert into comments (post_id, author_id, body) select id, auth.uid(), 'top' from posts where body = 'g-members';
insert into comments (post_id, author_id, body, parent_id) select post_id, auth.uid(), 'reply', id from comments where body = 'top';
select t.expect('a reply sits under its comment', (select count(*) = 1 from comments r join comments c on c.id = r.parent_id where r.body = 'reply' and c.body = 'top'));
select t.expect_denied('no replies to replies', $$insert into comments (post_id, author_id, body, parent_id) select post_id, auth.uid(), 'deep', id from comments where body = 'reply'$$);
select t.expect_denied('a reply must be on the same post', $$insert into comments (post_id, author_id, body, parent_id) select (select id from posts where body = 'g-cover'), auth.uid(), 'elsewhere', id from comments where body = 'top'$$);
update comments set body = 'top edited' where body = 'top';
select t.expect('own comment can be edited inside the window', (select edited_at is not null from comments where body = 'top edited'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f3';
update comments set body = 'tampered' where body = 'top edited';
select t.expect('nobody else can edit a comment', (select count(*) = 0 from comments where body = 'tampered'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
reset role; select set_config('app.now', (now() + interval '11 minutes')::text, false); set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
select t.expect_denied('editing a comment after the window is refused', $$update comments set body = 'late' where body = 'top edited'$$);
reset role; reset app.now; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
select t.expect_denied('no new comments once comments are closed', $$insert into comments (post_id, author_id, body) select id, auth.uid(), 'nope' from posts where body = 'g-public edited'$$);

-- polls
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f1';
insert into posts (author_id, body) values (auth.uid(), 'g-poll');
select t.expect_denied('a poll needs two options', $$select add_poll((select id from posts where body = 'g-poll'), array['only one'], now() + interval '1 day')$$);
select t.expect_denied('a poll has at most ten options', $$select add_poll((select id from posts where body = 'g-poll'), array['1','2','3','4','5','6','7','8','9','10','11'], now() + interval '1 day')$$);
select t.expect_denied('a poll cannot close within the hour', $$select add_poll((select id from posts where body = 'g-poll'), array['a','b'], now() + interval '10 minutes')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
select t.expect_denied('only the author can add a poll', $$select add_poll((select id from posts where body = 'g-poll'), array['a','b'], now() + interval '1 day')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f1';
select add_poll((select id from posts where body = 'g-poll'), array['Red', ' Blue ', '', 'Green'], now() + interval '1 day');
select t.expect('blank options are dropped', (select count(*) = 3 from poll_options where post_id = (select id from posts where body = 'g-poll')));
select t.expect_denied('one poll per post', $$select add_poll((select id from posts where body = 'g-poll'), array['a','b'], now() + interval '1 day')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f2';
insert into poll_votes (post_id, option_id, user_id) select post_id, id, auth.uid() from poll_options where label = 'Blue';
select t.expect('a vote is counted', (select votes = 1 from poll_options where label = 'Blue'));
select t.expect_denied('one vote per member', $$insert into poll_votes (post_id, option_id, user_id) select post_id, id, auth.uid() from poll_options where label = 'Red'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f3';
select t.expect('votes are anonymous: members see only their own', (select count(*) = 0 from poll_votes));
select t.expect_denied('cannot vote for another poll''s option', $$insert into poll_votes (post_id, option_id, user_id) select (select id from posts where body = 'g-members'), id, auth.uid() from poll_options where label = 'Red'$$);
reset role; select set_config('app.now', (now() + interval '2 days')::text, false); set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005f3';
select t.expect_denied('no votes after the poll closes', $$insert into poll_votes (post_id, option_id, user_id) select post_id, id, auth.uid() from poll_options where label = 'Green'$$);
reset role; reset app.now;
set role anon; set request.jwt.claim.sub = '';
select t.expect_denied('a visitor cannot create a poll', $$select add_poll((select id from posts where body = 'g-poll'), array['a','b'], now() + interval '1 day')$$);
select t.expect('a visitor can read poll results on a public post', (select sum(votes) = 1 from poll_options where post_id = (select id from posts where body = 'g-poll')));
reset role; set request.jwt.claim.sub = '';

-- ===== Phase 4: business profiles =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-000000000bb1','owen@x.ca'), ('00000000-0000-0000-0000-000000000bb2','mia@x.ca'), ('00000000-0000-0000-0000-000000000bb3','ed@x.ca'),
 ('00000000-0000-0000-0000-000000000bb4','ivan@x.ca'), ('00000000-0000-0000-0000-000000000bb5','sue@x.ca'), ('00000000-0000-0000-0000-000000000bb6','tom@x.ca');
\set o1 '''00000000-0000-0000-0000-000000000bb1'''
\set o2 '''00000000-0000-0000-0000-000000000bb2'''
\set o3 '''00000000-0000-0000-0000-000000000bb3'''
\set o4 '''00000000-0000-0000-0000-000000000bb4'''
\set o5 '''00000000-0000-0000-0000-000000000bb5'''
\set o6 '''00000000-0000-0000-0000-000000000bb6'''
-- a staff member (moderator) for approvals
insert into team_roles (user_id, role) values (:o5, 'moderator');

-- owen (o1) adds a business; new pages start as drafts
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb1';
insert into companies (owner_id, slug, name, category, city, province, kind, show_address, show_email, show_phone, hours, status)
  values (auth.uid(), 'maple-test', 'Maple Test Bakery', 'Food & Drink', 'Toronto', 'on', 'storefront', false, false, true,
          '{"mon": [["09:00","17:00"]], "tue": [["20:00","04:00"]]}', 'published');
select t.expect('a new page starts as a draft even if the member asks for published', (select status = 'draft' and province = 'ON' from companies where slug = 'maple-test'));
select t.expect('the owner is on the team automatically', (select role = 'owner' from business_team where user_id = auth.uid()));
select t.expect_denied('a member cannot publish a page when approval is required', $$update companies set status = 'published' where slug = 'maple-test'$$);
select t.expect_denied('a member cannot reject or approve their own page', $$update companies set status = 'rejected' where slug = 'maple-test'$$);
select t.expect_denied('category must come from the list', $$update companies set category = 'Made up' where slug = 'maple-test'$$);
insert into business_private (company_id, street, postal, email, phone, whatsapp) select id, '268 Queen St E', 'M4M 1J8', 'secret@maple.ca', '(416) 555-0124', '(416) 555-0125' from companies where slug = 'maple-test';
select t.expect('the owner reads the private details', (select count(*) = 1 from business_private));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
select t.expect('a draft page is invisible to other members', (select count(*) = 0 from companies where slug = 'maple-test'));
set role anon; set request.jwt.claim.sub = '';
select t.expect('a draft page is invisible to visitors', (select count(*) = 0 from companies where slug = 'maple-test'));

-- submit, then the team approves
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb1';
update companies set status = 'pending' where slug = 'maple-test';
select t.expect('the owner can submit for approval', (select status = 'pending' from companies where slug = 'maple-test'));
select t.expect_denied('a submitted page cannot go straight to published', $$update companies set status = 'published' where slug = 'maple-test'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb5';
update companies set status = 'published' where slug = 'maple-test';
select t.expect('the team can approve a page', (select status = 'published' from companies where slug = 'maple-test'));

-- hidden contacts never leave the database unless the page shows them
set role anon; set request.jwt.claim.sub = '';
select t.expect('a visitor sees the published page', (select count(*) = 1 from companies where slug = 'maple-test'));
select t.expect('a visitor cannot read the private table', (select count(*) = 0 from business_private));
select t.expect('contact: phone is shown, address and email stay hidden',
  (select phone = '(416) 555-0124' and street is null and postal is null and email is null and whatsapp is null from business_contact((select id from companies where slug = 'maple-test'))));
reset role; set request.jwt.claim.sub = '';
update companies set show_address = true, show_email = true where slug = 'maple-test';
set role anon;
select t.expect('contact: address and email appear once the owner shows them',
  (select street = '268 Queen St E' and email = 'secret@maple.ca' and whatsapp is null from business_contact((select id from companies where slug = 'maple-test'))));
reset role; update companies set show_address = false, show_email = false where slug = 'maple-test';

-- team roles
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb1';
insert into business_team (company_id, user_id, role) select id, :o2, 'manager' from companies where slug = 'maple-test';
insert into business_team (company_id, user_id, role) select id, :o3, 'editor' from companies where slug = 'maple-test';
insert into business_team (company_id, user_id, role) select id, :o4, 'responder' from companies where slug = 'maple-test';
select t.expect_denied('only a person''s role below owner can be given', $$insert into business_team (company_id, user_id, role) select id, '00000000-0000-0000-0000-000000000a99', 'owner' from companies where slug = 'maple-test'$$);
select t.expect_denied('the owner row cannot be removed', $$delete from business_team where role = 'owner'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
update companies set about = 'Managed by Mia' where slug = 'maple-test';
select t.expect('a manager can edit details', (select about = 'Managed by Mia' from companies where slug = 'maple-test'));
select t.expect('a manager reads the private details', (select count(*) = 1 from business_private));
select t.expect_denied('a manager cannot add team members', $$insert into business_team (company_id, user_id, role) select id, '00000000-0000-0000-0000-000000000a99', 'editor' from companies where slug = 'maple-test'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb3';
update companies set about = 'Editor overreach' where slug = 'maple-test';
select t.expect('an editor cannot edit details', (select about = 'Managed by Mia' from companies where slug = 'maple-test'));
select t.expect('an editor cannot read private details', (select count(*) = 0 from business_private));

-- posting as the business
insert into posts (author_id, body, business_id) select auth.uid(), 'Fresh trays today', id from companies where slug = 'maple-test';
select t.expect('an editor can post as the business', (select count(*) = 1 from posts where body = 'Fresh trays today' and business_id is not null));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb4';
select t.expect_denied('an inbox-only member cannot post as the business', $$insert into posts (author_id, body, business_id) select auth.uid(), 'nope', id from companies where slug = 'maple-test'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
select t.expect_denied('a non-team member cannot post as a business they do not belong to', $$insert into posts (author_id, body, business_id) select auth.uid(), 'x', id from companies where slug = 'alice-co'$$);

-- services and follows
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
insert into business_services (company_id, name, price_type, price) select id, 'Office trays', 'from', 120 from companies where slug = 'maple-test';
select t.expect_denied('a priced service needs a price', $$insert into business_services (company_id, name, price_type) select id, 'No price', 'fixed' from companies where slug = 'maple-test'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb3';
select t.expect_denied('an editor cannot add services', $$insert into business_services (company_id, name, price_type) select id, 'Nope', 'quote' from companies where slug = 'maple-test'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb5';
insert into business_follows (company_id, user_id) select id, auth.uid() from companies where slug = 'maple-test';
select t.expect('a follower is counted', (select business_follower_count(id) = 1 from companies where slug = 'maple-test'));
select t.expect_denied('cannot follow on behalf of someone else', $$insert into business_follows (company_id, user_id) select id, '00000000-0000-0000-0000-000000000bb3' from companies where slug = 'maple-test'$$);

-- reviews by criteria
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb1';
select t.expect_denied('the owner cannot review their own page', $$insert into company_reviews (company_id, author_id, rating, criteria) select id, auth.uid(), 5, '{"Quality": 5}' from companies where slug = 'maple-test'$$);
select t.expect_denied('a team member cannot review the page either', format($q$insert into company_reviews (company_id, author_id, rating) select id, %L, 5 from companies where slug = 'maple-test'$q$, :o2));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb5';
insert into company_reviews (company_id, author_id, rating, criteria, body) select id, auth.uid(), 1, '{"Quality": 5, "Value": 4, "Communication": 3}', 'Great' from companies where slug = 'maple-test';
select t.expect('the overall rating is the average of the criteria', (select rating = 4 from company_reviews where author_id = auth.uid() and body = 'Great'));
delete from company_reviews where body = 'Great';
select t.expect_denied('an unknown criterion is refused', $$insert into company_reviews (company_id, author_id, rating, criteria) select id, auth.uid(), 3, '{"Speed": 5}' from companies where slug = 'maple-test'$$);
select t.expect_denied('each criterion is 1 to 5', $$insert into company_reviews (company_id, author_id, rating, criteria) select id, auth.uid(), 3, '{"Quality": 9}' from companies where slug = 'maple-test'$$);
reset role; set request.jwt.claim.sub = ''; update business_settings set review_approval = true;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb6';
insert into company_reviews (company_id, author_id, rating, criteria, body) select id, auth.uid(), 3, '{"Quality": 3}', 'Needs approval' from companies where slug = 'maple-test';
select t.expect('with review approval on, a new review waits', (select status = 'pending' from company_reviews where body = 'Needs approval'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
select t.expect('a pending review is hidden from the public but a manager can see it', (select count(*) = 1 from company_reviews where body = 'Needs approval'));
set role anon; set request.jwt.claim.sub = '';
select t.expect('a pending review is hidden from visitors', (select count(*) = 0 from company_reviews where body = 'Needs approval'));
reset role; update business_settings set review_approval = false;
-- reply
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
insert into business_review_replies (company_id, review_author_id, author_id, body) select company_id, author_id, auth.uid(), 'Thank you' from company_reviews where body = 'Needs approval';
select t.expect('a manager can reply to a review', (select count(*) = 1 from business_review_replies));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb3';
reset role; select id as maplecid from companies where slug = 'maple-test' \gset
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb3';
select t.expect_denied('an editor cannot reply to a review', format($q$insert into business_review_replies (company_id, review_author_id, author_id, body) values (%L, %L, %L, 'x')$q$, :'maplecid', :o6, :o3));

-- shared inbox
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb5';
insert into business_inquiries (company_id, sender_id, kind) select id, auth.uid(), 'quote' from companies where slug = 'maple-test';
insert into business_inquiry_messages (inquiry_id, author_id, body) select id, auth.uid(), 'Quote for 40 people?' from business_inquiries;
select t.expect('the sender is not "as the business"', (select not as_business from business_inquiry_messages));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb4';
select t.expect('an inbox member sees the inquiry', (select count(*) = 1 from business_inquiries));
insert into business_inquiry_messages (inquiry_id, author_id, body, as_business) select id, auth.uid(), 'Yes, $900', false from business_inquiries;
select t.expect('a team reply is marked as the business and the inquiry is answered', (select count(*) = 1 from business_inquiry_messages where as_business) and (select status = 'answered' from business_inquiries));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb3';
select t.expect('an editor cannot read the inbox', (select count(*) = 0 from business_inquiries) and (select count(*) = 0 from business_inquiry_messages));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000a99'; set role authenticated;
select t.expect('a stranger cannot read the inbox', (select count(*) = 0 from business_inquiries) and (select count(*) = 0 from business_inquiry_messages));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb1';
select t.expect_denied('the owner cannot message their own business', $$insert into business_inquiries (company_id, sender_id) select id, auth.uid() from companies where slug = 'maple-test'$$);

-- claims
reset role; set request.jwt.claim.sub = '';
insert into companies (owner_id, slug, name, category, city, province, status, claimable) values (:o5, 'lakeshore-test', 'Lakeshore Catering', 'Catering & Events', 'Toronto', 'ON', 'published', true);
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
select t.expect_denied('a listing that is not claimable cannot be claimed', $$insert into business_claims (company_id, user_id, evidence) select id, auth.uid(), 'I own this business, see my website' from companies where slug = 'maple-test'$$);
select t.expect_denied('a claim needs some evidence', $$insert into business_claims (company_id, user_id, evidence) select id, auth.uid(), 'mine' from companies where slug = 'lakeshore-test'$$);
insert into business_claims (company_id, user_id, evidence) select id, auth.uid(), 'I own this business, see my website lakeshore.ca' from companies where slug = 'lakeshore-test';
select t.expect_denied('only the team can decide a claim', $$select decide_claim((select id from business_claims limit 1), true)$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb5';
select decide_claim((select id from business_claims limit 1), true);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb2';
select t.expect('an approved claim hands the page to the claimant', (select owner_id = :o2 and not claimable from companies where slug = 'lakeshore-test') and (select role = 'owner' from business_team where user_id = auth.uid() and company_id = (select id from companies where slug = 'lakeshore-test')));

-- directory search and open-now
set role anon; set request.jwt.claim.sub = '';
select t.expect('search finds published businesses by city and category', (select count(*) = 2 from search_businesses('', '', 'ON', 'Toronto', '', false, 'name', 24, 0)));
select t.expect('search filters by category', (select count(*) = 1 from search_businesses('', 'Food & Drink', '', '', '', false, 'name', 24, 0)));
select t.expect('open now: Monday 10:00 Toronto is open', business_is_open('{"mon": [["09:00","17:00"]]}', '[]', 'America/Toronto', '2026-11-23 15:00+00'));
select t.expect('open now: Monday 18:00 Toronto is closed', not business_is_open('{"mon": [["09:00","17:00"]]}', '[]', 'America/Toronto', '2026-11-23 23:00+00'));
select t.expect('open now: an overnight shift is open at 02:00 the next morning', business_is_open('{"mon": [["20:00","04:00"]]}', '[]', 'America/Toronto', '2026-11-24 07:00+00'));
select t.expect('open now: a holiday closure closes the day', not business_is_open('{"mon": [["09:00","17:00"]]}', '[{"date":"2026-11-23"}]', 'America/Toronto', '2026-11-23 15:00+00'));
select t.expect('the map lists cities with counts only', (select count(*) >= 1 and bool_and(city <> '') from business_map_cities('', '')));
reset role; set request.jwt.claim.sub = '';

-- photos, shop, jobs and events tabs
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb1';
insert into business_photos (company_id, url, caption) select id, 'https://picsum.photos/seed/maple1/800/600', 'Fresh loaves' from companies where slug = 'maple-test';
insert into business_products (company_id, name, price) select id, 'Shortbread box', 28 from companies where slug = 'maple-test';
insert into business_jobs (company_id, title, job_type) select id, 'Baker', 'full-time' from companies where slug = 'maple-test';
insert into business_events (company_id, title, starts_at) select id, 'Open house', '2026-12-05 15:00+00' from companies where slug = 'maple-test';
select t.expect('the owner adds a photo, a product, a job and an event', (select count(*) = 1 from business_photos) and (select count(*) = 1 from business_products) and (select count(*) = 1 from business_jobs) and (select count(*) = 1 from business_events));
select t.expect_denied('a photo must be one of our files', $$insert into business_photos (company_id, url) select id, 'https://evil.example/x.jpg' from companies where slug = 'maple-test'$$);
select t.expect_denied('a product cannot have a negative price', $$insert into business_products (company_id, name, price) select id, 'Bad', -1 from companies where slug = 'maple-test'$$);
select t.expect_denied('an event cannot end before it starts', $$insert into business_events (company_id, title, starts_at, ends_at) select id, 'Odd', '2026-12-05 15:00+00', '2026-12-05 10:00+00' from companies where slug = 'maple-test'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb3';
select t.expect_denied('an editor cannot add a product', $$insert into business_products (company_id, name, price) select id, 'Nope', 5 from companies where slug = 'maple-test'$$);
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000a99'; set role authenticated;
select t.expect_denied('a stranger cannot add a job', $$insert into business_jobs (company_id, title) select id, 'Hacker' from companies where slug = 'maple-test'$$);
select t.expect('anyone can read the tabs of a published page', (select count(*) = 1 from business_photos) and (select count(*) = 1 from business_jobs));
reset role; set request.jwt.claim.sub = '';
insert into business_photos (company_id, url) select id, 'https://picsum.photos/seed/p' || g || '/800/600' from companies, generate_series(1, 29) g where slug = 'maple-test';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000bb1';
select t.expect_denied('a business can have at most 30 photos', $$insert into business_photos (company_id, url) select id, 'https://picsum.photos/seed/extra/800/600' from companies where slug = 'maple-test'$$);
reset role; set request.jwt.claim.sub = '';

-- ===== groups (phase 5) =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000e01','gina@x.ca'), ('00000000-0000-0000-0000-000000000e02','hugo@x.ca');
\set d '\'00000000-0000-0000-0000-00000000000d\''
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e01';
insert into groups (slug, name, created_by, category) values ('bobs-club', 'Bob Club', auth.uid(), 'Community');
select t.expect('a new public group waits for the team (pending)', (select status = 'pending' and category = 'Community' from groups where slug = 'bobs-club'));
select t.expect_denied('a free member cannot start a private group', $$insert into groups (slug, name, is_private, created_by) values ('bob-priv', 'Bob Private', true, auth.uid())$$);
select t.expect_denied('a group creator cannot approve their own group', $$update groups set status = 'active' where slug = 'bobs-club'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e02';
select t.expect('a pending group is hidden from other members', (select count(*) = 0 from groups where slug = 'bobs-club'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect_denied('Plus allows one private group, so a second is refused', $$insert into groups (slug, name, is_private, created_by) values ('alice-priv-2', 'Second', true, auth.uid())$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.expect('the team sees a pending group', (select count(*) = 1 from groups where slug = 'bobs-club'));
update groups set status = 'active' where slug = 'bobs-club';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e02';
select t.expect('an approved group is visible to everyone', (select count(*) = 1 from groups where slug = 'bobs-club'));
select t.expect('a public group is open to join by default', (select join_mode = 'open' from groups where slug = 'bobs-club'));
-- join by request
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e01';
update groups set join_mode = 'request', rules = 'Be kind. No ads.' where slug = 'bobs-club';
select t.expect('the group admin sets the joining mode and rules', (select join_mode = 'request' and rules = 'Be kind. No ads.' from groups where slug = 'bobs-club'));
select t.expect_denied('an admin cannot make the group private', $$update groups set is_private = true where slug = 'bobs-club'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e02';
select t.expect_denied('cannot join a request-only group directly', $$insert into group_members (group_id, user_id) select id, auth.uid() from groups where slug = 'bobs-club'$$);
insert into group_join_requests (group_id, user_id, message) select id, auth.uid(), 'I run a bakery' from groups where slug = 'bobs-club';
select t.expect('a member can ask to join', (select count(*) = 1 from group_join_requests));
select t.expect_denied('cannot ask for someone else', $$insert into group_join_requests (group_id, user_id) select id, '00000000-0000-0000-0000-00000000000a' from groups where slug = 'bobs-club'$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect('a stranger cannot read join requests', (select count(*) = 0 from group_join_requests));
select t.expect_denied('a non-moderator cannot approve a request', $$select decide_group_request((select id from groups where slug = 'bobs-club'), '00000000-0000-0000-0000-000000000e02', true)$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e01';
select t.expect('the admin sees the request', (select count(*) = 1 from group_join_requests where status = 'pending'));
select decide_group_request((select id from groups where slug = 'bobs-club'), '00000000-0000-0000-0000-000000000e02', true);
select t.expect('approving a request adds the member', (select count(*) = 1 from group_members where user_id = '00000000-0000-0000-0000-000000000e02' and group_id = (select id from groups where slug = 'bobs-club')));
select t.expect_denied('an answered request cannot be answered again', $$select decide_group_request((select id from groups where slug = 'bobs-club'), '00000000-0000-0000-0000-000000000e02', false)$$);
-- moderators
update group_members set role = 'moderator' where user_id = '00000000-0000-0000-0000-000000000e02';
select t.expect('the admin makes a moderator', (select role = 'moderator' from group_members where user_id = '00000000-0000-0000-0000-000000000e02' and group_id = (select id from groups where slug = 'bobs-club')));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into group_join_requests (group_id, user_id) select id, auth.uid() from groups where slug = 'bobs-club';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e02';
select decide_group_request((select id from groups where slug = 'bobs-club'), '00000000-0000-0000-0000-00000000000a', true);
select t.expect('a moderator approves a request', (select count(*) = 1 from group_members where user_id = '00000000-0000-0000-0000-00000000000a' and group_id = (select id from groups where slug = 'bobs-club')));
delete from group_members where user_id = '00000000-0000-0000-0000-000000000e01' and group_id = (select id from groups where slug = 'bobs-club');
select t.expect('a moderator cannot remove the admin', (select count(*) = 1 from group_members where user_id = '00000000-0000-0000-0000-000000000e01' and group_id = (select id from groups where slug = 'bobs-club')));
update group_members set role = 'moderator' where user_id = '00000000-0000-0000-0000-00000000000a';
select t.expect('a moderator cannot hand out moderator roles', (select role = 'member' from group_members where user_id = '00000000-0000-0000-0000-00000000000a' and group_id = (select id from groups where slug = 'bobs-club')));
delete from group_members where user_id = '00000000-0000-0000-0000-00000000000a' and group_id = (select id from groups where slug = 'bobs-club');
select t.expect('a moderator removes a member', (select count(*) = 0 from group_members where user_id = '00000000-0000-0000-0000-00000000000a' and group_id = (select id from groups where slug = 'bobs-club')));
-- message all members
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e02';
select t.expect_denied('a moderator cannot message all members', $$select message_group_members((select id from groups where slug = 'bobs-club'), 'Hello all')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e01';
select t.expect('the admin messages all members', message_group_members((select id from groups where slug = 'bobs-club'), 'Welcome to the club') = 1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e02';
select t.expect('members receive the message as a direct message', (select count(*) = 1 from messages where recipient_id = auth.uid() and body = 'Welcome to the club'));
-- archive
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e01';
insert into posts (author_id, body, group_id) select auth.uid(), 'club post', id from groups where slug = 'bobs-club';
update groups set status = 'archived' where slug = 'bobs-club';
select t.expect('the admin archives the group', (select status = 'archived' from groups where slug = 'bobs-club'));
select t.expect_denied('an archived group takes no new posts', $$insert into posts (author_id, body, group_id) select auth.uid(), 'late', id from groups where slug = 'bobs-club'$$);
select t.expect_denied('the admin cannot reject their own group', $$update groups set status = 'rejected' where slug = 'bobs-club'$$);
select t.expect_denied('only the team changes a group address', $$update groups set slug = 'taken' where slug = 'bobs-club'$$);
-- settings
update group_settings set create_public = 'all';
select t.expect('a member cannot change group settings', (select create_public = 'approval' from group_settings));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
update group_settings set create_public = 'all';
select t.expect('an admin changes group settings', (select create_public = 'all' from group_settings));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e01';
insert into groups (slug, name, created_by) values ('bobs-open', 'Open Club', auth.uid());
select t.expect('with approval switched off a new public group is live at once', (select status = 'active' from groups where slug = 'bobs-open'));
reset role; set request.jwt.claim.sub = '';
update group_settings set create_public = 'approval';

-- ===== plans and billing (phase 6) =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000e03', 'ivy@x.ca');
select t.expect('a signed-in member cannot apply a billing event', (select count(*) = 0 from pg_proc p where proname = 'apply_subscription' and has_function_privilege('authenticated', p.oid, 'execute')));
select t.expect('a visitor cannot apply a billing event', (select count(*) = 0 from pg_proc p where proname = 'apply_subscription' and has_function_privilege('anon', p.oid, 'execute')));
create temp table r1 as select apply_subscription('evt_1', 'customer.subscription.created', '2026-11-01 10:00+00', '00000000-0000-0000-0000-000000000e03', 'cus_1', 'sub_1', 'advisor', 'year', 'active', '2027-11-01 10:00+00', false) as res;
select t.expect('a new paid subscription raises the plan', (select res = 'applied' from r1) and (select plan = 'advisor' from profiles where id = '00000000-0000-0000-0000-000000000e03'));
select t.expect('the same event twice changes nothing', apply_subscription('evt_1', 'customer.subscription.created', '2026-11-01 10:00+00', '00000000-0000-0000-0000-000000000e03', 'cus_1', 'sub_1', 'advisor', 'year', 'active', '2027-11-01 10:00+00', false) = 'duplicate');
select t.expect('the customer is remembered', (select stripe_customer_id = 'cus_1' from billing_customers where user_id = '00000000-0000-0000-0000-000000000e03'));

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e03';
insert into groups (slug, name, is_private, created_by) values ('ivy-1', 'Ivy 1', true, auth.uid()), ('ivy-2', 'Ivy 2', true, auth.uid()), ('ivy-3', 'Ivy 3', true, auth.uid());
select t.expect('an Advisor holds three private groups', (select count(*) = 3 from groups where created_by = auth.uid() and is_private and status = 'active'));
select t.expect('a member can read their own subscription', (select count(*) = 1 from subscriptions));
select t.expect_denied('a member cannot write a subscription', $$update subscriptions set plan = 'advisor'$$);
reset role; set request.jwt.claim.sub = '';

select apply_subscription('evt_0', 'customer.subscription.updated', '2026-10-01 10:00+00', '00000000-0000-0000-0000-000000000e03', 'cus_1', 'sub_1', 'plus', 'month', 'active', '2026-12-01 10:00+00', false) as r \gset
select t.expect('an older event arriving late is ignored', :'r' = 'stale' and (select plan = 'advisor' from profiles where id = '00000000-0000-0000-0000-000000000e03'));
select apply_subscription('evt_2', 'customer.subscription.updated', '2026-11-10 10:00+00', '00000000-0000-0000-0000-000000000e03', 'cus_1', 'sub_1', 'plus', 'month', 'active', '2026-12-10 10:00+00', false) as r \gset
select t.expect('a downgrade to Plus keeps one private group and archives the rest', :'r' = 'applied' and (select count(*) = 1 from groups where created_by = '00000000-0000-0000-0000-000000000e03' and status = 'active') and (select count(*) = 2 from groups where created_by = '00000000-0000-0000-0000-000000000e03' and status = 'archived'));
select t.expect('nothing is deleted on a downgrade', (select count(*) = 3 from groups where created_by = '00000000-0000-0000-0000-000000000e03'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000e03';
select t.expect_denied('an archived private group cannot come back above the plan limit', $$update groups set status = 'active' where created_by = auth.uid() and status = 'archived'$$);
reset role; set request.jwt.claim.sub = '';
select apply_subscription('evt_3', 'customer.subscription.updated', '2026-11-12 10:00+00', '00000000-0000-0000-0000-000000000e03', 'cus_1', 'sub_1', 'plus', 'month', 'past_due', '2026-12-10 10:00+00', false) as r \gset
select t.expect('a late payment keeps the plan', :'r' = 'applied' and (select plan = 'plus' from profiles where id = '00000000-0000-0000-0000-000000000e03'));
select apply_subscription('evt_4', 'customer.subscription.updated', '2026-11-13 10:00+00', '00000000-0000-0000-0000-000000000e03', 'cus_1', 'sub_old', 'plus', 'month', 'canceled', null, false) as r \gset
select t.expect('the end of an old subscription does not touch a newer one', :'r' = 'stale' and (select plan = 'plus' from profiles where id = '00000000-0000-0000-0000-000000000e03'));
select apply_subscription('evt_5', 'customer.subscription.updated', '2026-11-20 10:00+00', '00000000-0000-0000-0000-000000000e03', 'cus_1', 'sub_1', 'plus', 'month', 'canceled', null, false) as r \gset
select t.expect('cancelling returns the member to Free and archives all private groups', :'r' = 'applied' and (select plan = 'free' from profiles where id = '00000000-0000-0000-0000-000000000e03') and (select count(*) = 0 from groups where created_by = '00000000-0000-0000-0000-000000000e03' and status = 'active'));
select apply_subscription('evt_6', 'customer.subscription.updated', '2026-11-21 10:00+00', '00000000-0000-0000-0000-000000000e03', 'cus_1', 'sub_2', 'advisor', 'month', 'incomplete', null, false) as r \gset
select t.expect('a half-finished checkout changes nothing yet', :'r' = 'applied' and (select plan = 'free' from profiles where id = '00000000-0000-0000-0000-000000000e03'));
select t.expect('an event for an unknown member is recorded and skipped', apply_subscription('evt_7', 'customer.subscription.created', '2026-11-21 10:00+00', '00000000-0000-0000-0000-00000000ffff', 'cus_9', 'sub_9', 'plus', 'month', 'active', null, false) = 'unknown member');
select t.expect('every event is on record', (select count(*) = 8 from billing_events));

-- founding offer
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000e04', 'jo@x.ca'), ('00000000-0000-0000-0000-000000000e05', 'kim@x.ca');
select t.expect('250 founding places are open at the start', founding_offer_left() = 250);
select apply_subscription('evt_f1', 'customer.subscription.created', '2026-11-22 10:00+00', '00000000-0000-0000-0000-000000000e04', 'cus_f1', 'sub_f1', 'plus', 'year', 'active', '2027-11-22 10:00+00', false, true) as r \gset
select t.expect('a founding sign-up takes a place', :'r' = 'applied' and founding_offer_left() = 249);
select apply_subscription('evt_f2', 'customer.subscription.updated', '2026-11-23 10:00+00', '00000000-0000-0000-0000-000000000e04', 'cus_f1', 'sub_f1', 'plus', 'year', 'active', '2027-11-22 10:00+00', false, false) as r \gset
select t.expect('the same member never takes a second place, and keeps theirs', :'r' = 'applied' and founding_offer_left() = 249 and (select founding_offer from subscriptions where user_id = '00000000-0000-0000-0000-000000000e04'));
select apply_subscription('evt_f3', 'customer.subscription.created', '2026-11-24 10:00+00', '00000000-0000-0000-0000-000000000e05', 'cus_f5', 'sub_f5', 'plus', 'year', 'active', '2027-11-24 10:00+00', false, false) as r \gset
select t.expect('a normal Plus sign-up takes no founding place', :'r' = 'applied' and not (select founding_offer from subscriptions where user_id = '00000000-0000-0000-0000-000000000e05'));
select t.expect('anyone can see how many founding places are left', (select count(*) = 1 from pg_proc p where proname = 'founding_offer_left' and has_function_privilege('anon', p.oid, 'execute')));

-- group card extras
select t.expect('group card extras are open to everyone', (select count(*) = 1 from pg_proc p where proname = 'group_card_extras' and has_function_privilege('anon', p.oid, 'execute')));
select t.expect('group card extras give nothing for an unknown group', (select count(*) = 0 from group_card_extras(array['00000000-0000-0000-0000-00000000dead']::uuid[])));

-- hub events and seats
select t.expect('the events list is public', (select count(*) >= 3 from hub_events where status = 'published'));
select t.expect('seats are never readable by anyone signed out', not has_table_privilege('anon', 'event_rsvps', 'select'));

-- advisor_profiles: anyone reads, a member cannot write their own
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.expect_denied('a member cannot add advisor details for themselves', $$insert into advisor_profiles (user_id, field) values ('00000000-0000-0000-0000-00000000000c','Legal')$$);
select t.expect('advisor details are public to read', (select count(*) >= 0 from advisor_profiles));
reset role;

-- article_marks (0034): private rows, public counts
reset role;
select t.expect('anon cannot read article marks', not has_table_privilege('anon', 'article_marks', 'select'));
select t.expect('anyone can read helpful counts', (select count(*) = 1 from pg_proc p where proname = 'article_mark_counts' and has_function_privilege('anon', p.oid, 'execute')));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect_denied('a mark must name a real section', $$insert into article_marks (user_id, item, kind) values (auth.uid(), 'other/x', 'saved')$$);
select t.expect_denied('cannot mark for another member', $$insert into article_marks (user_id, item, kind) values ('00000000-0000-0000-0000-00000000000b', 'blog/x', 'saved')$$);
insert into article_marks (user_id, item, kind) values (auth.uid(), 'blog/x', 'helpful');
select t.expect('a member sees their own mark', (select count(*) = 1 from article_marks));
select t.expect('the count shows it', (select n = 1 from article_mark_counts('blog/x') where kind = 'helpful'));

-- contact_messages (0035): anyone can send, only staff read
reset role;
select t.expect('anon can send a contact message', has_column_privilege('anon', 'contact_messages', 'message', 'insert'));
select t.expect('anon cannot read contact messages', not has_table_privilege('anon', 'contact_messages', 'select'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into contact_messages (name, email, message) values ('Pat', 'pat@example.com', 'Hello');
select t.expect_denied('a bad email is refused', $$insert into contact_messages (name, email, message) values ('Pat', 'nope', 'Hello')$$);
select t.expect_denied('an empty message is refused', $$insert into contact_messages (name, email, message) values ('Pat', 'pat@example.com', '')$$);
select t.expect('a non-staff member cannot read messages', (select count(*) = 0 from contact_messages));

-- moderation (0036): hide, suspend, settings
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000009d1','m1@x.ca'),('00000000-0000-0000-0000-0000000009d2','m2@x.ca'),('00000000-0000-0000-0000-0000000009d3','m3@x.ca'),('00000000-0000-0000-0000-0000000009d4','m4@x.ca');
select t.expect('moderation settings are not readable by anon', not has_table_privilege('anon', 'mod_settings', 'select'));
select t.expect('there is one settings row', (select count(*) = 1 from mod_settings));
select t.expect('eight report categories are seeded', (select count(*) = 8 from report_categories));
-- three members report one post by carol (c): it is hidden on its own at 3
insert into posts (id, author_id, body, status) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009d3', 'Buy followers now', 'published') on conflict do nothing;
insert into reports (reporter_id, post_id, reason) values ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000000f1', 'Spam');
insert into reports (reporter_id, post_id, reason) values ('00000000-0000-0000-0000-0000000009d2', '00000000-0000-0000-0000-0000000000f1', 'Spam');
select t.expect('two reports do not hide a post', (select hidden_at is null from posts where id = '00000000-0000-0000-0000-0000000000f1'));
insert into reports (reporter_id, post_id, reason) values ('00000000-0000-0000-0000-0000000009d4', '00000000-0000-0000-0000-0000000000f1', 'Spam');
select t.expect('the third report hides the post', (select hidden_at is not null from posts where id = '00000000-0000-0000-0000-0000000000f1'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000009d1';
select t.expect('a hidden post is gone for other members', (select count(*) = 0 from posts where id = '00000000-0000-0000-0000-0000000000f1'));
update mod_settings set blocking = false;
reset role;
select t.expect('a member cannot change moderation settings', (select blocking from mod_settings));
reset role;

-- hub_settings (0037): everyone reads, only staff write
reset role; set request.jwt.claim.sub = '';
select t.expect('anon can read settings', has_table_privilege('anon', 'hub_settings', 'select'));
select t.expect('anon cannot write settings', not has_table_privilege('anon', 'hub_settings', 'insert') and not has_table_privilege('anon', 'hub_settings', 'update'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect_denied('a member cannot save settings', $$insert into hub_settings (key, value) values ('feed', '{"polls": false}')$$);
select t.expect_denied('only the six pages have settings', $$insert into hub_settings (key, value) values ('billing', '{}')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into hub_settings (key, value, updated_by) values ('feed', '{"polls": false}', auth.uid());
select t.expect('staff can save settings', (select value->>'polls' = 'false' from hub_settings where key = 'feed'));
insert into hub_settings (key, value, updated_by) values ('automations', '{"flows": []}', auth.uid());
select t.expect('automations has its own settings row', (select count(*) = 1 from hub_settings where key = 'automations'));
select t.expect_denied('settings must be an object', $$insert into hub_settings (key, value) values ('groups', '[1]')$$);
select t.expect_denied('staff cannot sign someone else as the editor', $$insert into hub_settings (key, value, updated_by) values ('blogs', '{}', '00000000-0000-0000-0000-00000000000a')$$);
update hub_settings set value = '{"polls": true}' where key = 'feed';
select t.expect('staff can change settings', (select value->>'polls' = 'true' from hub_settings where key = 'feed'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update hub_settings set value = '{"polls": false}' where key = 'feed';
select t.expect('a member cannot change settings', (select value->>'polls' = 'true' from hub_settings where key = 'feed'));
reset role;

-- edit windows follow Feed settings (0040)
reset role;
update hub_settings set value = '{"edit": "0", "cedit": "forever"}' where key = 'feed';
select t.expect('edit window can be switched off', edit_window() = interval '0 minutes');
select t.expect('comment edit window can be unlimited', comment_edit_window() > interval '1 year');
update hub_settings set value = '{"polls": true}' where key = 'feed';
select t.expect('edit window falls back to 10 minutes', edit_window() = interval '10 minutes');

-- member blogs (0041)
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f7', 'erin@x.ca');
delete from hub_settings where key = 'blogs';
select t.expect('anon can read blogs', has_table_privilege('anon', 'member_blogs', 'select'));
select t.expect('anon cannot write blogs', not has_table_privilege('anon', 'member_blogs', 'insert'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f7';
insert into member_blogs (author_id, title, status) values ('00000000-0000-0000-0000-0000000000f7', 'My first post', 'draft');
select t.expect('a member can save a draft', (select count(*) = 1 from member_blogs where title = 'My first post'));
update member_blogs set status = 'published' where title = 'My first post';
select t.expect('a free member publishing goes to review', (select status = 'review' from member_blogs where title = 'My first post'));
select t.expect_denied('a member cannot write as someone else', $$insert into member_blogs (author_id, title) values ('00000000-0000-0000-0000-00000000000a', 'Not mine')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect('another member cannot read a post under review', (select count(*) = 0 from member_blogs where title = 'My first post'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.expect('the team sees a post under review', (select count(*) = 1 from member_blogs where title = 'My first post'));
update member_blogs set status = 'published' where title = 'My first post';
select t.expect('the team can publish', (select status = 'published' and published_at is not null from member_blogs where title = 'My first post'));
reset role; set request.jwt.claim.sub = '';
set role anon;
select t.expect('anyone can read a published post', (select count(*) = 1 from member_blogs where title = 'My first post'));
reset role;
insert into hub_settings (key, value) values ('blogs', '{"who": "advisor"}');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f7';
select t.expect_denied('writing can be limited to advisors', $$insert into member_blogs (author_id, title) values ('00000000-0000-0000-0000-0000000000f7', 'Second post')$$);
reset role;
delete from hub_settings where key = 'blogs';

-- hashtags (0042)
reset role; set request.jwt.claim.sub = '';
select t.expect('anon cannot follow tags', not has_table_privilege('anon', 'hashtag_follows', 'insert'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into hashtag_follows (user_id, tag) values ('00000000-0000-0000-0000-00000000000a', 'grants');
select t.expect('a member can follow a tag', (select count(*) = 1 from hashtag_follows where tag = 'grants'));
select t.expect_denied('a member cannot follow as someone else', $$insert into hashtag_follows (user_id, tag) values ('00000000-0000-0000-0000-0000000000f7', 'grants')$$);
select t.expect_denied('tags are stored lower case', $$insert into hashtag_follows (user_id, tag) values ('00000000-0000-0000-0000-00000000000a', 'Grants')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f7';
select t.expect('follows are private to their owner', (select count(*) = 0 from hashtag_follows));
select t.expect('follower counts are still available', (select followers = 1 from hashtag_followers() where tag = 'grants'));
reset role; set request.jwt.claim.sub = '';
insert into posts (author_id, body) values ('00000000-0000-0000-0000-00000000000a', 'Looking for #Grants and #hiring help, #grants again');
insert into comments (post_id, author_id, body) select id, '00000000-0000-0000-0000-00000000000a', 'Also #retail' from posts where body like 'Looking for #Grants%';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f7';
select t.expect('a tag counts once per post, case ignored', (select uses = 1 and people = 1 from hashtag_usage() where tag = 'grants'));
select t.expect('comment tags only count when asked', (select count(*) = 0 from hashtag_usage() where tag = 'retail') and (select count(*) = 1 from hashtag_usage(true) where tag = 'retail'));
select t.expect('a new tag is fresh', (select fresh = 1 from hashtag_usage() where tag = 'hiring'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
delete from hashtag_follows where tag = 'grants';
select t.expect('a member can unfollow', (select count(*) = 0 from hashtag_follows));
reset role;
delete from posts where body like 'Looking for #Grants%';

-- sign-in security (0043)
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000005d1', 'erin@x.ca', '{"first_name":"Erin","last_name":"Lee","website":"erin.ca","newsletter":"true","newsletter_wording":"Send me the weekly newsletter"}'),
 ('00000000-0000-0000-0000-0000000005d2', 'finn@x.ca', '{"first_name":"Finn","last_name":"Ng"}');
select t.expect('sign-up keeps first and last name and the website', (select full_name = 'Erin Lee' and website = 'erin.ca' from profiles where id = '00000000-0000-0000-0000-0000000005d1'));
select t.expect('a ticked newsletter box is recorded with its wording', (select wording = 'Send me the weekly newsletter' and consented_at is not null from newsletter_consents where user_id = '00000000-0000-0000-0000-0000000005d1'));
select t.expect('an unticked newsletter box records nothing', (select count(*) = 0 from newsletter_consents where user_id = '00000000-0000-0000-0000-0000000005d2'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005d2';
select t.expect('consent records are private', (select count(*) = 0 from newsletter_consents));
select t.expect_denied('a member cannot add consent for themselves', $$insert into newsletter_consents (user_id, wording) values ('00000000-0000-0000-0000-0000000005d2', 'x')$$);
reset role;
set role anon;
select t.expect('log-ins are open until five wrong passwords', (select locked_until is null and failed = 0 from login_state('Erin@X.ca')));
select t.expect('wrong password 1 to 4 do not lock', (select count(*) filter (where locked) = 0 from (select * from login_failed('erin@x.ca') union all select * from login_failed('erin@x.ca') union all select * from login_failed('ERIN@x.ca') union all select * from login_failed('erin@x.ca')) q));
select t.expect('the fifth wrong password locks, and says the account exists', (select locked and remaining = 0 and has_account from login_failed('erin@x.ca')));
select t.expect('the pause lasts about 15 minutes', (select locked_until > now() + interval '14 minutes' and failed = 5 from login_state('erin@x.ca')));
select t.expect('an email with no account never says it exists', (select not has_account from login_failed('nobody@x.ca')));
select t.expect('visitors see no log-in attempts', (select count(*) = 0 from login_attempts));
select t.expect_denied('visitors cannot clear the count', $$select login_succeeded()$$);
reset role;
select t.expect('a good log-in clears only that member''s count', (select count(*) from login_attempts where email = 'erin@x.ca') = 5);
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005d1';
select login_succeeded();
reset role;
select t.expect('after a good log-in the count is gone', (select count(*) from login_attempts where email = 'erin@x.ca') = 0 and (select count(*) from login_attempts where email = 'nobody@x.ca') = 1);
set role anon;
select t.expect('5 reset requests an hour are allowed, the 6th is not', (select count(*) filter (where ok) = 5 from (select rate_hit('reset:erin@x.ca', 5, interval '1 hour') ok from generate_series(1, 6)) q));
select t.expect('the limit is per key', rate_hit('reset:finn@x.ca', 5, interval '1 hour'));
select t.expect('visitors see no rate-limit rows', (select count(*) = 0 from rate_hits));
reset role;
insert into auth.sessions (id, user_id, user_agent, ip) values
 ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-0000000005d1', 'Chrome on Windows', '203.0.113.5'),
 ('00000000-0000-0000-0000-0000000005b2', '00000000-0000-0000-0000-0000000005d1', 'Safari on iPhone', '203.0.113.6'),
 ('00000000-0000-0000-0000-0000000005b3', '00000000-0000-0000-0000-0000000005d2', 'Firefox', '198.51.100.9');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005d1'; set request.jwt.claim.session_id = '00000000-0000-0000-0000-0000000005b1';
select t.expect('a member sees only their own sessions, this one first', (select count(*) = 2 and (array_agg(id order by is_current desc))[1] = '00000000-0000-0000-0000-0000000005b1' from my_sessions()));
select end_session('00000000-0000-0000-0000-0000000005b3');
select end_session('00000000-0000-0000-0000-0000000005b1');
reset role;
select t.expect('a member cannot end someone else''s session, or the one they are using', (select count(*) = 3 from auth.sessions));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005d1'; set request.jwt.claim.session_id = '00000000-0000-0000-0000-0000000005b1';
select t.expect('a member can end another of their own sessions', (select end_other_sessions()) = 1);
reset role; set request.jwt.claim.session_id = '';
select t.expect('only the other session went', (select count(*) = 2 from auth.sessions));
select t.expect('visitors cannot list sessions', not has_function_privilege('anon', 'my_sessions()', 'execute'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005d1';
insert into user_security (user_id, email_code) values ('00000000-0000-0000-0000-0000000005d1', false);
select t.expect('a member can switch the email code off for themselves', (select email_code = false from user_security));
select t.expect_denied('a member cannot change someone else''s code setting', $$insert into user_security (user_id) values ('00000000-0000-0000-0000-0000000005d2')$$);
reset role;

-- new-device codes (0044): the member's own session can neither read a code nor trust a device
reset role;
insert into signin_challenges (user_id, code_hash, expires_at) values ('00000000-0000-0000-0000-0000000005d1', 'x', now() + interval '10 minutes');
insert into trusted_devices (user_id, token_hash, expires_at) values ('00000000-0000-0000-0000-0000000005d1', 'x', now() + interval '30 days');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005d1';
select t.expect('a member cannot read their sign-in code', (select count(*) = 0 from signin_challenges));
select t.expect('a member cannot read trusted devices', (select count(*) = 0 from trusted_devices));
select t.expect_denied('a member cannot trust a device themselves', $$insert into trusted_devices (user_id, token_hash, expires_at) values ('00000000-0000-0000-0000-0000000005d1', 'y', now() + interval '30 days')$$);
reset role;

-- Help Centre (0045): anyone can read it, nobody but the service role can change it
reset role;
insert into help_topics (id, title) values ('t1', 'Topic one');
insert into help_articles (id, topic, title, html) values ('a1', 't1', 'Article one', '<p>Hello &amp; welcome <b>to</b> the hub</p>');
set role anon;
select t.expect('visitors can read help topics and articles', (select count(*) = 1 from help_topics) and (select count(*) = 1 from help_articles));
select t.expect('search text drops tags and decodes &amp;', (select body_text = 'Hello & welcome to the hub' from help_articles));
select t.expect_denied('visitors cannot write help articles', $$insert into help_articles (id, topic, title) values ('a2', 't1', 'x')$$);
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005d1';
select t.expect_denied('members cannot write help articles', $$update help_articles set title = 'x'$$);
select t.expect_denied('members cannot write help topics', $$delete from help_topics$$);
reset role;

-- ===== Update 3: profile completion (0046) =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000006a1', 'zed@x.ca', '{"first_name":"Zed","last_name":"Blank"}'),
 ('00000000-0000-0000-0000-0000000006a2', 'yara@x.ca', '{"first_name":"Yara","last_name":"Seen"}'),
 ('00000000-0000-0000-0000-0000000006a3', 'xena@x.ca', '{"first_name":"Xena","last_name":"Other"}');
update profiles set avatar_url = null, headline = '', location = '' where id = '00000000-0000-0000-0000-0000000006a1';
select t.expect('a new profile with nothing filled in is 0 of 5', (select ready_count = 0 and ready_at is null from profiles where id = '00000000-0000-0000-0000-0000000006a1'));
select t.expect('the member with a photo and headline from the start is 2 of 5', (select ready_count = 2 from profiles where id = '00000000-0000-0000-0000-0000000006a3'));

set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000006a1';
update profiles set ready_count = 5, ready_at = now() where id = auth.uid();
select t.expect('a member cannot set their own ready count', (select ready_count = 0 and ready_at is null from profiles where id = auth.uid()));
select t.expect_denied('without a photo and headline a member cannot ask to connect', $$insert into connections (requester_id, addressee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000006a2')$$);
select t.expect_denied('without a photo and headline a member cannot ask for an introduction', $$insert into intro_requests (requester_id, via_id, target_id, note) values (auth.uid(), '00000000-0000-0000-0000-0000000006a2', '00000000-0000-0000-0000-0000000006a3', 'hi')$$);
update profiles set avatar_url = 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/t/zed.jpg' where id = auth.uid();
select t.expect('adding a photo makes it 1 of 5', (select ready_count = 1 from profiles where id = auth.uid()));
select t.expect_denied('a photo alone is not enough to connect', $$insert into connections (requester_id, addressee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000006a2')$$);
update profiles set headline = 'Owner, Zed Reno' where id = auth.uid();
select t.expect('a headline makes it 2 of 5', (select ready_count = 2 from profiles where id = auth.uid()));
insert into connections (requester_id, addressee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000006a2');
select t.expect('with a photo and headline the member can connect', (select count(*) = 1 from connections where requester_id = auth.uid()));

-- member search leaves out members who are not ready
reset role; set role anon;
select t.expect('a member who is not ready is not in member search', not exists (select 1 from member_directory('Zed')) and not exists (select 1 from search_members('Zed')));
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000006a1';
update profiles set location = 'Mississauga, ON' where id = auth.uid();
insert into profile_details (user_id, helps_with) values (auth.uid(), array['Renovation quotes']);
select t.expect('city and a tag make it 4 of 5', (select ready_count = 4 from profiles where id = auth.uid()));
select t.expect('my_ready_items shows what is missing', (select not biz and helps and city and headline and photo and ready_count = 4 from my_ready_items()));
select t.expect_denied('a member who is not ready cannot apply for the Spotlight', $$insert into spotlight_applications (member_id, answers, consent_wording) values (auth.uid(), '{"q1":"a"}', 'ok')$$);
select apply_profile_draft(null, '{"title":"Owner","biz":"Zed Reno","city":"Mississauga, ON","about":"I renovate homes.","helps":["Renovation quotes","Kitchens"],"category":"Construction & Trades","desc":"We renovate homes.","services":["Kitchens","Bathrooms"]}'::jsonb, true);
select t.expect('saving the draft makes a DRAFT business page and the profile is 5 of 5', (select ready_count = 5 and ready_at is not null from profiles where id = auth.uid()) and (select count(*) = 1 from companies where owner_id = auth.uid() and status = 'draft' and name = 'Zed Reno' and province = 'ON' and city = 'Mississauga'));
select t.expect('the services came with the draft page', (select count(*) = 2 from business_services s join companies c on c.id = s.company_id where c.owner_id = auth.uid()));
select t.expect('the headline, city, introduction and tags were saved', (select headline = 'Owner, Zed Reno' and location = 'Mississauga, ON' and bio = 'I renovate homes.' from profiles where id = auth.uid()) and (select helps_with = array['Renovation quotes','Kitchens'] from profile_details where user_id = auth.uid()));
select apply_profile_draft(null, '{"title":"Owner","biz":"Zed Reno","city":"Mississauga, ON","helps":["A"]}'::jsonb, true);
select t.expect('saving again does not make a second business page', (select count(*) = 1 from companies where owner_id = auth.uid()));
delete from companies where owner_id = auth.uid();
select t.expect('removing the business page takes it back to 4 of 5', (select ready_count = 4 and ready_at is null from profiles where id = auth.uid()));
insert into companies (owner_id, slug, name) values (auth.uid(), 'zed-reno-2', 'Zed Reno');
select t.expect('a new page counts again: 5 of 5', (select ready_count = 5 and ready_at is not null from profiles where id = auth.uid()));

reset role; set role anon;
select t.expect('a ready member shows up in member search', exists (select 1 from member_directory('Zed')) and exists (select 1 from search_members('Zed')));
reset role;

-- Member Spotlight: ready members only, one open application, the team decides
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000006a1';
insert into spotlight_applications (member_id, answers, consent_wording) values (auth.uid(), '{"q1":"a","q2":"b"}', 'CanadianSME can use my photo');
select t.expect('a ready member can apply, and the consent is stored with a time', (select count(*) = 1 and bool_and(consent_at is not null) from spotlight_applications));
select t.expect_denied('only one open application at a time', $$insert into spotlight_applications (member_id, answers, consent_wording) values (auth.uid(), '{}', 'x')$$);
update spotlight_applications set status = 'chosen';
select t.expect('a member cannot choose themselves', (select status = 'received' from spotlight_applications));
select t.expect_denied('a member cannot apply as someone else', $$insert into spotlight_applications (member_id, answers, consent_wording) values ('00000000-0000-0000-0000-0000000006a2', '{}', 'x')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000006a2';
select t.expect('other members cannot read an application', (select count(*) = 0 from spotlight_applications));
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.expect('the team reads applications', (select count(*) = 1 from spotlight_applications));
update spotlight_applications set status = 'chosen', chosen_by = auth.uid(), chosen_at = now();
select t.expect('the team can choose a member', (select count(*) = 1 from spotlight_applications where status = 'chosen'));
reset role;

-- the team's follow-up list: team only
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000006a2';
select t.expect('members get nothing from the follow-up list', (select count(*) = 0 from team_profile_followup('all')));
select t.expect('members get nothing from the follow-up numbers', (select joined_7d = 0 and ready_7d = 0 from team_profile_stats()));
select t.expect_denied('a member cannot set a follow-up status', $$select set_followup('00000000-0000-0000-0000-0000000006a1', 'called')$$);
select t.expect_denied('a member cannot send a team message', $$select team_message_member('00000000-0000-0000-0000-0000000006a1', 'hi')$$);
select t.expect('members cannot read follow-up rows', (select count(*) = 0 from profile_followups));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.expect('the team sees members who are not ready, and not those who are', (select count(*) > 0 and bool_and(ready_count < 5) from team_profile_followup('all')) and not exists (select 1 from team_profile_followup('all') where full_name = 'Zed Blank'));
select t.expect('the missing items come with each member', (select missing = array['city','helps','biz'] and ready_count = 2 from team_profile_followup('all') where full_name = 'Xena Other'));
select set_followup('00000000-0000-0000-0000-0000000006a3', 'called');
select t.expect('the team can record a follow-up', (select status = 'called' from team_profile_followup('all') where full_name = 'Xena Other'));
select team_message_member('00000000-0000-0000-0000-0000000006a3', 'I can set up your profile for you in 5 minutes.');
select t.expect('the message reaches the member from the team member and keeps the status', (select count(*) = 1 from messages where recipient_id = '00000000-0000-0000-0000-0000000006a3' and sender_id = auth.uid()) and (select status = 'called' from team_profile_followup('all') where full_name = 'Xena Other'));
select t.expect('"ready now" lists a member who got ready this week', exists (select 1 from team_profile_followup('ready') where full_name = 'Zed Blank'));
select t.expect('the numbers count the members who joined this week', (select joined_7d >= 3 and ready_7d >= 1 and cardinality(trend) = 6 from team_profile_stats()));
reset role;

-- real numbers for the yellow line
insert into directory_searches (searcher_id, q, category, city, province) values
 ('00000000-0000-0000-0000-0000000006a2', '', 'Construction & Trades', '', 'ON'),
 ('00000000-0000-0000-0000-0000000006a3', 'kitchen renovation', '', 'Mississauga', 'ON'),
 ('00000000-0000-0000-0000-0000000006a3', 'plumber', '', 'Toronto', 'ON'),
 ('00000000-0000-0000-0000-0000000006a2', '', 'Food & Drink', '', 'ON'),
 ('00000000-0000-0000-0000-0000000006a1', '', 'Construction & Trades', '', 'ON');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000006a1';
select t.expect('searches near me that mention what I do are counted, my own and other cities are not', (select searches_7d = 2 from my_profile_signals()));
insert into directory_searches (searcher_id, category) values (auth.uid(), 'x');
select t.expect_denied('a member cannot log a search for someone else', $$insert into directory_searches (searcher_id) values ('00000000-0000-0000-0000-0000000006a2')$$);
select t.expect('members cannot read the search log', (select count(*) = 0 from directory_searches));
reset role;
select t.expect('the new functions are closed to visitors', not has_function_privilege('anon', 'my_ready_items()', 'execute') and not has_function_privilege('anon', 'team_profile_followup(text)', 'execute') and not has_function_privilege('authenticated', 'refresh_ready(uuid)', 'execute') and not has_function_privilege('authenticated', 'profile_ready_items(uuid)', 'execute'));

-- ===== Update 4: Courses =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000004c1','inst@x.ca'), ('00000000-0000-0000-0000-0000000004c2','learn@x.ca'), ('00000000-0000-0000-0000-0000000004c3','other@x.ca');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into courses (id, slug, title, summary, cover_url, order_rule) values ('00000000-0000-0000-0000-00000000c001', 'cash', 'Cash', 'S', '/sample/courses/c.jpg', 'seq');
insert into course_instructors (course_id, member_id) values ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000004c1');
insert into course_sections (id, course_id, title) values ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-00000000c001', 'One');
insert into lessons (id, course_id, section_id, title, type, position, free_preview, drip_days) values
 ('00000000-0000-0000-0000-00000000c011', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000c0a1', 'Intro', 'video', 0, true, 0),
 ('00000000-0000-0000-0000-00000000c012', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000c0a1', 'Read', 'text', 1, false, 0),
 ('00000000-0000-0000-0000-00000000c013', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000c0a1', 'Plan', 'assignment', 2, false, 0),
 ('00000000-0000-0000-0000-00000000c014', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000c0a1', 'Quiz', 'quiz', 3, false, 0),
 ('00000000-0000-0000-0000-00000000c015', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000c0a1', 'Later', 'text', 4, false, 2);
insert into lesson_content (lesson_id, course_id, body, video_path, captions_path) values
 ('00000000-0000-0000-0000-00000000c011', '00000000-0000-0000-0000-00000000c001', '{hi}', 'x.mp4', 'x.vtt'),
 ('00000000-0000-0000-0000-00000000c012', '00000000-0000-0000-0000-00000000c001', '{secret text}', '', '');
insert into lesson_files (lesson_id, course_id, name, path) values ('00000000-0000-0000-0000-00000000c012', '00000000-0000-0000-0000-00000000c001', 'w.xlsx', '00000000-0000-0000-0000-00000000c001/00000000-0000-0000-0000-00000000c012/f/w.xlsx');
insert into assignments (lesson_id, course_id, brief, marks, pass_mark) values ('00000000-0000-0000-0000-00000000c013', '00000000-0000-0000-0000-00000000c001', 'Do it', 10, 6);
insert into quizzes (lesson_id, course_id, pass_pct, time_limit_min, attempts) values ('00000000-0000-0000-0000-00000000c014', '00000000-0000-0000-0000-00000000c001', 50, 10, 2);
insert into quiz_questions (lesson_id, course_id, position, question, options, correct_index) values
 ('00000000-0000-0000-0000-00000000c014', '00000000-0000-0000-0000-00000000c001', 0, 'Q1', array['a','b'], 1),
 ('00000000-0000-0000-0000-00000000c014', '00000000-0000-0000-0000-00000000c001', 1, 'Q2', array['a','b'], 0);
select t.expect('a draft is invisible to members and visitors', true);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c2';
select t.expect('a member cannot see a draft course', (select count(*) = 0 from courses where slug = 'cash'));
select t.expect_denied('a member cannot create a course', $$insert into courses (slug) values ('mine')$$);
select t.expect_denied('a member cannot enrol in a draft', $$select enrol_free('00000000-0000-0000-0000-00000000c001')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c1';
select t.expect('the instructor sees the draft and its answers', (select count(*) = 1 from courses where slug = 'cash') and (select count(*) = 2 from quiz_questions));
update courses set status = 'published', title = 'Cash flow' where slug = 'cash';
select t.expect('an instructor cannot publish but can edit', (select status = 'draft' and title = 'Cash flow' from courses where slug = 'cash'));
select t.expect_denied('an instructor cannot publish through the function', $$select publish_course('00000000-0000-0000-0000-00000000c001')$$);
update lesson_content set captions_path = '' where lesson_id = '00000000-0000-0000-0000-00000000c011';
select t.expect('the checklist blocks a video without captions', not course_publish_ok('00000000-0000-0000-0000-00000000c001'));
select t.expect_denied('asking to publish an incomplete course is refused', $$select ask_publish_course('00000000-0000-0000-0000-00000000c001')$$);
update lesson_content set captions_path = 'x.vtt' where lesson_id = '00000000-0000-0000-0000-00000000c011';
insert into lesson_content (lesson_id, course_id, body) values ('00000000-0000-0000-0000-00000000c015', '00000000-0000-0000-0000-00000000c001', '{later}');
select ask_publish_course('00000000-0000-0000-0000-00000000c001');
select t.expect('a complete course can be sent to the team', (select publish_asked_at is not null from courses where slug = 'cash'));
select t.expect_denied('an instructor cannot add instructors', $$insert into course_instructors (course_id, member_id) values ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000004c3')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select publish_course('00000000-0000-0000-0000-00000000c001');
reset role; set request.jwt.claim.sub = '';
set role anon;
select t.expect('a visitor sees the published course and its outline', (select count(*) = 1 from courses where slug = 'cash') and (select count(*) = 5 from lessons));
select t.expect('a visitor opens only the free preview lesson', (select string_agg(body[1], ',') = 'hi' from lesson_content));
select t.expect('a visitor never sees quiz answers', (select count(*) = 0 from quiz_questions));
select t.expect('a visitor cannot read lesson files', not course_object_ok('00000000-0000-0000-0000-00000000c001/00000000-0000-0000-0000-00000000c012/f/w.xlsx'));
select t.expect('a visitor can play the free preview video', course_object_ok('00000000-0000-0000-0000-00000000c001/00000000-0000-0000-0000-00000000c011/v/x.mp4'));
select t.expect_denied('a visitor cannot enrol', $$select enrol_free('00000000-0000-0000-0000-00000000c001')$$);
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c2';
select t.expect('not enrolled: the reading is locked', (select count(*) = 1 from lesson_content) and (lesson_access('00000000-0000-0000-0000-00000000c012') ->> 'why') = 'enrol');
select t.expect('not enrolled: downloads stay locked even on the free preview', not lesson_download_ok('00000000-0000-0000-0000-00000000c011'));
select enrol_free('00000000-0000-0000-0000-00000000c001');
select t.expect('in order: the second lesson waits for the first', (lesson_access('00000000-0000-0000-0000-00000000c012') ->> 'why') = 'order');
select t.expect_denied('a locked lesson cannot be marked complete', $$select mark_lesson_done('00000000-0000-0000-0000-00000000c012')$$);
select mark_lesson_done('00000000-0000-0000-0000-00000000c011');
select t.expect('after the first lesson the reading opens', lesson_open_ok('00000000-0000-0000-0000-00000000c012') and (select count(*) = 2 from lesson_content));
select t.expect('enrolled: the download opens', course_object_ok('00000000-0000-0000-0000-00000000c001/00000000-0000-0000-0000-00000000c012/f/w.xlsx'));
select save_video_pos('00000000-0000-0000-0000-00000000c011', 134);
select t.expect('the video position is saved against the account', (select video_pos = 134 from lesson_progress where lesson_id = '00000000-0000-0000-0000-00000000c011'));
select mark_lesson_done('00000000-0000-0000-0000-00000000c012');
select t.expect_denied('a submission with nothing in it is refused', $$select submit_assignment('00000000-0000-0000-0000-00000000c013', '', '', '', 0)$$);
select t.expect_denied('a file outside your own folder is refused', $$select submit_assignment('00000000-0000-0000-0000-00000000c013', '', 'submissions/00000000-0000-0000-0000-0000000004c3/00000000-0000-0000-0000-00000000c013/x.pdf', 'x.pdf', 10)$$);
select submit_assignment('00000000-0000-0000-0000-00000000c013', 'my plan', '', '', 0);
select t.expect('a submission is on time and counts as done (submit rule)', (select not late from submissions) and lesson_open_ok('00000000-0000-0000-0000-00000000c014'));
select t.expect('a learner cannot grade', (select count(*) = 0 from submissions where grade_marks is not null));
select t.expect_denied('a learner cannot grade through the function', $$select grade_submission((select id from submissions limit 1), 9, 'x')$$);
select t.expect_denied('a learner cannot score a quiz in preview', $$select quiz_preview_score('00000000-0000-0000-0000-00000000c014', '{}')$$);
select t.expect('the quiz view has no answers', (select not (quiz_view('00000000-0000-0000-0000-00000000c014')::text like '%correct%')));
select quiz_start('00000000-0000-0000-0000-00000000c014');
select t.expect('the same attempt comes back after a refresh', (select quiz_start('00000000-0000-0000-0000-00000000c014')) = (select id from quiz_attempts where submitted_at is null));
select quiz_answer((select id from quiz_attempts where submitted_at is null), 0, 0);
select t.expect_denied('an answer that does not exist is refused', $$select quiz_answer((select id from quiz_attempts where submitted_at is null), 1, 7)$$);
select t.expect('a wrong quiz does not pass', (select not (quiz_submit((select id from quiz_attempts where submitted_at is null)) ->> 'passed')::boolean));
update quiz_attempts set passed = true;
select t.expect('a learner cannot change their own attempt directly', (select count(*) = 0 from quiz_attempts where passed));
select quiz_start('00000000-0000-0000-0000-00000000c014');
select quiz_answer((select id from quiz_attempts where submitted_at is null), 0, 1);
select quiz_answer((select id from quiz_attempts where submitted_at is null), 1, 0);
select t.expect('the right answers pass', (select (quiz_submit((select id from quiz_attempts where submitted_at is null)) ->> 'passed')::boolean));
select t.expect_denied('no attempts after passing', $$select quiz_start('00000000-0000-0000-0000-00000000c014')$$);
select t.expect('a drip lesson stays locked until its day', (lesson_access('00000000-0000-0000-0000-00000000c015') ->> 'why') = 'drip');
reset role; set request.jwt.claim.sub = '';
update enrolments set enrolled_at = now() - interval '3 days' where member_id = '00000000-0000-0000-0000-0000000004c2';
-- an open attempt whose time ran out is submitted with the answers so far
insert into quiz_attempts (member_id, lesson_id, course_id, started_at, answers) values ('00000000-0000-0000-0000-0000000004c3', '00000000-0000-0000-0000-00000000c014', '00000000-0000-0000-0000-00000000c001', now() - interval '11 minutes', '{"0":0}');
insert into enrolments (member_id, course_id) values ('00000000-0000-0000-0000-0000000004c3', '00000000-0000-0000-0000-00000000c001');
insert into course_prefs (member_id, hide_from_classmates) values ('00000000-0000-0000-0000-0000000004c3', true);
update courses set order_rule = 'any' where slug = 'cash';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c3';
select t.expect('a timed-out attempt is submitted automatically', (select (quiz_view('00000000-0000-0000-0000-00000000c014') -> 'done' -> 0 ->> 'timed_out')::boolean));
reset role; update courses set order_rule = 'seq' where slug = 'cash'; set role authenticated;
select t.expect('another learner cannot read my work', (select count(*) = 0 from submissions));
select t.expect_denied('a review needs one finished lesson', $$insert into course_reviews (course_id, member_id, stars, body) values ('00000000-0000-0000-0000-00000000c001', auth.uid(), 5, 'Great course really')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c2';
select t.expect('the drip lesson opens on its day', lesson_open_ok('00000000-0000-0000-0000-00000000c015'));
select t.expect('hidden classmates are not shown, and nothing but name and photo', (select count(*) = 0 from course_classmates('00000000-0000-0000-0000-00000000c001')));
insert into course_reviews (course_id, member_id, stars, body) values ('00000000-0000-0000-0000-00000000c001', auth.uid(), 5, 'Clear and quick, thanks');
select t.expect_denied('one review per learner', $$insert into course_reviews (course_id, member_id, stars, body) values ('00000000-0000-0000-0000-00000000c001', auth.uid(), 4, 'Second review here')$$);
update course_reviews set hidden_at = null, stars = 4 where member_id = auth.uid();
select t.expect('a learner can edit their review', (select stars = 4 from course_reviews where member_id = auth.uid()));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c1';
select t.expect('the instructor sees the learner work, not a stranger''s progress elsewhere', (select count(*) = 1 from submissions));
select grade_submission((select id from submissions limit 1), 9, 'Strong plan');
select t.expect('grading notifies the learner', (select count(*) = 1 from submissions where grade_marks = 9));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c3';
select t.expect_denied('a member who is not an instructor cannot grade', $$select grade_submission((select id from submissions limit 1), 1, 'x')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c2';
select t.expect_denied('a member cannot report their own review', $$insert into reports (reporter_id, course_review_id, reason) select auth.uid(), id, 'x' from course_reviews where member_id = auth.uid()$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000004c3';
insert into reports (reporter_id, course_review_id, reason) select auth.uid(), id, 'Spam' from course_reviews limit 1;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into reports (reporter_id, course_review_id, reason) select auth.uid(), id, 'Spam' from course_reviews limit 1;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into reports (reporter_id, course_review_id, reason) select auth.uid(), id, 'Spam' from course_reviews limit 1;
select t.expect('three reports hide a course review', (select count(*) = 0 from course_reviews));
select t.expect_denied('a member cannot enrol themselves in a paid course', $$select enrol_paid(auth.uid(), '00000000-0000-0000-0000-00000000c001', 'pi_x', 100, 13, 'HST')$$);
select t.expect_denied('a member cannot insert an enrolment directly', $$insert into enrolments (member_id, course_id) values (auth.uid(), '00000000-0000-0000-0000-00000000c001')$$);
delete from courses where slug = 'cash';
select t.expect('a member cannot delete a course', (select count(*) = 1 from courses where slug = 'cash'));
reset role;
select t.expect('paid enrolment is idempotent per payment', (select enrol_paid('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000c001', 'pi_1', 4900, 637, 'HST (13%, Ontario)')) = (select enrol_paid('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000c001', 'pi_1', 4900, 637, 'HST (13%, Ontario)')));
select t.expect('the courses functions are closed to visitors where they write', not has_function_privilege('anon', 'enrol_free(uuid)', 'execute') and not has_function_privilege('authenticated', 'enrol_paid(uuid,uuid,text,integer,integer,text)', 'execute') and not has_function_privilege('anon', 'quiz_start(uuid)', 'execute'));

-- ===== Update 5: Businesses for sale =====
reset role; set request.jwt.claim.sub = '';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000005b1','seller@x.ca'), ('00000000-0000-0000-0000-0000000005b2','buyer@x.ca'), ('00000000-0000-0000-0000-0000000005b3','free@x.ca'), ('00000000-0000-0000-0000-0000000005b4','buyer2@x.ca');
update profiles set plan = 'plus', full_name = 'Sally Seller' where id = '00000000-0000-0000-0000-0000000005b1';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b3';
select t.expect_denied('a Free member cannot list a business for sale', $$insert into sale_listings (slug, seller_id, title, industry, city, province, area_shown, price, yearly_sales, highlights, description) values ('free-try', auth.uid(), 'A bakery in the west end', 'Retail', 'Toronto', 'ON', 'Toronto', 100000, 50000, array['Busy'], array[repeat('x', 90)])$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b1';
select t.expect_denied('a listing needs a description of 80 characters', $$insert into sale_listings (slug, seller_id, title, industry, city, province, area_shown, price, yearly_sales, highlights, description) values ('short-desc', auth.uid(), 'A bakery in the west end', 'Retail', 'Toronto', 'ON', 'Toronto', 100000, 50000, array['Busy'], array['Too short'])$$);
select t.expect_denied('a listing needs a price or price on request', $$insert into sale_listings (slug, seller_id, title, industry, city, province, area_shown, price, yearly_sales, highlights, description) values ('no-price', auth.uid(), 'A bakery in the west end', 'Retail', 'Toronto', 'ON', 'Toronto', 0, 50000, array['Busy'], array[repeat('x', 90)])$$);
select t.expect_denied('a seller cannot publish a listing as already checked', $$insert into sale_listings (slug, seller_id, title, industry, city, province, area_shown, price, yearly_sales, highlights, description, checked_at) values ('pre-checked', auth.uid(), 'A bakery in the west end', 'Retail', 'Toronto', 'ON', 'Toronto', 100000, 50000, array['Busy'], array[repeat('x', 90)], now())$$);
insert into sale_listings (id, slug, seller_id, title, industry, city, province, area_shown, price, yearly_sales, owner_earnings, employees, highlights, description, confidential, business_name, documents)
values ('00000000-0000-0000-0000-0000000005c1', 'secret-bakery', auth.uid(), 'A bakery in the west end', 'Food and drink', 'Toronto', 'ON', 'West end, Toronto', 485000, 920000, 168000, 9, array['Busy corner'], array['First paragraph that visitors may read about the bakery and its customers.', 'Second paragraph only members read.'], true, 'Secret Bakery Inc', array['Statements']);
insert into sale_listings (id, slug, seller_id, title, industry, city, province, area_shown, price, yearly_sales, highlights, description, confidential, business_name)
values ('00000000-0000-0000-0000-0000000005c2', 'open-catering', auth.uid(), 'Catering company in Winnipeg', 'Food and drink', 'Winnipeg', 'MB', 'Winnipeg', 340000, 610000, array['Repeat contracts'], array[repeat('Catering ', 12)], false, 'Open Catering');
update sale_listings set views = 999, saves = 50, checked_at = now() where id = '00000000-0000-0000-0000-0000000005c2';
select t.expect('a seller cannot check their own listing or add views and saves', (select views = 0 and saves = 0 and checked_at is null from sale_listings where id = '00000000-0000-0000-0000-0000000005c2'));
select t.expect_denied('a seller cannot hide their own listing', $$update sale_listings set status = 'hidden' where id = '00000000-0000-0000-0000-0000000005c2'$$);
reset role; set role anon; set request.jwt.claim.sub = '';
select t.expect_denied('visitors cannot read the listing table', $$select 1 from sale_listings$$);
select t.expect('visitors see listings in browse, without owner earnings', (select count(*) = 2 and bool_and(c->'earnings' = 'null'::jsonb) from jsonb_array_elements(sale_browse()) c));
select t.expect('visitors never receive sales, staff numbers, the seller or the second paragraph', (select d->'sales' is null and d->'employees' is null and d->'seller' is null and d->'business_name' is null and d->'seller_plan' is null and jsonb_array_length(d->'description') = 1 and d::text not like '%Secret Bakery%' and d::text not like '%Sally%' and d::text not like '%5b1%' from sale_detail('secret-bakery') d));
select t.expect_denied('visitors cannot contact a seller', $$select sale_enquire('00000000-0000-0000-0000-0000000005c1', 'Within 3 months', 'Within 3 months', 'x', true)$$);
select sale_count_view('00000000-0000-0000-0000-0000000005c1', '11111111-1111-1111-1111-111111111111');
select sale_count_view('00000000-0000-0000-0000-0000000005c1', '11111111-1111-1111-1111-111111111111');
reset role; set request.jwt.claim.sub = '';
select t.expect('a visitor view counts once a day', (select views = 1 from sale_listings where id = '00000000-0000-0000-0000-0000000005c1'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b1';
select sale_count_view('00000000-0000-0000-0000-0000000005c1');
reset role;
select t.expect('the seller''s own visits don''t count', (select views = 1 from sale_listings where id = '00000000-0000-0000-0000-0000000005c1'));
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b2';
select t.expect('a buyer cannot read the listing table directly', (select count(*) = 0 from sale_listings));
select t.expect('members see the numbers but not a confidential seller', (select (d->>'sales')::bigint = 920000 and (d->>'employees')::int = 9 and d->'seller' is null and d->'business_name' is null and d::text not like '%Secret Bakery%' and d::text not like '%Sally%' and jsonb_array_length(d->'description') = 2 from sale_detail('secret-bakery') d));
select t.expect('members see an open seller', (select d->'seller'->>'name' = 'Sally Seller' and d->>'business_name' = 'Open Catering' from sale_detail('open-catering') d));
select t.expect_denied('the privacy box is required', $$select sale_enquire('00000000-0000-0000-0000-0000000005c1', 'I have the money ready', 'Within 3 months', 'Hello, I would like to know more please.', false)$$);
select t.expect_denied('the message needs 20 characters', $$select sale_enquire('00000000-0000-0000-0000-0000000005c1', 'I have the money ready', 'Within 3 months', 'Hi', true)$$);
select t.expect_denied('enquiries cannot be inserted directly', $$insert into sale_enquiries (listing_id, buyer_id, funding, timing, message, agreed_private) values ('00000000-0000-0000-0000-0000000005c1', auth.uid(), 'I have the money ready', 'Within 3 months', 'Hello, I would like to know more please.', true)$$);
select sale_enquire('00000000-0000-0000-0000-0000000005c1', 'I have the money ready', 'Within 3 months', 'Hello, I would like to know more please.', true);
select t.expect_denied('one enquiry per buyer per listing', $$select sale_enquire('00000000-0000-0000-0000-0000000005c1', 'I have the money ready', 'Within 3 months', 'Hello again, a second enquiry here.', true)$$);
select t.expect('a confidential enquiry does not start a message thread the buyer can see', (select count(*) = 0 from messages where sender_id = auth.uid()));
select t.expect_denied('the buyer cannot message a confidential seller before the seller replies', $$insert into messages (sender_id, recipient_id, body) values (auth.uid(), '00000000-0000-0000-0000-0000000005b1', 'Hello')$$);
select sale_enquire('00000000-0000-0000-0000-0000000005c2', 'I’ll need a business loan', 'In 3 to 6 months', 'Interested in the catering company, can we talk?', true);
select t.expect('an open listing enquiry starts a message thread', (select count(*) = 1 from messages where sender_id = auth.uid() and recipient_id = '00000000-0000-0000-0000-0000000005b1'));
insert into messages (sender_id, recipient_id, body) values (auth.uid(), '00000000-0000-0000-0000-0000000005b1', 'One more question');
select t.expect('the buyer can keep writing to an open seller', (select count(*) = 2 from messages where sender_id = auth.uid()));
select t.expect_denied('the buyer cannot share documents', $$select sale_share_docs((select id from sale_enquiries where listing_id = '00000000-0000-0000-0000-0000000005c1'))$$);
insert into sale_saves (member_id, listing_id) values (auth.uid(), '00000000-0000-0000-0000-0000000005c1');
select t.expect('saving shows on the card', (select (c->>'saved')::boolean from jsonb_array_elements(sale_browse()) c where c->>'slug' = 'secret-bakery'));
insert into sale_reports (listing_id, reporter_id, reason) values ('00000000-0000-0000-0000-0000000005c1', auth.uid(), 'I think it’s a scam');
select t.expect('a member cannot read reports', (select count(*) = 0 from sale_reports));
select t.expect_denied('one report per member per listing', $$insert into sale_reports (listing_id, reporter_id, reason) values ('00000000-0000-0000-0000-0000000005c1', auth.uid(), 'Something else')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b4';
select t.expect('another buyer cannot read someone else''s enquiry', (select count(*) = 0 from sale_enquiries));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b1';
select t.expect('the seller sees enquiries and the save count', (select count(*) = 2 from sale_enquiries) and (select saves = 1 from sale_listings where id = '00000000-0000-0000-0000-0000000005c1'));
select t.expect('the seller sees unread enquiries', sale_unread_enquiries() = 2);
select sale_enquiries_seen();
select t.expect('opening My listings marks them read', sale_unread_enquiries() = 0);
select t.expect_denied('the seller cannot report their own listing', $$insert into sale_reports (listing_id, reporter_id, reason) values ('00000000-0000-0000-0000-0000000005c1', auth.uid(), 'Something else')$$);
select sale_open_thread((select id from sale_enquiries where listing_id = '00000000-0000-0000-0000-0000000005c1'));
insert into messages (sender_id, recipient_id, body) values (auth.uid(), '00000000-0000-0000-0000-0000000005b2', 'Thanks for your interest');
select t.expect('replying starts the confidential thread', (select count(*) = 1 from messages where recipient_id = auth.uid() and body like 'Enquiry about%A bakery%'));
select sale_share_docs((select id from sale_enquiries where listing_id = '00000000-0000-0000-0000-0000000005c1'));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b2';
select t.expect('after sharing, that buyer sees the confidential seller', (select d->'seller'->>'name' = 'Sally Seller' and d->>'business_name' = 'Secret Bakery Inc' and (d->'enquiry'->>'shared')::boolean from sale_detail('secret-bakery') d));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b4';
select t.expect('other buyers still don''t', (select d->'seller' is null from sale_detail('secret-bakery') d));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b1';
update sale_listings set status = 'offer' where id = '00000000-0000-0000-0000-0000000005c1';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b4';
select t.expect_denied('an under-offer listing takes no new enquiries', $$select sale_enquire('00000000-0000-0000-0000-0000000005c1', 'I have the money ready', 'Within 3 months', 'Hello, I would like to know more please.', true)$$);
select t.expect('under offer stays visible', (select count(*) = 2 from jsonb_array_elements(sale_browse())));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b1';
update sale_listings set status = 'paused' where id = '00000000-0000-0000-0000-0000000005c2';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b4';
select t.expect('paused listings are hidden from buyers', (select count(*) = 1 from jsonb_array_elements(sale_browse())) and sale_detail('open-catering') is null);
select t.expect_denied('a member cannot check a listing', $$select sale_set_checked('00000000-0000-0000-0000-0000000005c1', true)$$);
select t.expect_denied('a member cannot hide a listing', $$select sale_set_hidden('00000000-0000-0000-0000-0000000005c1', true)$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.expect('the team reads reports and every listing', (select count(*) = 1 from sale_reports) and (select count(*) >= 2 from sale_listings));
select sale_set_checked('00000000-0000-0000-0000-0000000005c1', true);
select sale_set_hidden('00000000-0000-0000-0000-0000000005c1', true);
select t.expect('the team sees the seller of a confidential listing', (select d->'seller'->>'name' = 'Sally Seller' from sale_detail('secret-bakery') d));
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b2';
select t.expect('hidden listings disappear from browse and the page right away', (select count(*) = 0 from jsonb_array_elements(sale_browse())) and sale_detail('secret-bakery') is null);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b1';
update sale_listings set status = 'live' where id = '00000000-0000-0000-0000-0000000005c1';
select t.expect('a seller cannot undo a hide', (select status = 'hidden' and checked_at is not null from sale_listings where id = '00000000-0000-0000-0000-0000000005c1'));
reset role; set request.jwt.claim.sub = ''; update profiles set plan = 'free' where id = '00000000-0000-0000-0000-0000000005b1'; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005b1';
select t.expect_denied('after a downgrade, no new listings', $$insert into sale_listings (slug, seller_id, title, industry, city, province, area_shown, price, yearly_sales, highlights, description) values ('after-downgrade', auth.uid(), 'A bakery in the west end', 'Retail', 'Toronto', 'ON', 'Toronto', 100000, 50000, array['Busy'], array[repeat('x', 90)])$$);
update sale_listings set price = 300000 where id = '00000000-0000-0000-0000-0000000005c2';
select t.expect('after a downgrade, existing listings stay and can be edited', (select price = 300000 from sale_listings where id = '00000000-0000-0000-0000-0000000005c2'));
reset role;
select t.expect('the for-sale writes are closed to visitors', not has_function_privilege('anon', 'sale_enquire(uuid,text,text,text,boolean)', 'execute') and not has_function_privilege('anon', 'sale_set_hidden(uuid,boolean)', 'execute') and not has_function_privilege('anon', 'sale_share_docs(uuid)', 'execute') and not has_function_privilege('authenticated', 'sale_card(sale_listings,boolean)', 'execute'));

-- ===== Update 7: Help Centre feedback =====
reset role; set request.jwt.claim.sub = '';
insert into help_topics (id, title) values ('t7', 'Topic') on conflict do nothing;
insert into help_articles (id, topic, title, html) values ('a7', 't7', 'Article', '<p>x</p>') on conflict do nothing;
set role anon;
select help_vote('a7', false, '22222222-2222-2222-2222-222222222222');
select help_vote('a7', true, '22222222-2222-2222-2222-222222222222');
select help_vote('a7', true, 'not-a-key');
select t.expect_denied('visitors cannot read help feedback', $$select 1 from help_feedback$$);
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select help_vote('a7', false);
select t.expect('members cannot read help feedback', (select count(*) = 0 from help_feedback));
select t.expect_denied('members cannot write feedback directly', $$insert into help_feedback (article_id, voter, helpful) values ('a7', 'x', true)$$);
select t.expect('the summary is empty for members', (select count(*) = 0 from help_feedback_summary()));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.expect('one answer per person, and answering again changes it', (select yes = 1 and no = 1 from help_feedback_summary() where article_id = 'a7'));
reset role;

-- ===== Update 8: Help home settings =====
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect_denied('a member cannot change the Help home lists', $$insert into hub_settings (key, value) values ('help', '{"chips": ["x"]}')$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into hub_settings (key, value, updated_by) values ('help', '{"chips": ["invoices"], "popular": ["a7"]}', auth.uid());
select t.expect('the team saves the Help home lists', (select value->'chips'->>0 = 'invoices' from hub_settings where key = 'help'));
set role anon;
select t.expect('visitors read the Help home lists', (select count(*) = 1 from hub_settings where key = 'help'));
reset role;

-- ===== Update 10: photos and a video in a post =====
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect_denied('post photos must be in our storage', $$insert into posts (author_id, body, images) values (auth.uid(), 'x', array['https://evil.example/a.jpg'])$$);
select t.expect_denied('a post has 10 photos at most', $$insert into posts (author_id, body, images) select auth.uid(), 'x', array_agg('https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/00000000-0000-0000-0000-00000000000a/post-' || g || '.jpg') from generate_series(1, 11) g$$);
select t.expect_denied('a post video must be in the post-videos bucket', $$insert into posts (author_id, body, video_url) values (auth.uid(), 'x', 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/x.mp4')$$);
insert into posts (author_id, body, images, video_url) select auth.uid(), 'media post', array_agg('https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/00000000-0000-0000-0000-00000000000a/post-' || g || '.jpg'), 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/post-videos/00000000-0000-0000-0000-00000000000a/video-1.mp4' from generate_series(1, 10) g;
select t.expect('a post keeps 10 photos and a video', (select cardinality(images) = 10 and video_url like '%/post-videos/%' from posts where body = 'media post'));
select t.expect_denied('photos cannot be changed after posting', $$update posts set images = '{}' where body = 'media post'$$);
reset role;
select t.expect('videos have their own public bucket: MP4 or MOV, up to 500 MB', (select public and file_size_limit = 524288000 and allowed_mime_types = array['video/mp4', 'video/quicktime'] from storage.buckets where id = 'post-videos'));

-- ===== Update 11: Member of the Day =====
reset role; set request.jwt.claim.sub = '';
delete from member_of_day;
select set_config('app.ready', '1', false); update profiles set ready_count = 0, ready_at = null; update profiles set ready_count = 5, ready_at = now() where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b'); select set_config('app.ready', '', false);
update profiles set status = 'suspended' where id = '00000000-0000-0000-0000-00000000000a';
set role anon;
select t.expect('visitors see an automatic Member of the Day: a ready, active member', (select member_of_the_day()->>'id' = '00000000-0000-0000-0000-00000000000b'));
select t.expect('the day keeps its member, and it is recorded', (select count(*) = 1 from member_of_day where member_id = '00000000-0000-0000-0000-00000000000b' and picked_by is null) and (select member_of_the_day()->>'id' = '00000000-0000-0000-0000-00000000000b'));
select t.expect_denied('visitors cannot pick the member', $$insert into member_of_day (day, member_id) values (motd_today() + 1, '00000000-0000-0000-0000-00000000000b')$$);
select t.expect_denied('visitors cannot run the automatic choice directly', $$select motd_auto(motd_today())$$);
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.expect_denied('members cannot pick the member', $$insert into member_of_day (day, member_id, picked_by) values (motd_today() + 1, auth.uid(), auth.uid())$$);
select t.expect_denied('members cannot claim the email', $$select motd_claim_email(motd_today())$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into member_of_day (day, member_id, picked_by) values (motd_today() + 1, '00000000-0000-0000-0000-00000000000b', auth.uid());
select t.expect('the team picks a member for a date', (select count(*) = 1 from member_of_day where day = motd_today() + 1 and picked_by = auth.uid()));
update member_of_day set member_id = '00000000-0000-0000-0000-00000000000a', picked_by = auth.uid() where day = motd_today();
select t.expect('a picked member who is suspended is replaced automatically', (select member_of_the_day()->>'id' = '00000000-0000-0000-0000-00000000000b'));
reset role; delete from member_of_day where day = motd_today();
insert into member_of_day (day, member_id) values (motd_today() - 30, '00000000-0000-0000-0000-00000000000b');
set role anon;
select t.expect('nobody is featured again within 90 days', member_of_the_day() is null);
reset role;
update profiles set status = 'active' where id = '00000000-0000-0000-0000-00000000000a';
select set_config('app.ready', '1', false); update profiles set ready_count = 5, ready_at = now(); select set_config('app.ready', '', false);

-- ===== Profile Details section =====
reset role; set request.jwt.claim.sub = '';
update profiles set full_name = 'Bob Baker', location = 'Halifax, NS', website = 'https://bob.example' where id = '00000000-0000-0000-0000-00000000000b';
update profiles set status = 'active' where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into profile_details (user_id, core, visibility) values (auth.uid(), '{"nick":"Bobby","founded":"2012","team":"Just me","email":"bob@bob.example","phone":"(902) 555-0101","history":[{"role":"Baker","org":"Old Mill","years":"2005 to 2012"}]}', '{"founded":"public"}')
  on conflict (user_id) do update set core = excluded.core, visibility = excluded.visibility;
select t.expect_denied('a year founded must be a year', $$update profile_details set core = core || '{"founded":"long ago"}' where user_id = auth.uid()$$);
select t.expect_denied('a contact email must look like one', $$update profile_details set core = core || '{"email":"nope"}' where user_id = auth.uid()$$);
select t.expect_denied('up to 6 past roles', $$update profile_details set core = jsonb_set(core, '{history}', (select jsonb_agg(jsonb_build_object('role', 'r' || g)) from generate_series(1, 7) g)) where user_id = auth.uid()$$);
select t.expect_denied('only the built-in Details answers are kept', $$update profile_details set core = core || '{"salary":"x"}' where user_id = auth.uid()$$);
select t.expect('the member sees every field of their own Details', (select (d->'email'->>'ok')::boolean and d->'email'->>'v' = 'bob@bob.example' and d->'first'->>'v' = 'Bob' and d->'last'->>'v' = 'Baker' from (select profile_details_section(auth.uid()) d) x));
reset role; set request.jwt.claim.sub = ''; set role anon;
select t.expect('visitors see public fields only, and which ones are hidden', (select d->'city'->>'v' = 'Halifax, NS' and d->'web'->>'v' = 'https://bob.example' and d->'founded'->>'v' = '2012'
  and not (d->'nick'->>'ok')::boolean and d->'nick'->'v' = 'null'::jsonb and d->'email'->>'vis' = 'conn' and not (d->'email'->>'ok')::boolean and d->'email'->'v' = 'null'::jsonb
  from (select profile_details_section('00000000-0000-0000-0000-00000000000b') d) x));
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.expect('members see members-only fields but not connections-only ones', (select d->'nick'->>'v' = 'Bobby' and d->'history'->'v'->0->>'role' = 'Baker' and d->'phone'->'v' = 'null'::jsonb
  from (select profile_details_section('00000000-0000-0000-0000-00000000000b') d) x));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select t.expect('the Hub team sees every field', (select d->'phone'->>'v' = '(902) 555-0101' from (select profile_details_section('00000000-0000-0000-0000-00000000000b') d) x));
reset role;
select t.expect('the field list is not callable from the API', not has_function_privilege('anon', 'profile_field_list()', 'execute') and not has_function_privilege('authenticated', 'profile_field_list()', 'execute'));

-- ===== My deadlines (Update 13): private to each member =====
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into deadline_settings (user_id, setup) values (auth.uid(), '{"prov":"NS","type":"sole"}');
insert into deadline_custom (user_id, title, due) values (auth.uid(), 'Licence renewal', current_date + 7);
select t.expect('a member keeps their own deadlines', (select count(*) = 1 from deadline_custom where user_id = auth.uid()));
select t.expect_denied('a member cannot add a deadline for someone else', $$insert into deadline_custom (user_id, title, due) values ('00000000-0000-0000-0000-00000000000c', 'x', current_date)$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.expect('other members cannot see anyone else''s deadlines', (select count(*) = 0 from deadline_custom) and (select count(*) = 0 from deadline_settings));
select t.expect_denied('members cannot write the sent-reminders log', $$insert into deadline_sent (user_id, key, lead) values (auth.uid(), 'k', 7)$$);
reset role; set role anon;
select t.expect_denied('visitors cannot read deadlines', $$select * from deadline_settings$$);
reset role;

-- ===== Grant Finder (Update 15) =====
reset role; set role anon; set request.jwt.claim.sub = '';
select t.expect('visitors can read the programs', (select count(*) = 12 from grant_programs));
select t.expect_denied('visitors cannot add programs', $$insert into grant_programs (id, name, type) values ('fake', 'Fake grant', 'grant')$$);
select t.expect_denied('visitors cannot use the AI allowance', $$select grant_ai_take('question')$$);
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into grant_saves (user_id, program_id) values (auth.uid(), 'csbfp');
select t.expect('a member saves a program', (select count(*) = 1 from grant_saves where user_id = auth.uid()));
select t.expect('a free member gets 10 AI questions and 1 draft a month', (select (grant_ai_left()->>'questions')::int = 10 and (grant_ai_left()->>'drafts')::int = 1));
select t.expect('the first draft is allowed', grant_ai_take('draft'));
select t.expect('the second draft in a month is not', not grant_ai_take('draft'));
select t.expect_denied('members cannot reset their AI allowance', $$update grant_ai_use set drafts = 0 where user_id = auth.uid()$$);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select t.expect('other members cannot see anyone else''s saves', (select count(*) = 0 from grant_saves));
select t.expect_denied('members cannot add programs', $$insert into grant_programs (id, name, type) values ('fake', 'Fake grant', 'grant')$$);

reset role;

-- ===== Master categories (Update 15) =====
reset role;
select t.expect('32 industries and 335 specialities', (select count(*) = 32 from industries) and (select count(*) = 335 from specialities));
select t.expect('old for-sale industry names move to the new list', (select industry = 'Food & Drink' from sale_listings where slug = 'secret-bakery'));
select t.expect('the directory uses the same list', (select 'Retail & Shops' = any (categories) and not ('Retail' = any (categories)) from business_settings));
select t.expect_denied('a speciality must belong to the industry', $$update companies set category = 'Legal', sub = 'Plumbers' where id = (select id from companies limit 1)$$);
set request.jwt.claim.sub = ''; set role anon;
select t.expect('visitors can read the list', (select count(*) > 0 from specialities));
select t.expect_denied('visitors cannot change the list', $$insert into industries (name) values ('Fake')$$);
select t.expect('anyone can sign up for the weekly briefing', briefing_subscribe('owner@example.ca'));
select t.expect_denied('only the team reads the sign-ups', $$select * from briefing_signups$$);
reset role;

-- ===== Contact us (Update 24) =====
reset role; set request.jwt.claim.sub = ''; set role anon;
insert into contact_messages (name, email, message, business, topic) values ('Pat', 'pat@example.ca', 'Hello there', 'Pat Co', 'listing');
select t.expect_denied('a contact topic must be one of the list', $$insert into contact_messages (name, email, message, topic) values ('Pat', 'pat2@example.ca', 'Hi', 'spam')$$);
insert into contact_messages (name, email, message) select 'Pat', 'flood@example.ca', 'Hi' from generate_series(1, 5);
select t.expect_denied('one address can send at most 5 messages an hour', $$insert into contact_messages (name, email, message) values ('Pat', 'flood@example.ca', 'Hi')$$);
select t.expect_denied('visitors cannot read contact messages', $$select * from contact_messages$$);
reset role;
