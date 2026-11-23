-- Stories settings and Automations (workflows and the post queue) live in the same settings table.
alter table public.hub_settings drop constraint if exists hub_settings_key_check;
alter table public.hub_settings add constraint hub_settings_key_check
  check (key in ('profiles','feed','groups','blogs','hashtags','stories','automations'));
