"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/hub";
import { billingConfigured, getStripe } from "@/lib/stripe";
import { priceFor, type Interval } from "@/lib/billing";

async function origin() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/** Sends the member to Stripe Checkout for a plan. */
export async function startCheckout(plan: "plus" | "advisor", interval: Interval, founding = false) {
  const { supabase, userId, profile } = await requireUser();
  const stripe = getStripe();
  const price = priceFor(plan, interval, process.env);
  if (!stripe || !billingConfigured() || !price) redirect("/membership-plans?billing=unavailable");

  const [{ data: me }, { data: sub }, { data: customer }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    supabase.from("subscriptions").select("status").eq("user_id", userId).maybeSingle(),
    supabase.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (me?.plan === plan) redirect("/billing");
  // someone already paying changes plan in the billing portal, so they are never charged twice
  if (sub && ["active", "trialing", "past_due"].includes(sub.status as string) && customer) redirect("/billing?manage=1");

  // the founding price is a Stripe coupon, offered only on Plus yearly while places are left
  let coupon: string | undefined;
  if (founding) {
    const { data: left } = await supabase.rpc("founding_offer_left");
    coupon = process.env.STRIPE_COUPON_FOUNDING;
    if (plan !== "plus" || interval !== "year" || !coupon || !((left as number | null) ?? 0)) redirect("/membership-plans?billing=founding");
  }

  const base = await origin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    ...(customer ? { customer: customer.stripe_customer_id as string } : { customer_email: (profile as { email?: string } | null)?.email }),
    subscription_data: { metadata: { user_id: userId, ...(coupon ? { founding: "1" } : {}) } },
    ...(coupon ? { discounts: [{ coupon }] } : { allow_promotion_codes: true }),
    success_url: `${base}/billing?status=success`,
    cancel_url: `${base}/membership-plans?billing=cancelled`,
  });
  if (!session.url) redirect("/membership-plans?billing=unavailable");
  redirect(session.url);
}

/** Stripe's own page for cards, invoices, plan changes and cancelling. */
export async function openPortal() {
  const { supabase, userId } = await requireUser();
  const stripe = getStripe();
  if (!stripe) redirect("/billing?billing=unavailable");
  const { data: customer } = await supabase.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (!customer) redirect("/membership-plans");
  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id as string,
    return_url: `${await origin()}/billing`,
  });
  redirect(portal.url);
}

// ---------- Update 34: Plan and billing actions ----------
type Done = { ok: true } | { ok: false; error: string };
const NOT_SET = "Billing is being set up. Please try again soon.";

async function mySub() {
  const { supabase, userId } = await requireUser();
  const [{ data: sub }, { data: customer }] = await Promise.all([
    supabase.from("subscriptions").select("plan, billing_interval, status, stripe_subscription_id").eq("user_id", userId).maybeSingle(),
    supabase.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle(),
  ]);
  return { supabase, userId, sub: sub as { plan: "plus" | "advisor"; billing_interval: Interval; status: string; stripe_subscription_id: string } | null, customer: (customer?.stripe_customer_id as string | undefined) ?? null };
}

async function releaseSchedule(stripe: NonNullable<ReturnType<typeof getStripe>>, subId: string) {
  const s = await stripe.subscriptions.retrieve(subId);
  const sid = typeof s.schedule === "string" ? s.schedule : s.schedule?.id;
  if (sid) await stripe.subscriptionSchedules.release(sid);
}

/** Cancel at the end of the period already paid for. No refunds for part months; the plan stays until then. */
export async function cancelPlan(): Promise<Done> {
  const stripe = getStripe();
  const { sub } = await mySub();
  if (!stripe) return { ok: false, error: NOT_SET };
  if (!sub) return { ok: false, error: "You don’t have a paid plan to cancel." };
  try {
    await releaseSchedule(stripe, sub.stripe_subscription_id);
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not cancel right now. Please try again, or email billing@smehub.ca." };
  }
}

