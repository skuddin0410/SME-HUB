# Setup: account emails, secrets and deploys

Everything secret lives in **AWS Amplify**, **Supabase** or **GitHub secrets**. The repo holds no keys.
Do the steps in order; each takes a few minutes.

## What the code does

All 87 emails come from the catalogue in `emails/` (the CMS shows them under **Emails**). The ones the sign-in flow sends:

| Email | Sent from | Trigger |
| --- | --- | --- |
| Confirm your email (link and 6-digit code) | `hello@smehub.ca` | Sign up (Supabase calls our `/api/auth/send-email` hook) |
| Reset your SME Hub password | `security@smehub.ca` | Forgot password |
| Confirm / approve a new email address | `security@smehub.ca` | Changing email (two emails with secure change on) |
| Your password was changed | `security@smehub.ca` | After a new password is saved |
| Too many sign-in attempts | `security@smehub.ca` | 5 wrong passwords in a row: logging in is paused 15 minutes |
| Your sign-in code | `security@smehub.ca` | Logging in from a new device (see step 4) |
| Welcome to SME Hub | `hello@smehub.ca` | First confirmation, exactly once (database-enforced) |

Replies go to `support@smehub.ca`. Where a security email shows a device, it is read from the browser; the place is shown as "Not available" because we do not look up locations.

The email link opens `/auth/confirm`, which submits itself with a POST and signs the person in.
Mail scanners that pre-open links (Outlook Safe Links) only load the page, so they cannot use up the one-time token.

## 1. Resend (the sending service)

1. Create an account at resend.com and add the domain `smehub.ca` (region: North America).
2. Resend shows DNS records (an MX and a TXT on `send.smehub.ca`, and a DKIM TXT `resend._domainkey`). Add them in step 2, then press **Verify**.
3. API Keys > Create: name `smehub-production`, permission **Sending access**, domain `smehub.ca`. Copy it once; it goes into Amplify in step 4.

## 2. Cloudflare DNS for smehub.ca

1. DNS > Records: add every record Resend listed, **DNS only** (grey cloud), exactly as shown.
2. Add DMARC (start in report mode, tighten later):
   - Type `TXT`, Name `_dmarc`, Content `v=DMARC1; p=none; rua=mailto:info@smehub.ca; adkim=s; aspf=s`
3. A real inbox for `info@smehub.ca` without paying for one: Email > Email Routing > enable,
   then add a rule `info@smehub.ca` -> your existing inbox. Cloudflare adds its own MX and SPF on the root; that does not clash with Resend, which sends from `send.smehub.ca`.
4. After two weeks of clean DMARC reports, change `p=none` to `p=quarantine`.

## 3. Supabase (project kjxbjqcmtjopamxyojzs)

1. Authentication > URL Configuration
   - Site URL: `https://main.d392wpwuo9j5er.amplifyapp.com` (change to `https://smehub.ca` at launch)
   - Redirect URLs: `https://smehub.ca/**`, `https://main.d392wpwuo9j5er.amplifyapp.com/**`, `http://localhost:3000/**`
2. Authentication > Sign In / Providers > Email: **Confirm email** on, **Secure email change** on,
   **Email OTP expiration** `3600` (the emails say 1 hour), minimum password length `8`.
   Leaked password protection on (Pro plan).
3. Authentication > Hooks > Add hook > **Send Email hook** > HTTPS
   - URL: `https://main.d392wpwuo9j5er.amplifyapp.com/api/auth/send-email` (switch to smehub.ca at launch)
   - Press **Generate secret**. Copy it (`v1,whsec_...`); it goes into Amplify in step 4. Save and enable.
4. Authentication > Rate Limits: raise "emails sent per hour" to what you expect (for example 100).

The database change for the welcome email (migration `0009_welcome_emails`) is already applied.

## 4. AWS Amplify environment variables

App > Hosting > Environment variables > Manage, for branch `main`:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | the key from step 1 |
| `SEND_EMAIL_HOOK_SECRET` | the secret from step 3 |
| `NEXT_PUBLIC_SITE_URL` | leave empty until smehub.ca is live, then `https://smehub.ca` |
| `EMAIL_DOMAIN` | optional; defaults to `smehub.ca` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project settings > API (server only). With `RESEND_API_KEY` it switches on the **email code on new devices** step: until both are set, nobody is asked for a code, so nobody can be locked out |
| Supabase > Authentication > Providers > Email | set **Email OTP length** to 6 and **Email OTP expiration** to 3600 so the confirm-email code matches the page |

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` stay as they are.
The build writes these into the server bundle only; they never enter git.

## 5. Deploy only after tests pass

1. Amplify > App settings > Build settings > **Incoming webhooks** > Create webhook, name `github-ci`, branch `main`. Copy the URL.
2. GitHub repo > Settings > Secrets and variables > Actions > New repository secret:
   name `AMPLIFY_WEBHOOK_URL`, value the URL.
3. Amplify > App settings > Branch settings > `main` > Edit > turn **off** "Enable auto build".
   From now on Amplify builds only when GitHub Actions says every check passed.
4. Optional, recommended once you work through pull requests: GitHub > Settings > Branches > add a rule for `main`
   requiring the checks "Lint, types, unit tests, build", "Database security tests" and "Secret scan".

Pipeline on every push and pull request (`.github/workflows/ci.yml`):
lint -> type check -> unit tests (Vitest) -> production build, database security tests on a throwaway Postgres,
and a gitleaks secret scan over the whole history. A push to `main` deploys only when all three jobs pass.
Amplify also runs the unit tests itself before building, in case someone starts a build by hand.

## 6. Check it end to end

1. Join with a fresh address. The confirmation arrives from `SME Hub <hello@smehub.ca>`.
2. Click it: you land on the feed, signed in. The welcome email arrives from `hello@smehub.ca`.
3. Click the confirmation link again: "This link has expired or was already used". No second welcome.
4. Sign out, Forgot password, open the link, set a new password: you land on the feed,
   other sessions are signed out and "Your password was changed" arrives.
5. In Gmail, open a message > Show original: SPF, DKIM and DMARC should all say PASS.

## Local development

Copy `.env.example` to `.env.local`. Without `RESEND_API_KEY`, emails are printed to the terminal instead of sent.
Run all checks: `npm run check` (lint, types, unit tests) and `npm run test:db` (database tests, needs Postgres).
