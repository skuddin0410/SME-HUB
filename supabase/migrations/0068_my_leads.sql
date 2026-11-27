-- Update 30: My leads. Every enquiry a member gets through SME Hub, in one place.
-- Two rules shape everything here:
--   1. Only people who contact the member through SME Hub become leads. Nothing is uploaded.
--   2. Nothing is sent in the member's name automatically. The Hub reminds the owner; the owner sends.
-- Leads are private to the member who received them and, for a business page, to that business's
-- inbox team (owner, manager, responder).

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  inquiry_id uuid references public.business_inquiries (id) on delete set null,
  source text not null check (source in ('message', 'page', 'quote', 'request')),
  need text check (char_length(need) <= 160),
  status text not null default 'new' check (status in ('new', 'quoted', 'won', 'lost')),
  lost_reason text check (char_length(lost_reason) <= 160),
  note text check (char_length(note) <= 2000),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and contact_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  follow_up_at timestamptz,
  reminded_at timestamptz,
  quoted_at timestamptz,
  replied_at timestamptz,
  last_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (owner_id, contact_id),
  check (owner_id <> contact_id)
);
create index if not exists leads_owner on public.leads (owner_id, created_at desc);
create index if not exists leads_company on public.leads (company_id) where company_id is not null;
create index if not exists leads_due on public.leads (follow_up_at) where follow_up_at is not null;

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists lead_events_lead on public.lead_events (lead_id, created_at desc);

alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

-- the member who received the lead, or the business page's inbox team
create or replace function public.can_see_lead(l public.leads) returns boolean
language sql stable security definer set search_path = public as $$
  select l.owner_id = auth.uid() or (l.company_id is not null and biz_can(l.company_id, 'inbox'));
$$;
revoke execute on function public.can_see_lead(public.leads) from public, anon;
grant execute on function public.can_see_lead(public.leads) to authenticated;

drop policy if exists "leads read" on public.leads;
create policy "leads read" on public.leads for select to authenticated using (can_see_lead(leads));
drop policy if exists "leads update" on public.leads;
create policy "leads update" on public.leads for update to authenticated using (can_see_lead(leads)) with check (can_see_lead(leads));
drop policy if exists "lead events read" on public.lead_events;
create policy "lead events read" on public.lead_events for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id and can_see_lead(l)));
grant select, update on public.leads to authenticated;
grant select on public.lead_events to authenticated;
-- leads and history are only ever created by the database below; nobody inserts or deletes them directly

-- what a member may change: status, notes, the contact's email and phone, the next reminder
create or replace function public.lead_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.owner_id := old.owner_id; new.contact_id := old.contact_id; new.company_id := old.company_id;
  new.inquiry_id := old.inquiry_id; new.source := old.source; new.created_at := old.created_at;
  -- members change only what's theirs to change; the database's own lead updates are marked app.lead_system
  if auth.uid() is not null and coalesce(current_setting('app.lead_system', true), '') <> '1' then
    new.need := old.need; new.replied_at := old.replied_at; new.last_contact_at := old.last_contact_at;
    new.reminded_at := old.reminded_at; new.quoted_at := old.quoted_at;
  end if;
  if new.status is distinct from old.status then
    new.follow_up_at := case new.status
      when 'new' then now() + interval '1 day'
      when 'quoted' then now() + interval '3 days'
      when 'won' then now()
      else null end;
    if new.status = 'quoted' then new.quoted_at := now(); end if;
    if new.status <> 'lost' then new.lost_reason := null; end if;
  end if;
  if new.follow_up_at is distinct from old.follow_up_at then new.reminded_at := null; end if;
  return new;
end $$;
drop trigger if exists lead_guard on public.leads;
create trigger lead_guard before update on public.leads for each row execute function public.lead_guard();

create or replace function public.lead_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into lead_events (lead_id, body) values (new.id,
      'Marked as ' || new.status || case when new.status = 'lost' and new.lost_reason is not null then ': ' || left(new.lost_reason, 120) else '' end);
  end if;
  return null;