/** Undo a cancellation before the end date. */
export async function keepPlan(): Promise<Done> {
  const stripe = getStripe();
  const { sub } = await mySub();
  if (!stripe) return { ok: false, error: NOT_SET };
  if (!sub) return { ok: false, error: "You don’t have a paid plan." };
  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: false });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not change that right now. Please try again." };
  }
}

/** Plus monthly to yearly, at the next payment (never mid-month): a schedule with the yearly price as its second phase. */
export async function switchToYearly(): Promise<Done> {
  const stripe = getStripe();
  const { sub } = await mySub();
  const yearly = sub ? priceFor(sub.plan, "year", process.env) : undefined;
  if (!stripe || !yearly) return { ok: false, error: NOT_SET };
  if (!sub || sub.billing_interval !== "month") return { ok: false, error: "You’re already paying yearly." };
  try {
    const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    if (s.cancel_at_period_end) return { ok: false, error: "Keep your plan first, then switch to yearly." };
    const existing = typeof s.schedule === "string" ? s.schedule : s.schedule?.id;
    const sched = existing ? await stripe.subscriptionSchedules.retrieve(existing) : await stripe.subscriptionSchedules.create({ from_subscription: s.id });
    const cur = sched.phases[0];
    await stripe.subscriptionSchedules.update(sched.id, {
      end_behavior: "release",
      phases: [
        { items: cur.items.map((i) => ({ price: typeof i.price === "string" ? i.price : i.price.id, quantity: i.quantity ?? 1 })), start_date: cur.start_date, end_date: cur.end_date },
        { items: [{ price: yearly, quantity: 1 }], proration_behavior: "none" },
      ],
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not switch right now. Please try again." };
  }
}

/** Changed your mind: stay on monthly. */
export async function stayMonthly(): Promise<Done> {
  const stripe = getStripe();
  const { sub } = await mySub();
  if (!stripe || !sub) return { ok: false, error: NOT_SET };
  try {
    await releaseSchedule(stripe, sub.stripe_subscription_id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not change that right now. Please try again." };
  }
}

/** Update card: Stripe's own secure card form. SME Hub never sees the full card number. */
export async function updateCard() {
  const stripe = getStripe();
  const { customer } = await mySub();
  if (!stripe || !customer) redirect("/billing?billing=unavailable");
  const portal = await stripe.billingPortal.sessions.create({
    customer: customer!,
    return_url: `${await origin()}/billing`,
    flow_data: { type: "payment_method_update" },
  });
  redirect(portal.url);
}

/** Billing details for future receipts, kept here and copied to Stripe so its receipts show them. */
export async function saveBillingDetails(input: { business: string; address: string; email: string; tax: string }): Promise<Done> {
  const business = String(input.business ?? "").trim().slice(0, 120);
  const address = String(input.address ?? "").trim().slice(0, 200);
  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 254);
  const tax = String(input.tax ?? "").trim().toUpperCase().slice(0, 30);
  if (!business || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Please add a business name and a full email address" };
  if (tax && !/^[0-9A-Z \-]{9,30}$/.test(tax)) return { ok: false, error: "That GST/HST number doesn’t look right. It looks like 123456789 RT0001." };
  const { supabase, userId, customer } = await mySub();
  const { error } = await supabase.from("billing_details").upsert({ member_id: userId, business, address, receipt_email: email, tax_number: tax, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: /billing_details/.test(error.message) ? "Billing details are almost ready. Please try again later." : "Could not save. Try again." };
  const stripe = getStripe();
  if (stripe && customer) {
    await stripe.customers
      .update(customer, {
        name: business,
        email,
        address: address ? { line1: address, country: "CA" } : undefined,
        invoice_settings: { custom_fields: tax ? [{ name: "GST/HST number", value: tax }] : "" },
      })
      .catch(() => undefined);
  }
  return { ok: true };
}
