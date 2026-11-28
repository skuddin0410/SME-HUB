-- Update 45: the 10 SME Hub policies.
-- 1. Marketing email is opt-in: newsletter, CanadianSME magazine and partner offers are separate lists.
-- 2. Hosted events say whether they are recorded, and record when the host agreed to the provider terms.
-- Safe to run more than once.

-- ---------- 1. marketing email ----------
alter table member_settings add column if not exists alert_mag boolean not null default false;      -- CanadianSME Small Business Magazine
alter table member_settings add column if not exists alert_partner boolean not null default false;  -- offers from partners
-- the newsletter now starts off: new members get it only when they tick the box at sign-up
alter table member_settings alter column alert_news set default false;

-- a new member's settings row, with the newsletter set from the sign-up box (metadata newsletter = 'true')
create or replace function member_settings_for_new_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wants boolean;
begin
  select coalesce(u.raw_user_meta_data ->> 'newsletter', '') = 'true' into wants from auth.users u where u.id = new.id;
  insert into member_settings (member_id, alert_news) values (new.id, coalesce(wants, false))
  on conflict (member_id) do nothing;
  return new;
end $$;
revoke execute on function member_settings_for_new_profile() from public, anon, authenticated;
drop trigger if exists member_settings_for_new_profile on profiles;
create trigger member_settings_for_new_profile after insert on profiles
  for each row execute function member_settings_for_new_profile();

-- members who never opened Settings have no row yet. Give them one, with the newsletter on only if they said yes to it.
-- Rows that already exist keep what the member chose.
insert into member_settings (member_id, alert_news)
select p.id, exists (select 1 from newsletter_consents c where c.user_id = p.id)
from profiles p
where not exists (select 1 from member_settings s where s.member_id = p.id)
on conflict (member_id) do nothing;

-- ---------- 2. hosted events ----------
alter table hub_events add column if not exists recording text not null default 'no';
alter table hub_events drop constraint if exists hub_events_recording_check;
alter table hub_events add constraint hub_events_recording_check check (recording in ('no', 'yes', 'promo'));
alter table hub_events add column if not exists terms_at timestamptz;      -- when the host agreed to the provider terms
alter table hub_events add column if not exists terms_version text;        -- the "updated" date of the terms they agreed to

-- a host can't move the agreement date after publishing
create or replace function hub_events_terms_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then
    new.terms_at := old.terms_at; new.terms_version := old.terms_version;
  end if;
  return new;
end $$;
revoke execute on function hub_events_terms_guard() from public, anon, authenticated;
drop trigger if exists hub_events_terms_guard on hub_events;
create trigger hub_events_terms_guard before update on hub_events
  for each row execute function hub_events_terms_guard();
