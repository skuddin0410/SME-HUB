# SMB Hub CMS

The admin console for the hub. Code lives in `app/cms` (pages), `app/cms/actions.ts` (every change),
`components/cms` and `lib/cms*.ts`. It runs inside the same Next.js app as the hub, so it reads and
writes the same Supabase database: there is nothing to sync, and nothing can drift.

## How it stays in sync

- **Same data.** Every CMS page queries the hub's own tables with the signed-in admin's session.
  Supabase's row-level security decides what admins can see and change (`is_staff()`).
- **Live.** Migration `0011_cms.sql` adds a trigger to every hub table (members, posts, comments,
  reactions, reposts, bookmarks, connections, messages, groups, memberships, invites, businesses,
  reviews, reports, blocks, welcome emails). Each change is written to `cms_events`, which only admins
  can read. The CMS listens to that table over Supabase Realtime and refreshes the open page a moment
  after anything happens. The green **Live** badge in the top bar shows the connection.
- **Accountable.** Every CMS action is logged with the admin who made it (`cms_log`). See **Audit log**.

## Privacy

Message text never reaches the CMS. Admins see who is messaging whom, how many messages and when.
The activity log strips message bodies. Bookmarks show as counts only.

## Pages

Dashboard · Live activity · Members (+ detail: edit profile, plan, role, suspend, remove photo,
delete account) · Connections · Messages · Admins · Posts (+ detail: edit, pin, delete, comments,
reactions, reports) · Comments · Groups (+ detail: edit, members, group admins, invites, delete;
create new groups) · Business listings · Reviews · Reports (remove post, suspend member, dismiss,
reopen) · Blocks · Notifications · Emails · Audit log.

## Setup

1. **Database.** Apply `supabase/migrations/0011_cms.sql` (Supabase SQL editor, or ask Claude to apply
   it). Until it is applied, the CMS pages show an error; the hub itself is unaffected.
2. **Access.** Admins are members with `role = 'admin'`. Sign in at `/cms/login` (or `/login` on the
   subdomain). Add or remove admins on the **Admins** page.
3. **Subdomain `cms.smbhub.ca`.** In AWS Amplify, open the hub app, *Hosting → Custom domains*, and add
   `cms` as a subdomain of `smbhub.ca` pointing at the same branch (`main`). Add the CNAME Amplify
   shows to Cloudflare (DNS only, grey cloud, while Amplify verifies). The middleware serves the CMS at
   the root of any host that starts with `cms.`, so `cms.smbhub.ca/members` is the members list.
4. **Supabase Auth.** Add `https://cms.smbhub.ca/**` to *Authentication → URL Configuration →
   Redirect URLs*.

The existing `/admin` pages still work and are unchanged.
