-- Moderation log with restore, and business reports.
-- Every hide, removal, suspension and reversal is written to one log by the database itself (so nothing done by a
-- moderator, by the automatic limits or straight in the database is missed). The team can restore from the log.
-- Members report a business page or a review; the team removes it or keeps it from Business Profiles.

create table mod_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid references profiles (id) on delete set null,   -- null: done automatically (report or block limits)
  action text not null check (action in ('hide', 'unhide', 'suspend', 'unsuspend', 'remove', 'restore', 'reject', 'approve', 'dismiss')),
  kind text not null check (kind in ('post', 'member', 'story', 'course_review', 'business', 'business_review', 'advisor_review', 'pavilion')),
  target_id text not null,
  label text not null default '' check (char_length(label) <= 160),
  undone_at timestamptz,
  undone_by uuid references profiles (id) on delete set null
);
create index mod_log_at on mod_log (at desc);
create index mod_log_target on mod_log (kind, target_id, at desc);
alter table mod_log enable row level security;
create policy "team reads the log" on mod_log for select to authenticated using (is_staff());
revoke all on mod_log from anon, authenticated;
grant select on mod_log to authenticated;

create function mod_write(p_action text, p_kind text, p_target text, p_label text) returns void
language sql security definer set search_path = public as $$
  insert into mod_log (actor_id, action, kind, target_id, label) values (auth.uid(), p_action, p_kind, p_target, left(coalesce(p_label, ''), 160));
$$;

create function mod_log_posts() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hidden_at is distinct from old.hidden_at then
    perform mod_write(case when new.hidden_at is null then 'unhide' else 'hide' end, 'post', new.id::text, left(coalesce(new.title, new.body), 120));
  end if;
  return null;
end $$;
create trigger mod_log_posts after update of hidden_at on posts for each row execute function mod_log_posts();

create function mod_log_members() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and (new.status = 'suspended' or old.status = 'suspended') then
    perform mod_write(case when new.status = 'suspended' then 'suspend' else 'unsuspend' end, 'member', new.id::text, coalesce(new.full_name, ''));
  end if;
  return null;
end $$;
create trigger mod_log_members after update of status on profiles for each row execute function mod_log_members();

create function mod_log_stories() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('removed', 'rejected', 'published') and old.status <> 'deleted' then
    perform mod_write(case new.status when 'removed' then 'remove' when 'rejected' then 'reject' else case when old.status = 'pending' then 'approve' else 'restore' end end,
      'story', new.id::text, coalesce(nullif(new.caption, ''), 'Story'));
  end if;
  return null;
end $$;
create trigger mod_log_stories after update of status on stories for each row execute function mod_log_stories();

create function mod_log_course_reviews() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hidden_at is distinct from old.hidden_at then
    perform mod_write(case when new.hidden_at is null then 'unhide' else 'hide' end, 'course_review', new.id::text, 'Course review');
  end if;
  return null;
end $$;
create trigger mod_log_course_reviews after update of hidden_at on course_reviews for each row execute function mod_log_course_reviews();

create function mod_log_business() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('deleted', 'rejected') and is_staff() then
    perform mod_write(case new.status when 'deleted' then 'remove' else 'reject' end, 'business', new.id::text, new.name);
  elsif new.status is distinct from old.status and old.status = 'deleted' and new.status = 'published' then
    perform mod_write('restore', 'business', new.id::text, new.name);
  end if;
  return null;
end $$;
create trigger mod_log_business after update of status on companies for each row execute function mod_log_business();

create function mod_log_business_reviews() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and (new.status = 'hidden' or old.status = 'hidden') then
    perform mod_write(case when new.status = 'hidden' then 'hide' else 'unhide' end, 'business_review', new.company_id::text || ':' || new.author_id::text, left(new.body, 120));
  end if;
  return null;
end $$;
create trigger mod_log_business_reviews after update of status on company_reviews for each row execute function mod_log_business_reviews();

create function mod_log_advisor_reviews() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform mod_write(case when new.status = 'hidden' then 'hide' else 'unhide' end, 'advisor_review', new.advisor_id::text || ':' || new.member_id::text, left(new.body, 120));
  end if;
  return null;
end $$;
create trigger mod_log_advisor_reviews after update of status on advisor_reviews for each row execute function mod_log_advisor_reviews();

create function mod_log_pavilion() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status = 'removed' and is_staff() and new.owner_id is distinct from auth.uid() then
    perform mod_write('remove', 'pavilion', new.id::text, new.name);
  end if;
  return null;
end $$;
create trigger mod_log_pavilion after update of status on pavilion_listings for each row execute function mod_log_pavilion();

