-- Update 24: the new Contact us page asks for a business name (optional) and a topic, so each message goes to the
-- right inbox (support@smehub.ca or info@canadiansme.ca). Visitors can still only add messages; only the team reads them.
alter table public.contact_messages add column if not exists business text not null default '' check (char_length(business) <= 160);
alter table public.contact_messages add column if not exists topic text not null default 'other'
  check (topic in ('account', 'plans', 'listing', 'partner', 'press', 'report', 'other'));
grant insert (business, topic) on public.contact_messages to anon, authenticated;

-- at most 5 messages an hour from one email address, so the form cannot be used to flood the team's inboxes
create or replace function public.contact_message_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from contact_messages where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many messages, try again later';
  end if;
  return new;
end $$;
drop trigger if exists contact_message_limit on public.contact_messages;
create trigger contact_message_limit before insert on public.contact_messages for each row execute function public.contact_message_limit();
revoke execute on function public.contact_message_limit() from public, anon, authenticated;
