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
export async function startCheckout(plan: "plus" | "advisor", interval: Interval) {
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

  const base = await origin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    ...(customer ? { customer: customer.stripe_customer_id as string } : { customer_email: (profile as { email?: string } | null)?.email }),
    subscription_data: { metadata: { user_id: userId } },
    allow_promotion_codes: true,
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
