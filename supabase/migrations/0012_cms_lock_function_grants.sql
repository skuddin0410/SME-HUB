-- The CMS functions refuse anyone who is not an admin, and on top of that they are not callable at
-- all without signing in (Postgres grants EXECUTE to PUBLIC by default, so revoking from anon alone
-- was not enough).
revoke execute on function cms_users(text, text, text, text, int, int, uuid, text), cms_overview(), cms_conversations(uuid, int, int), cms_post_stats(uuid[]), cms_delete_account(uuid), cms_log(text, text, text, jsonb), cms_require_staff() from public, anon;
grant execute on function cms_users(text, text, text, text, int, int, uuid, text), cms_overview(), cms_conversations(uuid, int, int), cms_post_stats(uuid[]), cms_delete_account(uuid), cms_log(text, text, text, jsonb), cms_require_staff() to authenticated;
