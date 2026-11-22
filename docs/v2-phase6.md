# Phase 6: plans and billing

## What is built
- **Plans**: Free, Plus ($19 a month or $190 a year) and Advisor ($1,990 a year). Limits live in the `plan_limits` table and are enforced by the database (`can()`, `limit_for()`); the Plans page reads the same table, so the page and the rules cannot disagree.
- **Founding Member badge**: first 500 real members, numbered by a counter row that is locked while it counts (done in phase 0, tested there).
- **Checkout**: the Upgrade button creates a Stripe Checkout session (`app/(hub)/billing-actions.ts`). A member who already pays is sent to the billing portal to change plan, so nobody is charged twice.
- **Billing page** (`/billing`): plan, renewal or end date, late-payment notice, limits, Founding number, Manage billing (Stripe portal for card, invoices, change, cancel).
- **Webhook** (`/api/stripe/webhook`): checks Stripe's signature on the raw body, then calls `apply_subscription`.
- **Team → Billing**: subscriptions, recent events, and whether Stripe is connected.

## How the webhook stays safe
`apply_subscription` (migration 0026, callable only by the server's service role):
- handles each Stripe event id once (a repeat returns `duplicate`);
- ignores an event older than the one already applied (`stale`), so out-of-order delivery cannot undo a newer state;
- ignores the end of an old subscription once a newer one exists;
- keeps the plan while a payment is only late (`past_due`), changes nothing for a half-finished checkout (`incomplete`), and returns the member to Free when cancelled or unpaid.
A database error returns 500, so Stripe retries.

## Downgrade rules
Nothing is deleted. When a plan drops, private groups above the new limit are archived (the oldest are kept): readable, no new posts. An archived private group cannot be restored while the member is at their limit. Offers already posted stay; new ones follow the new limit.

## Settings to add (server only: AWS Amplify environment variables)
| Name | Where from |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (secret key) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → the endpoint's signing secret |
| `STRIPE_PRICE_PLUS_MONTHLY` | price id of Plus, monthly, CAD 19 |
| `STRIPE_PRICE_PLUS_YEARLY` | price id of Plus, yearly, CAD 190 |
| `STRIPE_PRICE_ADVISOR_YEARLY` | price id of Advisor, yearly, CAD 1,990 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project settings → API (service role). Server only, used only by the webhook |

In Stripe: create the three prices; add a webhook endpoint `https://<site>/api/stripe/webhook` listening to `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`; turn on the Customer portal (allow cancel, card update, plan change between the prices).
Until the settings exist, Upgrade shows "Online checkout is being set up" and the webhook answers 503. Nothing else breaks.

## Tests
- Database: duplicate, out-of-order, old-subscription end, late payment, incomplete checkout, cancel, downgrade archiving, restore blocked over the limit, members cannot call the function or write billing tables.
- Unit: price-to-plan mapping and event translation (`tests/unit/billing.test.ts`).
- Browser: plans page (yearly/monthly, limits table, downgrade rules), billing page, webhook closed without keys.
- Not yet run: a real Stripe test-mode purchase. Do this once the keys are in (card 4242 4242 4242 4242), and with the Stripe CLI (`stripe trigger customer.subscription.updated`).
