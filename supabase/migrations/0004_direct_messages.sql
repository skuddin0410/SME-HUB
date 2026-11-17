-- Direct messages between connected members.
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles (id) on delete cascade,
  recipient_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index messages_recipient_idx on messages (recipient_id, created_at desc);
create index messages_sender_idx on messages (sender_id, created_at desc);

alter table messages enable row level security;

create policy "messages own read" on messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
-- you can only message people you are connected with (blocking removes the connection)
create policy "messages send to connections" on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_active() and is_connected(recipient_id));
-- the recipient marks messages as read
create policy "messages mark read" on messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- only read_at may change after sending
create function protect_message_fields() returns trigger
language plpgsql as $$
begin
  new.body := old.body;
  new.sender_id := old.sender_id;
  new.recipient_id := old.recipient_id;
  new.created_at := old.created_at;
  return new;
end $$;
create trigger protect_message_fields before update on messages
  for each row execute function protect_message_fields();

-- live delivery
alter publication supabase_realtime add table messages;
