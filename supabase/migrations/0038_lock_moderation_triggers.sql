-- Trigger functions are only for the triggers; nobody calls them through the API.
revoke execute on function public.mod_after_report(), public.mod_after_block() from public, anon, authenticated;
