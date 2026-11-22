# Phase 4: Business profiles

Branch `v2`. Database migrations 0021 to 0023 (live). Tracker rows 39 to 48.

## What a member can do
- **Directory** (`/businesses`): search, category, province, type, sort (best rated, newest, name), "Open now", and grid, list or map views. The map needs the public `NEXT_PUBLIC_MAPBOX_TOKEN`; without it the cities show as a list.
- **Business page** (`/businesses/[slug]`): Feed, Services, About (hours, contacts, links) and Reviews tabs, follow button, a main button the owner chooses (message, call, website, book), and a claim box on listings the team added. The Photos, Events, Jobs and Shop tabs are switchable in settings but arrive with Phases 5 to 8.
- **Add a business** (`/businesses/mine`): five quick details (name, category, type, city and province, what it does), then **Manage** (`/businesses/mine/[slug]`) for hours, contacts with a show/hide switch each, services, team, and publishing.
- **Team roles**: Owner (everything), Manager (edit, post, answer), Editor (post as the business), Responder (answer messages).
- **Post as the business** from the feed composer ("Post as ..."). The post shows the business name and logo, with the team member named underneath.
- **Shared inbox** (`/businesses/mine/[slug]/inbox`) and **My messages** (`/businesses/messages`): messages and quote requests, one thread per conversation.
- **Reviews by criteria** (Quality, Value, Communication by default); the overall score is the average. Team members cannot review their own page. Owners and managers can reply once per review.

## Staff
`/admin/businesses`: approve or reject pages, decide ownership claims, show or hide reviews, and the directory settings (who may create pages, pages per member, approval on or off, categories, review criteria, tabs).

## Rules that live in the database (0021)
- New pages start as drafts. With approval on, a member can only send a page for approval; staff publish it. With approval off, members publish directly.
- Limit is `business_settings.member_limit` per member (default 3) for any active member, or paid plans only when staff choose that.
- Private contact details are in `business_private`, readable by owners and managers only. The public reads them through `business_contact()`, which returns only what the owner chose to show.
- Pages that are not published are visible only to their team and staff, and are sent with `noindex`.
- Claims: `decide_claim()` (staff only) moves ownership, replaces the team and closes other open claims.

## SEO
Per-page title, description, canonical and social image; `LocalBusiness` structured data (address and contacts only when shown, opening hours, rating); the sitemap lists published pages only.

## Existing data
Migration 0023 moved the six existing companies: city and province from the owner's profile location, and old categories mapped to the new list. They stay published. The eight sample businesses in the design hand-off are not added to the live database, because their owners are made-up people.

## Checks
- Unit tests: 101 passing (helpers for hours, prices and links).
- Database security tests: 287 passing (`bash supabase/tests/run.sh`).
- Browser tests: 200 passing, including accessibility (light and dark, visitor and member) and every screen width.
