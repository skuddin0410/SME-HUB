# SME Hub emails and sign-in pages

- 86 ready-to-send HTML emails, with plain-text versions and a catalogue.
- 6 sign-in and password pages: sign up, confirm email, log in, forgot password, choose a new password, change password (logged in). They also include an expired-link state.
- A preview gallery that shows all of them.

## What's in this folder

| Path | What it is |
|---|---|
| `index.html` | Preview gallery. Open it to see every page and email on desktop, phone and in plain text (emails only), with subject, preview text, sender and variables. Buttons in the reset, verify and security emails open the matching page, so you can click through the whole password flow |
| `pages/` | The sign-in and password pages (`signup`, `verify`, `login`, `forgot`, `reset`, `change-password`), with `auth.css`, `auth.js`, `fonts.css`, `logo.png` and `logo@3x.png` (the SME Hub logo). The dark “Preview” bar at the top of each page is for the preview only. Remove it |
| `templates/<id>.html` | **Production HTML** with Handlebars variables, for example `{{first_name}}` |
| `text/<id>.txt` | Plain-text version of each email. Send it as the `text/plain` part of a multipart email |
| `p/<id>.html`, `t/<id>.txt` | The same emails filled in with sample data (used by the gallery) |
| `emails.json` | Catalogue: id, category, name, **when to send**, sender, subject, preview text, type, variables, lists and list fields |
| `assets/` | `logo.png` (the SME Hub logo, 444 × 116, shown at 222 × 58 and 176 × 46 on phones), `logo@3x.png`, `sme-hub-logo-original.png` (the full-size logo as supplied) and the sample member photos used in previews |
| `build.py`, `lib.py`, `templates.py` | Source. Edit wording in `templates.py`, then run `python3 build.py` to rebuild everything |

## Sign-in and password pages: rules to keep

The pages show the design and behaviour. The checks in `auth.js` are for the preview only, so repeat every check on the server.

- **Sign up**
  - Fields: first name, last name, business name, work email, password and province.
  - Members must agree to the terms before they can join.
  - The newsletter box starts **unticked**. CASL needs express consent, so record the date, time and wording when someone ticks it.
  - Google and LinkedIn sign-up then ask only for business name and province.
  - After sign-up, send the `verify-email` email and show `verify`.
- **Confirm email**
  - 6-digit code that works for 60 minutes. Pasting the whole code fills all six boxes.
  - "Send a new code" waits 30 seconds between sends.
  - When the email is confirmed, send `welcome` and start the profile set-up.
- **Log in**
  - After 5 wrong passwords, pause log-ins for 15 minutes and send `account-locked`.
  - When someone logs in from a new device, ask for an emailed 6-digit code (`signin-code`). A ticked "trust this device" skips the code for 30 days. Also send `new-signin`.
  - "Keep me logged in" lasts 30 days.
- **Forgot password**
  - Always show the same "Check your email" message, so the page never reveals whether an account exists.
  - Send `password-reset` if the account exists, or `reset-no-account` if it doesn't.
  - Allow at most 5 requests per hour for each email address and each IP address.
