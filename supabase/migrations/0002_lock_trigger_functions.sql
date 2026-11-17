-- Trigger functions are only ever run by the database itself, so nobody needs to call them through the API.
revoke execute on function
  handle_new_user(), protect_profile_fields(), limit_post_rate(), add_group_creator(),
  notify_reaction(), notify_comment(), notify_connection()
from public, anon, authenticated;
