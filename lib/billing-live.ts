import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * Update 34: what the Plan and billing page shows from Stripe: the card on file, the next payment (with tax) and
 * paid receipts. Read on the server with the secret key; nothing about the card except brand, last 4 digits and
 * expiry ever reaches the page. Every call is allowed to fail: the page then shows what it can.
 */
export type CardOnFile = { brand: string; last4: string; exp: string } | null;
export type NextPayment = { total: number; base: number; tax: number; taxLabel: string; date: string } | null;
export type Receipt = { id: string; date: string; what: string; total: number; status: string; pdf: string | null };
export type StripeView = { card: CardOnFile; next: NextPayment; receipts: Receipt[]; scheduledYearly: boolean };

const cents = (n: number | null | undefined) => Math.round(Number(n ?? 0)) / 100;
const day = (s: number) => new Date(s * 1000).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Toronto" });

export async function stripeView(customerId: string | null, subscriptionId: string | null): Promise<StripeView> {
  const empty: StripeView = { card: null, next: null, receipts: [], scheduledYearly: false };
  const stripe = getStripe();
  if (!stripe || !customerId) return empty;
  const [card, next, receipts, yearly] = await Promise.all([
    cardOf(stripe, customerId, subscriptionId).catch(() => null),
    subscriptionId ? nextOf(stripe, customerId, subscriptionId).catch(() => null) : Promise.resolve(null),
    receiptsOf(stripe, customerId).catch(() => []),
    subscriptionId ? scheduledYearly(stripe, subscriptionId).catch(() => false) : Promise.resolve(false),
  ]);
  return { card, next, receipts, scheduledYearly: yearly };
}

async function cardOf(stripe: Stripe, customerId: string, subscriptionId: string | null): Promise<CardOnFile> {
  let pmId: string | null = null;
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    pmId = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method?.id ?? null;
  }
  if (!pmId) {
    const c = await stripe.customers.retrieve(customerId);
    if (!("deleted" in c && c.deleted)) {
      const d = (c as Stripe.Customer).invoice_settings?.default_payment_method;
      pmId = typeof d === "string" ? d : d?.id ?? null;
    }
  }
  if (!pmId) {
    const list = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
    pmId = list.data[0]?.id ?? null;
  }
  if (!pmId) return null;
  const pm = await stripe.paymentMethods.retrieve(pmId);
  if (!pm.card) return null;
  const brand = pm.card.brand === "amex" ? "Amex" : pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
  return { brand, last4: pm.card.last4, exp: `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}` };
}

async function nextOf(stripe: Stripe, customerId: string, subscriptionId: string): Promise<NextPayment> {
  const inv = await stripe.invoices.createPreview({ customer: customerId, subscription: subscriptionId });
  const tax = (inv.total_taxes ?? []).reduce((n, t) => n + (t.amount ?? 0), 0);
  const rate = inv.total && tax ? Math.round((tax / (inv.total - tax)) * 1000) / 10 : 0;
  const when = inv.next_payment_attempt ?? inv.period_end ?? inv.created;
  return { total: cents(inv.total), base: cents(inv.total - tax), tax: cents(tax), taxLabel: rate ? `HST (${rate}%)` : "tax", date: day(when) };
}

async function receiptsOf(stripe: Stripe, customerId: string): Promise<Receipt[]> {
  const list = await stripe.invoices.list({ customer: customerId, limit: 24 });
  return list.data
    .filter((i) => i.status === "paid" && (i.total ?? 0) > 0)
    .map((i) => ({
      id: i.id ?? "",
      date: day(i.status_transitions?.paid_at ?? i.created),
      what: i.lines.data[0]?.description?.replace(/^\d+ × /, "").replace(/ \(at .*\)$/, "") ?? "SME Hub plan",
      total: cents(i.total),
      status: "Paid",
      pdf: i.invoice_pdf ?? null,
    }));
}

async function scheduledYearly(stripe: Stripe, subscriptionId: string): Promise<boolean> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const sid = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id;
  if (!sid) return false;
  const s = await stripe.subscriptionSchedules.retrieve(sid);
  return s.status === "active" && s.phases.length > 1;
}