- **Choose a new password**
  - Reset links work for 60 minutes and only once. After that, show the expired state (`reset.html?expired=1`).
  - Password rules: 8 or more characters, at least one number, upper and lower case or a symbol, not a common password, and not containing the email name. On the server, also check the password against a breached-password list (for example, Have I Been Pwned's k-anonymity API).
  - The "log out on all other devices" box is ticked by default.
  - Send `password-changed` when the password is saved.
- **Change password (logged in)**
  - The member must enter their current password first.
  - The page also shows active sessions (each with a Log out button), Google and LinkedIn links, and the email-code setting.
- Store passwords with a slow hash: Argon2id, or bcrypt with a cost of 12 or more.

## How to send

1. **Host the assets** on a public HTTPS URL, for example `https://smehub.ca/email-assets/`, and pass it as `assets_url`. Use no trailing slash; the templates add `/logo.png`.
2. **Render with Handlebars** (works as-is in Postmark, SendGrid dynamic templates, Mailgun or `handlebars` in Node):
   - Plain variables use double braces: `{{first_name}}`.
   - Lists use `{{#each people}}…{{/each}}`. Each item needs the fields in the catalogue's `list_fields`, for example `name`, `role`, `why`, `photo_url` and `url`.
   - The review email's star row uses triple braces: `{{{stars_html}}}`. Send a string such as `★★★★★` or `★★★★<span style="color:#D4D4D8">★</span>`.
   - `welcome_faces` is a list of `{photo_url}` objects for 6 member photos.
3. **Variables every email uses:**
   - `hub_url`, `help_url`, `privacy_url`, `assets_url`, `first_name`
   - Notification and digest emails also use `preferences_url`, `unsubscribe_url` and `reason`.
4. **Send multipart**: the HTML from `templates/` plus the text from `text/`.
5. **Subject and preview text** are in `emails.json` and also contain variables.
6. **Avatars:** send square member photos at least 104 × 104 pixels (shown at 40 to 52 pixels).

## Senders to set up

Use these addresses. Set up SPF, DKIM and DMARC for smehub.ca first.

| Sender | Used for |
|---|---|
| `SME Hub <hello@smehub.ca>` | Welcome, community, network, digests, events. Reply-to: support@smehub.ca |
| `SME Hub Security <security@smehub.ca>` | Password reset, password changed, new sign-in, email changed |
| `SME Hub Billing <billing@smehub.ca>` | Receipts, failed payments, renewals, cancellations |
| `SME Hub Business <business@smehub.ca>` | Business page reviews, approvals, quote requests, reviews |
| `SME Hub Community Team <community@smehub.ca>` | Group approvals, blog approvals, report outcomes, content removal, internal Hub team alerts |

## Rules

- **Types** (in `emails.json`):
  - **Security**, **Account** and **Billing** emails are always sent. They have no unsubscribe link.
  - **Notification**, **Digest** and **Business** emails must honour the member's email preferences. Their footer links to `preferences_url` and a one-click `unsubscribe_url`.
- **Canada's anti-spam law (CASL):** every email shows the sender's mailing address in the footer.
  - Digests and re-engagement emails count as commercial, so the unsubscribe link must work and requests must be honoured within 10 business days.
  - Add `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers to Notification, Digest and Business emails.
- **Frequency limits** (from the "trigger" column):
  - **New message:** send only if the message is still unread after 15 minutes.
  - **Post activity:** group activity into one email per hour at most.
  - **We miss you:** send after 30 days of no visits, at most once every 60 days.
  - **Digests:** send at 8 am in the member's own time zone.
- **Times:** show times in the member's time zone and include the zone name, for example "ET".
- **Prices:**
  - Show prices in Canadian dollars.
  - Show the tax line for the member's province (HST, GST or GST + PST/QST).
  - Put CanadianSME's GST/HST registration number on receipts. The preview shows "[Your GST/HST number]" as a placeholder.
- **Security emails** use the `device`, `location` and `ip` variables. Mask the last two parts of the IP address.

## Email client support

- Built with tables and inline styles, 600 px wide, with a phone layout below 620 px. Tested by rendering in Chrome at 680 px and 375 px.
- Outlook for Windows gets "bulletproof" VML buttons.
- Inter and Plus Jakarta Sans load where supported (Apple Mail, iOS). Other clients use Segoe UI, Helvetica or Arial.
- Light colour scheme declared. Gmail's dark mode may still invert colours; the design stays readable when that happens.
- Largest email is about 14 KB, well under Gmail's 102 KB clipping limit.
- Before launch, check the key emails (welcome, password reset, receipt, weekly digest) in Litmus or Email on Acid, especially Outlook 2016 to 2021 and Gmail on Android.

## To do before launch

- [ ] Put CanadianSME’s GST/HST number in the billing settings (`gst_no`). It prints on every receipt automatically. It’s on any CRA notice or past invoice.
- [ ] Set up the sender addresses with SPF, DKIM and DMARC.
- [ ] Connect every `*_url` variable to real links. Use signed, expiring links for reset, verify, export and one-click unsubscribe.
- [ ] Remove the dark Preview bar and the preview tips from the pages.

## Added Nov 22, 2026: 24 more emails

Activity (mentions, replies, followers, popular post, poll results), milestones (badges, connection milestones, anniversary), a day-3 and day-7 welcome series, group digests and organiser alerts, cancelled events and recordings, monthly business summaries, card-expiring and offer-ending reminders, two internal Hub team alerts, and two legal notices.

Rules for the new ones:
- Activity emails (mention, reply, follower) are grouped: at most one email an hour per type, followers once a day.
- Welcome day 3 and day 7 are skipped if the member has already done the steps they suggest, and stop if the member turns off tips.
- Hub team emails go only to staff accounts with the admin role, never to members.
- "Terms or privacy policy updated" must go out at least 30 days before the change takes effect.
- "Security incident notice" is sent only if there's a real risk of significant harm (PIPEDA rule). Have a lawyer approve the wording and report to the Office of the Privacy Commissioner first. Legal notices go to every member, even if they've turned off other emails.
- Set up privacy@smehub.ca as an inbox; the legal emails point members to it.

## Conditional parts (added in the Nov 22 review)

Some emails show a block only when a true/false variable is set (`{{#if name}}…{{/if}}`):
- `founding_member`: true if this member is one of the first 500. Shows the Founding Member note in Welcome and Anniversary.
- `founding_open`: true while fewer than 500 members have joined. Shows the "first 500 get a badge" line in the member invitation. Hide the same line on the Sign up page once 500 is reached.

Business page limit: Free members can own 1 business page; Plus and Advisor members up to 3 (the number is set in Team → Business Profiles).

## Added Nov 22, 2026: 9 Courses emails

Course enrolment, course purchase receipt, new lesson open, pick up where you left off, assignment feedback ready, course completed, new assignment to grade (instructors), your course is live (instructors), and a publish request to the Hub team.

Rules:
- "Pick up where you left off" goes after 7 days without opening an unfinished course, at most twice per course, and stops when the course is finished.
- "New assignment to grade" is grouped into one email a day per instructor.
- The course receipt is a billing email (always sent) and needs the GST/HST number like the plan receipt.
- Refund policy used in the receipt (change it if you want a different one): full refund within 14 days if less than a quarter of the course is complete.

## Added Nov 22, 2026: profile reminders and Member Spotlight

The single "Finish your profile" email is replaced by 3 short reminders, each asking for one missing thing, plus a Member Spotlight email.

A profile is **ready** when it has all 5: a photo, a headline (role and business), a city, at least one "Can help with" tag and a business page. `ready_count` is how many of the 5 the member has.

| Email | When | Skip it if |
|---|---|---|
| `profile-photo` | Day 2 after joining | The member already has a photo |
| `profile-business` | Day 5 after joining | The member already has a business page (draft or published) |
| `profile-viewers` | Day 12 after joining | The profile is already ready |
| `spotlight-chosen` | When the Hub team chooses a Spotlight application | — |

Rules:
- Stop all profile reminders the moment the profile is ready. Never send more than these 3, and never more than one a day.
- They're digest emails, so members can turn them off.
- `profile-business`: set `has_draft` true if AI already drafted a business page from the member's website at sign-up (fill the `draft_*` variables); otherwise set `no_draft` true.
- `profile-viewers`: each `*_status` variable is either "✓ " plus the value, or "Not added yet". Send only if at least 2 members viewed the profile; otherwise skip it.
- `search_count` is the real number of Directory searches near the member's city that matched their category in the last 7 days. If it's under 2, leave out the first sentence rather than showing a tiny number.
- Sign up page: the new "Business website or Google listing" field is optional. After the member confirms their email, open the AI setup screen with the website already filled in. If they left it blank, show the 3 quick questions instead.
