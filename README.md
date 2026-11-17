# SME Hub

A LinkedIn-style networking hub for small business owners. Next.js (App Router) + Supabase, started from the official Supabase Next.js starter with shadcn/ui components.

## What is built (round 1)

- Sign up, sign in, password reset (Supabase Auth, email confirmation)
- Feed: text + image posts, four visibility levels (public, all members, connections, only me), likes, comments
- Member directory with search and member-type filter, profile pages, profile editing with photo
- Connections: request, accept, decline, cancel, remove; block a member
- Groups: public and private, join/leave, group feed
- Alerts for likes, comments and connection activity
- Moderation: report a post, staff review queue, remove post, suspend member, 10 posts/hour limit

Schema is ready but there are no screens yet for: company pages (`companies` table), paid plans (`profiles.member_type`).

## Round 2

- The hub is open: anyone can browse the feed, members, groups and profiles. Sign in and Join free sit at the top right; posting, liking, commenting and connecting ask for an account.
- CanadianSME look: navy and red, three-column layout on desktop, bottom tab bar on mobile.
- Likes, comments, sharing and reporting happen in place on each post, with no page reload.
- Search across people, groups and posts.
- Admin panel at `/admin` (own login at `/admin/login`, staff accounts only): overview numbers and 14-day activity, member plans/status/roles, pin or delete posts, report queue, delete groups.

## Round 5

- LinkedIn's type system: the device's own UI font, 14px body, 12px meta, 600 for emphasis. No web fonts are downloaded.
- LinkedIn's feed geometry: 1128px page, 225 / fluid / 300 columns, side rails fixed while the centre scrolls.
- Post box with shortcuts, and a Like / Comment / Share / Send bar on every post.
- Direct messages between connections (`/messages`), delivered live.
- Members add and edit their own business listings (`/businesses/mine`); the number allowed follows the plan (Free 0, Plus 1, Elite 2, Advisor 3).

## Round 6

- Network, Messaging and Notifications rebuilt to LinkedIn's structure, with their own page layouts.
- Instant reactions: Connect, Accept, Ignore, dismiss, filters, mark as read, switching conversations and sending messages all update on screen first and save in the background.
- Posts: icon-and-count action row, a Connect shortcut and a "..." menu (copy link, report, delete) in the header.
- Header: Network, Messaging, Notifications and Me as icon-over-label items with counts.

## Setup

1. Create a Supabase project, open SQL Editor, paste and run `supabase/migrations/0001_hub_core.sql`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key (Supabase > Project Settings > API).
3. In Supabase > Authentication > URL Configuration, set Site URL to your domain (or `http://localhost:3000`).
4. Run:

```
npm install
npm run dev
```

5. Make yourself an admin (SQL Editor), after signing up once:

```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```

## Where things live

- `supabase/migrations/0001_hub_core.sql`: tables, security rules, triggers
- `lib/hub.ts`: types and the feed query
- `app/(hub)/actions.ts`: every write (post, like, connect, join, report...)
- `app/(hub)/*`: pages; `components/hub.tsx`: shared UI (post card, composer, avatar)

## Demo content (remove before launch)

- The live database holds 8 demo members, 4 groups and 9 posts so the hub can be judged with content in it. Every demo account has an `@demo.invalid` email and cannot sign in. Remove all of it, with its posts, groups, likes and comments, in the Supabase SQL Editor:

```sql
delete from auth.users where email like '%@demo.invalid';
```

- Placeholder photos and cover images come from `lib/demo.ts`. Set `DEMO_IMAGES` to `false` there to switch them off.
