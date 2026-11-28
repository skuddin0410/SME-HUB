import { requireUser } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { FOUNDING, PLAN_INFO, type PlanKey } from "@/lib/billing";
import { billingConfigured } from "@/lib/stripe";
import { stripeView } from "@/lib/billing-live";
import { settingsSections } from "@/lib/settings-nav";
import { BillingX, type BlData, type BlUse } from "@/components/zip/billing-x";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = { ...pageMeta({ title: "Plan and billing", description: "Your SME Hub plan, receipts, card and billing details.", path: "/billing", index: false }) };
export const dynamic = "force-dynamic";

const NOTE: Record<string, string> = {
  success: "Thank you. Your payment went through. Your plan updates in a moment; refresh this page if it still shows Free.",
  manage: "You already have a paid plan. Change it here, so you are never charged twice.",
  unavailable: "Billing is being set up. Please check back soon.",
};

/** Update 34: Plan and billing (inside Settings and privacy). Follows the member's real plan. */
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string; manage?: string; billing?: string }> }) {
  const sp = await searchParams;
  const { supabase, userId } = await requireUser();
  const [me, sub, limits, customer, usage, details, auth, firstBiz, left] = await Promise.all([
    supabase.from("profiles").select("plan, founding_number, location, profile_type").eq("id", userId).maybeSingle(),
    supabase.from("subscriptions").select("plan, billing_interval, status, current_period_end, cancel_at_period_end, stripe_subscription_id, founding_offer").eq("user_id", userId).maybeSingle(),
    supabase.from("plan_limits").select("plan, key, value"),
    supabase.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle(),
    supabase.rpc("my_plan_usage"),
    supabase.from("billing_details").select("business, address, receipt_email, tax_number").eq("member_id", userId).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from("companies").select("name").eq("owner_id", userId).order("created_at").limit(1).maybeSingle(),
    supabase.rpc("founding_offer_left"),
  ]);
  const plan = (((me.data as { plan?: string } | null)?.plan as PlanKey) ?? "free") as PlanKey;
  const s = sub.data as { plan: string; billing_interval: "month" | "year"; status: string; current_period_end: string | null; cancel_at_period_end: boolean; stripe_subscription_id: string } | null;
  const live = s && ["active", "trialing", "past_due"].includes(s.status) ? s : null;
  const view = await stripeView((customer.data?.stripe_customer_id as string | undefined) ?? null, live?.stripe_subscription_id ?? null);
  const lim = (key: string) => ((limits.data ?? []) as { plan: string; key: string; value: number | null }[]).find((l) => l.plan === plan && l.key === key)?.value;
  const u = (usage.data ?? {}) as { ai?: number; pages?: number; offers?: number; groups?: number; calls?: number };
  const pages = plan === "free" ? 1 : 3;
  const viewers = lim("viewer_names");
  const rows: BlUse[] = [
    ["AI questions", u.ai ?? 0, lim("ai_per_month") ?? (plan === "free" ? 10 : 100)],
    ["Business pages", u.pages ?? 0, pages],
    (lim("offers_per_month") ?? 0) > 0 ? ["Offers to members", u.offers ?? 0, lim("offers_per_month")!] : ["Offers to members", null, "Plus"],
    (lim("private_groups") ?? 0) > 0 ? ["Private groups you host", u.groups ?? 0, lim("private_groups")!] : ["Private groups you host", null, "Plus"],
    plan === "advisor" ? ["Intro calls booked", String(u.calls ?? 0), ""] : ["Who viewed your profile", viewers == null ? "Everyone" : `Last ${viewers} viewers`, ""],
  ];
  const now = new Date();
  const resets = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const det = details.data as { business: string; address: string; receipt_email: string; tax_number: string } | null;
  const interval = live?.billing_interval ?? null;
  // Update 43: a Founding Member's Plus subscription keeps $19 or $190; everyone else pays $25 or $240
  const foundingPrice = plan === "plus" && !!(live as { founding_offer?: boolean } | null)?.founding_offer;
  const price = plan === "free" ? 0 : foundingPrice ? (interval === "year" ? FOUNDING.year : FOUNDING.month) : interval === "month" ? (PLAN_INFO[plan].month ?? 0) : PLAN_INFO[plan].year;
  const endsOn = live?.current_period_end ? new Date(live.current_period_end).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Toronto" }) : null;
  const d: BlData = {
    plan,
    interval: plan === "free" ? null : interval ?? (plan === "advisor" ? "year" : "month"),
    founding: (me.data as { founding_number?: number | null } | null)?.founding_number != null,
    price,
    cancelled: !!live?.cancel_at_period_end,
    endsOn,
    next: view.next,
    card: view.card,
    receipts: view.receipts,
    scheduledYearly: view.scheduledYearly,
    yearlySave: plan === "plus" ? (foundingPrice ? FOUNDING.month * 12 - FOUNDING.year : PLAN_INFO.plus.month * 12 - PLAN_INFO.plus.year) : null,
    foundingPrice,
    usage: rows,
    resets,
    details: {
      business: det?.business ?? ((firstBiz.data as { name?: string } | null)?.name ?? ""),
      address: det?.address ?? ((me.data as { location?: string } | null)?.location ?? ""),
      email: det?.receipt_email ?? auth.data.user?.email ?? "",
      tax: det?.tax_number ?? "",
    },
    foundingLeft: plan === "free" && ((left.data as number | null) ?? 0) > 0,
    configured: billingConfigured(),
    sections: settingsSections((me.data as { profile_type?: string } | null)?.profile_type === "advisor" || plan === "advisor"),
  };
  const note = sp.status === "success" ? NOTE.success : sp.manage ? NOTE.manage : sp.billing === "unavailable" ? NOTE.unavailable : null;
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        {note && <p role="status" className="warnbox" style={{ maxWidth: 1080, margin: "0 auto 12px" }}>{note}</p>}
        <BillingX d={d} />
      </div>
    </div>
  );
}
