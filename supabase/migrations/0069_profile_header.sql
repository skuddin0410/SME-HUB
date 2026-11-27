-- Update 39: every member can edit the header (the wide image at the top of their profile).
-- A header is either a photo (cropped to 1584 x 396 in the browser, which also drops location data) or one of
-- 8 ready-made colours. The original photo and the chosen crop are kept, so the member can re-crop later.
-- Pictures must be in our own storage, in the member's own folder. At most 10 header changes a day.

alter table profiles
  add column if not exists header_url text,
  add column if not exists header_src text,
  add column if not exists header_crop jsonb,
  add column if not exists header_colour smallint check (header_colour between 0 and 7),
  add column if not exists header_changes smallint not null default 0,
  add column if not exists header_day date;

alter table profiles drop constraint if exists profiles_header_ours;
alter table profiles add constraint profiles_header_ours check (
  (header_url is null or header_url like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/' || id::text || '/%')
  and (header_src is null or header_src like 'https://kjxbjqcmtjopamxyojzs.supabase.co/storage/v1/object/public/media/' || id::text || '/%')
  and (header_url is null or header_colour is null)
  and (header_crop is null or jsonb_typeof(header_crop) = 'object')
);

-- counts changes per day (Toronto time) and refuses the 11th; members can't reset the counter themselves
create or replace function profiles_header_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Toronto')::date;
begin
  if new.header_url is not distinct from old.header_url
     and new.header_colour is not distinct from old.header_colour
     and new.header_crop is not distinct from old.header_crop then
    new.header_changes := old.header_changes;
    new.header_day := old.header_day;
    return new;
  end if;
  if old.header_day is distinct from today then
    new.header_changes := 1;
  else
    if old.header_changes >= 10 and not is_staff() then
      raise exception 'header_limit' using hint = 'You can change your header 10 times a day. Try again tomorrow.';
    end if;
    new.header_changes := old.header_changes + 1;
  end if;
  new.header_day := today;
  return new;
end $$;
revoke execute on function profiles_header_limit() from public, anon, authenticated;

drop trigger if exists profiles_header_limit on profiles;
create trigger profiles_header_limit before update of header_url, header_colour, header_crop, header_changes, header_day on profiles
  for each row execute function profiles_header_limit();
