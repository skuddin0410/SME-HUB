# V2 foundation (Phase 0)

## Roles, plans and permissions
- **team_roles** is the source of truth for staff (`admin`, `moderator`). `is_staff()` and `is_admin()` read it.
  `profiles.role` is kept in step both ways so the existing CMS keeps working.
- **plan_limits** holds what each plan (`free`, `plus`, `advisor`) may do; `null` means no limit.
- **can(action, used)** answers "may the signed-in member do this?" in the database. Actions today:
  `cms.access`, `cms.admin`, `roles.manage`, `settings.manage`, `post.offer`, `group.private`, `ai.ask`.
  Each phase adds its own actions here; server code calls it with `supabase.rpc("can", { p_action, p_used })`.
- **Founding Member**: `claim_founding_number()` hands out 1-500 from a locked counter. Sample accounts never take one.
- Members cannot change their own plan, Founding number, sample flag or role (`protect_profile_fields`).
- **app_now()**: the time. Tests can move it with `set app.now = '...'`; the website's connection cannot.

## Sample data
- Source: the handoff's `data/*.json`, copied to `supabase/seed/handoff/`. Photos: `public/sample/`.
- Build the SQL: `python3 scripts/seed/build_sample_sql.py` → `supabase/seed/sample.sql`. Run it against the
  database; running it again changes nothing (ids are UUID v5 of the handoff's own ids).
- Everything is flagged `is_sample`; sample accounts have no password, so nobody can sign in as them.
- Before launch: run `supabase/seed/remove_sample.sql`.
- Only what today's tables hold is loaded. Each phase extends the script for its new tables.

## Tests
- `npm run test:db`: every migration plus the security tests on a throwaway Postgres, including the
  permission matrix generated from `plan_limits` (every plan x every limited action).
- `npm run test:e2e`: browser tests at 390, 768, 1024, 1280 and 1440 px against a mock database
  (`e2e/mock-supabase.mjs`). Build first with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54398`.
  Locally, `CHROME_PATH=/usr/bin/google-chrome` uses an installed Chrome.
- CI runs all of it on every push to `main` and `v2` and on pull requests.
