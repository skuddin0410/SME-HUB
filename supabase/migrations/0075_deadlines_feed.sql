-- Update 38: My deadlines redesign. A calendar link that updates itself (webcal://<site>/deadlines/<token>.ics):
-- a long random token per member, which only they can see and reset. The feed is served by the server with the
-- service key, so nobody can read another member's dates without their token.
alter table deadline_settings add column if not exists feed_token text check (feed_token is null or feed_token ~ '^[A-Za-z0-9_-]{40,64}$');
create unique index if not exists deadline_settings_feed on deadline_settings (feed_token) where feed_token is not null;
