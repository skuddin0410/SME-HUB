-- Update 8: the team edits the Help home's popular searches and "Most asked questions" in the same settings table.
alter table public.hub_settings drop constraint if exists hub_settings_key_check;
alter table public.hub_settings add constraint hub_settings_key_check
  check (key in ('profiles','feed','groups','blogs','hashtags','stories','automations','help'));
