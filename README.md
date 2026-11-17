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
