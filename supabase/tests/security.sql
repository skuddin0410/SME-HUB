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
