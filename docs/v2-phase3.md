# V2 Phase 3: Feed

Rules live in the database (`0019_feed.sql`, `0020_feed_search_path.sql`), so every screen and any future app follows them.

| Feature | Where it is enforced | Screen |
|---|---|---|
| Titles (120 chars), cover pictures | `posts.title`, `posts_cover_url_ours` (our storage only) | Composer, post card |
| Six reactions (like, celebrate, support, love, insight, funny) | `reactions_kind_check`; old names kept for the existing site | Post actions |
| Threaded comments (one level), edit in 10 minutes, close comments | `comment_rules()` trigger, `comments_closed` | Comment thread |
| Quote posts | `posts.quoted_post_id`; quoting a post you cannot see is refused | Quote button, embed |
| Polls (2–10 options, 1 hour–30 days, one anonymous vote each) | `add_poll()`, `poll_votes` policies, `count_poll_vote()` | Composer, poll card |
| Scheduled posts (1 minute–90 days) | `post_rules()`, `publish_due_posts()` run by pg_cron every minute; safe to run twice | `/scheduled` |
| Edit window (10 minutes) and one profile pin per member | `post_rules()`, `posts_one_profile_pin` | Owner row on a post |
| Visibility (public, members, connections, private) | "posts readable" policy | Composer |
| Feed paging and scopes | Cursor `(created_at, id)`; scopes all, mine, reacted, groups, connections, following | `/feed` |

Bookmarks were already built and keep working.

## Tests
- Database: 231 checks in `supabase/tests/security.sql` (`bash supabase/tests/run.sh`).
- Unit: `tests/unit/feed-rules.test.ts`.
- Browser: `e2e/feed.spec.ts` (post options, poll, six reactions, scopes, scheduled page, accessibility, screen widths).

## Notes
- Reactions are stored under stable names. The old site shows `love` as "Insightful"; v2 shows `insight` as "Insightful" and `love` as "Love".
- Scheduled posts are private to the author until published. Cancelling one deletes it.