end $$;
drop trigger if exists lead_after_change on public.leads;
create trigger lead_after_change after update on public.leads for each row execute function public.lead_after_change();

-- ---------- where leads come from ----------
-- one lead per person per member; a later enquiry adds to the same lead's history
create or replace function public.lead_upsert(p_owner uuid, p_contact uuid, p_company uuid, p_inquiry uuid, p_source text, p_need text, p_event text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform set_config('app.lead_system', '1', true);
  if p_owner is null or p_contact is null or p_owner = p_contact then return; end if;
  select id into v_id from leads where owner_id = p_owner and contact_id = p_contact;
  if v_id is null then
    insert into leads (owner_id, contact_id, company_id, inquiry_id, source, need, follow_up_at)
    values (p_owner, p_contact, p_company, p_inquiry, p_source, nullif(left(btrim(coalesce(p_need, '')), 160), ''), now() + interval '1 day')
    returning id into v_id;
  else
    update leads set last_contact_at = now(),
      company_id = coalesce(company_id, p_company), inquiry_id = coalesce(inquiry_id, p_inquiry),
      need = coalesce(need, nullif(left(btrim(coalesce(p_need, '')), 160), ''))
    where id = v_id;
  end if;
  insert into lead_events (lead_id, body) values (v_id, left(p_event, 200));
  perform set_config('app.lead_system', '', true);
end $$;
revoke execute on function public.lead_upsert(uuid, uuid, uuid, uuid, text, text, text) from public, anon, authenticated;

-- a first message to a business owner from someone they have never messaged with
create or replace function public.lead_from_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text; v_lead leads;
begin
  perform set_config('app.lead_system', '1', true);
  begin
    -- the owner answered a lead: note it once, so "waiting for your reply" clears
    select * into v_lead from leads where owner_id = new.sender_id and contact_id = new.recipient_id;
    if found then
      if v_lead.replied_at is null then
        update leads set replied_at = now() where id = v_lead.id;
        insert into lead_events (lead_id, body) values (v_lead.id, 'You replied on SME Hub');
      end if;
      return null;
    end if;
    if exists (select 1 from leads where owner_id = new.recipient_id and contact_id = new.sender_id) then
      update leads set last_contact_at = now() where owner_id = new.recipient_id and contact_id = new.sender_id;
      return null;
    end if;
    if not exists (select 1 from companies where owner_id = new.recipient_id) then return null; end if;
    if exists (select 1 from messages m where m.id <> new.id and ((m.sender_id = new.sender_id and m.recipient_id = new.recipient_id) or (m.sender_id = new.recipient_id and m.recipient_id = new.sender_id))) then
      return null;
    end if;
    select split_part(coalesce(full_name, 'Someone'), ' ', 1) into v_name from profiles where id = new.sender_id;
    perform lead_upsert(new.recipient_id, new.sender_id, null, null, 'message', new.body, coalesce(v_name, 'Someone') || ' sent you a message on SME Hub');
  exception when others then
    raise warning 'lead_from_message: %', sqlerrm; -- a lead must never stop a message being sent
  end;
  perform set_config('app.lead_system', '', true);
  return null;
end $$;
drop trigger if exists lead_from_message on public.messages;
create trigger lead_from_message after insert on public.messages for each row execute function public.lead_from_message();

-- Request a quote or Message on a business page
create or replace function public.lead_from_inquiry() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_name text;
begin
  begin
    select owner_id into v_owner from companies where id = new.company_id;
    select split_part(coalesce(full_name, 'Someone'), ' ', 1) into v_name from profiles where id = new.sender_id;
    perform lead_upsert(v_owner, new.sender_id, new.company_id, new.id,
      case when new.kind = 'quote' then 'quote' else 'page' end,
      case when new.kind = 'quote' then 'Asked for a quote' else null end,
      coalesce(v_name, 'Someone') || case when new.kind = 'quote' then ' asked for a quote from your business page' else ' messaged your business page' end);
  exception when others then
    raise warning 'lead_from_inquiry: %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists lead_from_inquiry on public.business_inquiries;
create trigger lead_from_inquiry after insert on public.business_inquiries for each row execute function public.lead_from_inquiry();

-- the words of a business-page enquiry become "what they need"; a team reply counts as a reply
create or replace function public.lead_from_inquiry_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare q business_inquiries; v_owner uuid; v_lead leads;
begin
  perform set_config('app.lead_system', '1', true);
  begin
    select * into q from business_inquiries where id = new.inquiry_id;
    select owner_id into v_owner from companies where id = q.company_id;
    select * into v_lead from leads where owner_id = v_owner and contact_id = q.sender_id;
    if not found then return null; end if;
    if new.as_business then
      if v_lead.replied_at is null then
        update leads set replied_at = now() where id = v_lead.id;
        insert into lead_events (lead_id, body) values (v_lead.id, 'Your team replied from the business inbox');
      end if;
    else
      update leads set last_contact_at = now(),
        need = case when need is null or need = 'Asked for a quote' then left(btrim(new.body), 160) else need end
      where id = v_lead.id;
    end if;
  exception when others then
    raise warning 'lead_from_inquiry_message: %', sqlerrm;
  end;
  perform set_config('app.lead_system', '', true);
  return null;
end $$;
drop trigger if exists lead_from_inquiry_message on public.business_inquiry_messages;
create trigger lead_from_inquiry_message after insert on public.business_inquiry_messages for each row execute function public.lead_from_inquiry_message();

-- ---------- reminders: to the owner only, never to the lead ----------
-- 1 day after a new lead with no reply; 3 and 7 days after a quote is marked as sent
do $$ begin
  alter table public.notifications drop constraint if exists notifications_type_check;
  alter table public.notifications add constraint notifications_type_check check (type in ('like', 'comment', 'connection_request', 'connection_accepted', 'course_feedback', 'course_submission', 'sale_enquiry', 'deadline', 'match_booked', 'advisor_booking', 'advisor_cancel', 'lead'));
end $$;

create or replace function public.lead_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; v_name text;
begin
  perform set_config('app.lead_system', '1', true);
  for r in
    select * from leads
    where follow_up_at is not null and follow_up_at <= now()
      and (reminded_at is null or reminded_at < follow_up_at)
      and status in ('new', 'quoted')
    limit 500
  loop
    select split_part(coalesce(full_name, 'Someone'), ' ', 1) into v_name from profiles where id = r.contact_id;
    if r.status = 'new' and r.replied_at is null then
      insert into notifications (user_id, actor_id, type, href, note)
      values (r.owner_id, r.contact_id, 'lead', '/leads', left(coalesce(v_name, 'A lead') || ' is waiting for your reply', 200));
      n := n + 1;
    elsif r.status = 'quoted' then
      insert into notifications (user_id, actor_id, type, href, note)
      values (r.owner_id, r.contact_id, 'lead', '/leads', left('Time to follow up with ' || coalesce(v_name, 'your lead') || ' about your quote', 200));
      n := n + 1;
    end if;
    -- after the 3-day reminder, the next one is 7 days after the quote; then none
    update leads set reminded_at = now(),
      follow_up_at = case when r.status = 'quoted' and r.quoted_at is not null and r.quoted_at + interval '7 days' > now() then r.quoted_at + interval '7 days' else follow_up_at end
    where id = r.id;
  end loop;
  perform set_config('app.lead_system', '', true);
  return n;
end $$;
revoke execute on function public.lead_reminders() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('lead-reminders', '17 * * * *', 'select public.lead_reminders()');
  end if;
exception when others then
  raise notice 'pg_cron not set up: %', sqlerrm;
end $$;