-- Restore: reverses one logged action, once; the reversal is logged too (by the triggers above)
create function mod_restore(p_log uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l mod_log; a text; b text;
begin
  if not is_staff() then raise exception 'moderation: for the Hub team'; end if;
  select * into l from mod_log where id = p_log for update;
  if l.id is null or l.undone_at is not null then raise exception 'moderation: already restored'; end if;
  if l.action not in ('hide', 'suspend', 'remove', 'reject') then raise exception 'moderation: nothing to restore'; end if;
  a := split_part(l.target_id, ':', 1); b := split_part(l.target_id, ':', 2);
  case l.kind
    when 'post' then update posts set hidden_at = null where id = a::uuid;
    when 'member' then update profiles set status = 'active' where id = a::uuid and status = 'suspended';
    when 'story' then update stories set status = 'published', reports_done = true where id = a::uuid and status in ('removed', 'rejected');
    when 'course_review' then update course_reviews set hidden_at = null where id = a::uuid;
    when 'business' then update companies set status = 'published' where id = a::uuid and status in ('deleted', 'rejected');
    when 'business_review' then update company_reviews set status = 'published' where company_id = a::uuid and author_id = b::uuid;
    when 'advisor_review' then update advisor_reviews set status = 'published' where advisor_id = a::uuid and member_id = b::uuid;
    when 'pavilion' then update pavilion_listings set status = 'published' where id = a::uuid;
  end case;
  update mod_log set undone_at = now(), undone_by = auth.uid() where id = p_log;
end $$;

-- ---------- business reports ----------
create table business_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  review_author_id uuid references profiles (id) on delete cascade,   -- set: the report is about that member's review
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null check (reason in ('Discrimination', 'Harassment or hate', 'Spam', 'Misleading or false', 'Fake or impersonating', 'Something else')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);
create unique index business_reports_once on business_reports (company_id, coalesce(review_author_id, '00000000-0000-0000-0000-000000000000'::uuid), reporter_id) where status = 'open';
alter table business_reports enable row level security;
create policy "report a business" on business_reports for insert to authenticated
  with check (reporter_id = auth.uid() and is_active() and (
    (review_author_id is null and exists (select 1 from companies c where c.id = company_id and c.status = 'published' and c.owner_id <> auth.uid()))
    or (review_author_id is not null and review_author_id <> auth.uid() and exists (select 1 from company_reviews r where r.company_id = business_reports.company_id and r.author_id = review_author_id and r.status = 'published'))));
create policy "team reads business reports" on business_reports for select to authenticated using (is_staff());
revoke all on business_reports from anon, authenticated;
grant insert (company_id, review_author_id, reporter_id, reason, note) on business_reports to authenticated;
grant select on business_reports to authenticated;

create function biz_report_rate() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from business_reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 20 then raise exception 'reports: that is a lot of reports for one day'; end if;
  return new;
end $$;
create trigger biz_report_rate before insert on business_reports for each row execute function biz_report_rate();

-- the team's two buttons: remove the review (or the page), or keep it; every open report on it is closed
create function biz_report_act(p_report uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare r business_reports;
begin
  if not is_staff() then raise exception 'reports: for the Hub team'; end if;
  select * into r from business_reports where id = p_report;
  if r.id is null then raise exception 'reports: not found'; end if;
  if p_action = 'remove' then
    if r.review_author_id is not null then update company_reviews set status = 'hidden' where company_id = r.company_id and author_id = r.review_author_id;
    else update companies set status = 'deleted' where id = r.company_id; end if;
  elsif p_action <> 'keep' then raise exception 'reports: unknown action';
  else perform mod_write('dismiss', case when r.review_author_id is null then 'business' else 'business_review' end,
      r.company_id::text || coalesce(':' || r.review_author_id::text, ''), 'Reports dismissed');
  end if;
  update business_reports set status = case when p_action = 'remove' then 'actioned' else 'dismissed' end
  where company_id = r.company_id and review_author_id is not distinct from r.review_author_id and status = 'open';
end $$;

-- contact messages: the team can keep a short note on each
alter table contact_messages add column if not exists team_note text not null default '' check (char_length(team_note) <= 1000);

revoke execute on function mod_write(text, text, text, text), mod_log_posts(), mod_log_members(), mod_log_stories(), mod_log_course_reviews(),
  mod_log_business(), mod_log_business_reviews(), mod_log_advisor_reviews(), mod_log_pavilion(), biz_report_rate() from public, anon, authenticated;
revoke execute on function mod_restore(uuid), biz_report_act(uuid, text) from public, anon;
grant execute on function mod_restore(uuid), biz_report_act(uuid, text) to authenticated;
