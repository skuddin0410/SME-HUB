import { Hero } from "@/components/content";
import Link from "next/link";
import { Check, Crown } from "lucide-react";
import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { DOWNGRADE_RULES, LIMIT_ROWS, PLAN_FEATURES, PLAN_INFO, money, type Interval, type PlanKey } from "@/lib/billing";
import { startCheckout } from "@/app/(hub)/billing-actions";
import { SubmitButton } from "@/components/hub-client";

export const metadata = pageMeta({ title: "Membership plans", description: "Compare SMB Hub plans: Free, Plus and Advisor. Prices in Canadian dollars.", path: "/membership-plans" });

const NOTES: Record<string, string> = {
  unavailable: "Online checkout is being set up. Please check back soon, or contact us and the team will set up your plan.",
  cancelled: "Checkout was cancelled. You were not charged.",
};

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ interval?: string; billing?: string }> }) {
  const sp = await searchParams;
  const interval: Interval = sp.interval === "month" ? "month" : "year";
  const { supabase, userId } = await getViewer();
  const [{ data: me }, { data: limits }] = await Promise.all([
    userId ? supabase.from("profiles").select("plan").eq("id", userId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("plan_limits").select("plan, key, value"),
  ]);
  const current = ((me?.plan as PlanKey | undefined) ?? (userId ? "free" : null)) as PlanKey | null;
  const limitOf = (plan: string, key: string) => (limits ?? []).find((l) => l.plan === plan && l.key === key)?.value as number | null | undefined;
  const cell = (plan: string, row: (typeof LIMIT_ROWS)[number]) => {
    const v = limitOf(plan, row.key);
    if (v === undefined) return "";
    if (v === null) return "All";
    if (v === 0) return "Not included";
    return `${v}${row.unit ? ` ${row.unit}` : ""}`;
  };
  const plans: PlanKey[] = ["free", "plus", "advisor"];

  return (
    <>
      <Hero eyebrow="Start free, upgrade any time" title="Membership plans" text="Start free. Upgrade when you want a bigger network, your own private groups and more reach." />
      {sp.billing && NOTES[sp.billing] && <p role="status" className="panel border-amber-300 bg-amber-50 px-4 py-3 text-sm">{NOTES[sp.billing]}</p>}

      <div className="flex items-center justify-center gap-2" role="group" aria-label="Billing period">
        {(["month", "year"] as const).map((i) => (
          <Link key={i} href={`/membership-plans?interval=${i}`} aria-current={interval === i ? "true" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${interval === i ? "bg-primary text-white" : "border text-muted-foreground hover:bg-muted"}`}>
            {i === "month" ? "Monthly" : "Yearly"}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((key) => {
          const info = PLAN_INFO[key];
          const mine = current === key;
          const featured = key === "plus";
          const price = interval === "month" ? info.month : info.year;
          const unavailable = key === "advisor" && interval === "month";
          return (
            <section key={key} className={`panel lift relative flex flex-col p-6 ${featured ? "border-primary ring-1 ring-primary" : ""}`}>
              {featured && <span className="absolute -top-3 left-6 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
              <h2 className="text-xl font-bold">{info.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{info.blurb}</p>
              <p className="mt-4">
                {key === "free" ? (
                  <span className="font-display text-4xl font-bold">$0</span>
                ) : unavailable ? (
                  <span className="font-display text-4xl font-bold">{money(1990)}</span>
                ) : (
                  <span className="font-display text-4xl font-bold">{money(price as number)}</span>
                )}
                <span className="text-sm text-muted-foreground">{key === "free" ? " forever" : unavailable || interval === "year" ? " a year" : " a month"}</span>
              </p>
              {key === "plus" && interval === "year" && <p className="text-xs text-emerald-700">Two months free compared with paying monthly.</p>}
              {unavailable && <p className="text-xs text-muted-foreground">Advisor is billed yearly.</p>}
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {PLAN_FEATURES[key].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              {mine ? (
                <p className="mt-6 rounded-lg bg-muted py-2.5 text-center text-sm font-semibold">Your current plan</p>
              ) : key === "free" ? (
                !userId && (
                  <Link href="/auth/sign-up" className="press mt-6 block rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-white hover:bg-primary/90">
                    Sign up free
                  </Link>
                )
              ) : userId ? (
                <form action={startCheckout.bind(null, key, unavailable ? "year" : interval)} className="mt-6">
                  <SubmitButton className="w-full justify-center">{current === "advisor" ? "Switch to Plus" : `Upgrade to ${info.name}`}</SubmitButton>
                </form>
              ) : (
                <Link href="/auth/sign-up" className="press mt-6 block rounded-lg border border-primary py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/5">
                  Sign up to upgrade
                </Link>
              )}
            </section>
          );
        })}
      </div>

      <section className="panel flex items-start gap-3 border-amber-200 bg-amber-50/60 p-5">
        <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold">Founding Member</h2>
          <p className="text-sm text-muted-foreground">The first 500 members keep a Founding Member badge for good, whatever plan they are on.</p>
        </div>
      </section>

      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="px-4 py-3 text-left text-base font-semibold">What each plan allows</caption>
          <thead>
            <tr className="border-t text-left">
              <th scope="col" className="px-4 py-2 font-semibold">Limit</th>
              {plans.map((p) => (
                <th key={p} scope="col" className="px-4 py-2 font-semibold">{PLAN_INFO[p].name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIMIT_ROWS.map((row) => (
              <tr key={row.key} className="border-t">
                <th scope="row" className="px-4 py-2 text-left font-normal">{row.label}</th>
                {plans.map((p) => (
                  <td key={p} className="px-4 py-2">{cell(p, row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel p-5">
        <h2 className="text-base font-semibold">If you change or cancel your plan</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {DOWNGRADE_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <p className="text-center text-xs text-muted-foreground">Prices are in Canadian dollars. Payments are handled by Stripe; we never see your card.</p>
    </>
  );
}
