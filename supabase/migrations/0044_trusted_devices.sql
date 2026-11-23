-- Update 1: "Email code on new devices". Only the server (service role) reads or writes these two tables:
-- a member's own session must never be able to read a code or mark a device as trusted.
create table trusted_devices (
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, token_hash)
);
alter table trusted_devices enable row level security;

create table signin_challenges (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null
);
alter table signin_challenges enable row level security;
-- no policies on either table
