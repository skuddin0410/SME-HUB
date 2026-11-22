import Link from "next/link";
import { Crown } from "lucide-react";
import { requireUser } from "@/lib/hub";
import { Hero } from "@/components/content";
import { SubmitButton } from "@/components/hub-client";
import { openPortal } from "@/app/(hub)/billing-actions";
import { DOWNGRADE_RULES, LIMIT_ROWS, PLAN_INFO, type PlanKey } from "@/lib/billing";
import { billingConfigured } from "@/lib/stripe";
import { pageMeta } from "@/lib/seo";

export const metadata = { ...pageMeta({ title: "Plan and billing", description: "Your SMB Hub plan, renewal date and billing.", path: "/billing", index: false }) };

const STATUS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment late",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Waiting for payment",
  incomplete_expired: "Expired",
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string; manage?: string; billing?: string }> }) {
  const sp = await searchParams;
  const { supabase, userId } = await requireUser();
  const [{ data: me }, { data: sub }, { data: limits }, { data: customer }] = await Promise.all([
    supabase.from("profiles").select("plan, founding_number").eq("id", userId).maybeSingle(),
    supabase.from("subscriptions").select("plan, billing_interval, status, current_period_end, cancel_at_period_end").eq("user_id", userId).maybeSingle(),
    supabase.from("plan_limits").select("plan, key, value"),
    supabase.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle(),
  ]);
  const plan = ((me?.plan as PlanKey | undefined) ?? "free") as PlanKey;
  const info = PLAN_INFO[plan];
  const date = (d: string) => new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const limit = (key: string) => (limits ?? []).find((l) => l.plan === plan && l.key === key)?.value as number | null | undefined;

  return (
    <>
      <Hero eyebrow="Your account" title="Plan and billing" text="See your plan, when it renews, and manage your card and invoices." />
      {sp.status === "success" && (
        <p role="status" className="panel border-emerald-300 bg-emerald-50 px-4 py-3 text-sm">
          Thank you. Your payment went through. Your plan updates in a moment; refresh this page if it still shows Free.
        </p>
      )}
      {sp.manage && <p role="status" className="panel border-amber-300 bg-amber-50 px-4 py-3 text-sm">You already have a paid plan. Use Manage billing to change it, so you are never charged twice.</p>}
      {sp.billing === "unavailable" && <p role="status" className="panel border-amber-300 bg-amber-50 px-4 py-3 text-sm">Billing is being set up. Please check back soon.</p>}

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <h2 className="text-2xl font-bold">{info.name}</h2>
            {sub && (
              <p className="mt-1 text-sm text-muted-foreground">
                {STATUS[sub.status as string] ?? sub.status}, billed {sub.billing_interval === "month" ? "monthly" : "yearly"}
                {sub.current_period_end && ` · ${sub.cancel_at_period_end ? "ends" : "renews"} ${date(sub.current_period_end as string)}`}
              </p>
            )}
            {sub?.status === "past_due" && <p className="mt-1 text-sm text-rose-700">Your last payment did not go through. Update your card in Manage billing to keep your plan.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {customer && billingConfigured() && (
              <form action={openPortal}>
                <SubmitButton tone="outline">Manage billing</SubmitButton>
              </form>
            )}
            {plan !== "advisor" && (
              <Link href="/membership-plans" className="press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
                {plan === "free" ? "Upgrade" : "See plans"}
              </Link>
            )}
          </div>
        </div>
        {me?.founding_number && (
          <p className="mt-4 flex items-center gap-2 text-sm">
            <Crown className="h-4 w-4 text-amber-600" aria-hidden="true" /> Founding Member number {me.founding_number as number}. You keep this badge for good.
          </p>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="text-base font-semibold">What your plan allows</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {LIMIT_ROWS.map((row) => {
            const v = limit(row.key);
            return (
              <div key={row.key} className="flex justify-between gap-3 border-b py-1.5">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-semibold">{v === null ? "All" : v === 0 ? "Not included" : `${v}${row.unit ? ` ${row.unit}` : ""}`}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="panel p-5">
        <h2 className="text-base font-semibold">If you change or cancel your plan</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {DOWNGRADE_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
