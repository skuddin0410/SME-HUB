-- Stand-ins for the parts of Supabase the migrations rely on, so the security tests can run on plain Postgres.
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}',
  raw_app_meta_data jsonb default '{}', created_at timestamptz default now(), last_sign_in_at timestamptz, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
create publication supabase_realtime;
grant usage on schema public, auth to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- Update 1: the pieces of Supabase Auth that 0043 reads
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('session_id', nullif(current_setting('request.jwt.claim.session_id', true), ''), 'email', nullif(current_setting('request.jwt.claim.email', true), '')) $$;
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(), updated_at timestamptz default now(),
  refreshed_at timestamp, not_after timestamptz, user_agent text, ip inet);
