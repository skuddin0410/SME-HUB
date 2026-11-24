import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { COMPARE, PLAN_FEATURES, PLAN_INFO, type PlanKey } from "@/lib/billing";
import { startCheckout } from "@/app/(hub)/billing-actions";
import { SubmitButton } from "@/components/hub-client";

export const metadata = pageMeta({ title: "Membership plans", description: "Join free. Upgrade when it pays for itself. Compare Free, Plus and Advisor on SME Hub. Prices in Canadian dollars.", path: "/membership-plans" });

const NOTES: Record<string, string> = {
  unavailable: "Online checkout is being set up. Please check back soon, or contact us and the team will set up your plan.",
  cancelled: "Checkout was cancelled. You were not charged.",
  founding: "The Founding Member price is not available right now. You can still upgrade at the regular price.",
};

const FAQ = [
  ["Is the free plan really free?", "Yes. There is no trial period, no card and no limit on connections. You can stay on Free for as long as you like."],
  ["Can I change or cancel my plan?", "Yes. You can move up, move down or cancel at any time. If you cancel, you keep your profile and go back to the Free plan."],
  ["How do I pay?", "By card, online, through Stripe. We never see your card number."],
  ["What is the Founding Member offer?", "The first 250 members who upgrade get Plus for $99 in their first year, then the regular price. The Founding Member badge stays on your profile."],
];

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ interval?: string; billing?: string }> }) {
  const sp = await searchParams;
  const yearly = sp.interval === "year";
  const { supabase, userId } = await getViewer();
  const [{ data: me }, { data: left }] = await Promise.all([
    userId ? supabase.from("profiles").select("plan").eq("id", userId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("founding_offer_left"),
  ]);
  const current = ((me?.plan as PlanKey | undefined) ?? (userId ? "free" : null)) as PlanKey | null;
  const foundingOpen = ((left as number | null) ?? 250) > 0;

  const upgrade = (plan: "plus" | "advisor", label: string, dark = false, founding = false) =>
    userId ? (
      <form action={async () => { "use server"; await startCheckout(plan, plan === "advisor" ? "year" : yearly || founding ? "year" : "month", founding); }}>
        <SubmitButton tone={dark ? "dark" : "primary"} className="min-h-11 w-full justify-center">{label}</SubmitButton>
      </form>
    ) : (
      <Link href="/auth/sign-up" className={`press flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white ${dark ? "bg-zinc-900" : "bg-primary"}`}>
        {label}
      </Link>
    );

  const cards: { key: PlanKey; hot?: boolean; amt: React.ReactNode; sub: string; button: React.ReactNode }[] = [
    {
      key: "free",
      amt: "$0",
      sub: "No card needed",
      button: userId ? (
        <button type="button" disabled className="min-h-11 w-full rounded-xl border px-4 text-sm font-semibold text-muted-foreground">Included</button>
      ) : (
        <Link href="/auth/sign-up" className="press flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold hover:bg-muted">Join free</Link>
      ),
    },
    { key: "plus", hot: true, amt: <>{yearly ? "$190" : "$19"} <small className="text-[0.9375rem] font-medium tracking-normal text-muted-foreground">{yearly ? "a year" : "a month"}</small></>, sub: yearly ? "Works out to under $16 a month" : "Or $190 a year, 2 months free", button: upgrade("plus", "Upgrade to Plus") },
    { key: "advisor", amt: <>$1,990 <small className="text-[0.9375rem] font-medium tracking-normal text-muted-foreground">a year</small></>, sub: "Billed yearly", button: upgrade("advisor", "Apply as an Advisor", true) },
  ];
  const cell = (v: string | 0 | 1) => (v === 1 ? <span className="font-extrabold text-green-700" role="img" aria-label="Included">✓</span> : v === 0 ? <span className="text-zinc-400" role="img" aria-label="Not included">—</span> : v);

  return (
    <div className="mx-auto w-full max-w-[76rem] flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-2.5 pb-6 pt-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">Membership</p>
        <h1 className="max-w-[20ch] font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-[1.08] tracking-tight">Join free. Upgrade when it pays for itself.</h1>
        <p className="max-w-[60ch] text-base text-muted-foreground">Every owner gets a full free membership, with no time limit. Paid plans add reach: more people see your business, your offers and your expertise.</p>
        <div role="group" aria-label="Billing" className="mt-1.5 inline-flex gap-0.5 rounded-full border bg-card p-1">
          <Link href="/membership-plans" aria-current={!yearly ? "true" : undefined} className={`rounded-full px-[1.125rem] py-2 text-[0.84375rem] font-semibold ${!yearly ? "bg-zinc-900 text-white" : ""}`}>Pay monthly</Link>
          <Link href="/membership-plans?interval=year" aria-current={yearly ? "true" : undefined} className={`flex items-center gap-2 rounded-full px-[1.125rem] py-2 text-[0.84375rem] font-semibold ${yearly ? "bg-zinc-900 text-white" : ""}`}>
            Pay yearly <span className="rounded-full bg-green-100 px-2 text-[0.6875rem] font-bold text-green-800">2 months free</span>
          </Link>
        </div>
      </div>
      {sp.billing && NOTES[sp.billing] && <p role="status" className="panel mb-4 border-amber-300 bg-amber-50 px-4 py-3 text-sm">{NOTES[sp.billing]}</p>}

      <div className="grid items-stretch gap-[1.375rem] [grid-template-columns:repeat(auto-fit,minmax(min(18.75rem,100%),1fr))]">
        {cards.map((c) => {
          const info = PLAN_INFO[c.key];
          const mine = current === c.key;
          return (
            <section key={c.key} className={`relative flex flex-col gap-3.5 rounded-[1.25rem] bg-card p-7 ${c.hot ? "border-2 border-primary shadow-[0_1.125rem_2.5rem_-1.125rem_rgba(37,99,235,.45)]" : "border"}`}>
              {c.hot && <span className="absolute -top-[0.8125rem] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3.5 py-1 text-[0.71875rem] font-bold uppercase tracking-wider text-white">Most popular</span>}
              {mine && <span className="self-start rounded-full border bg-muted px-2.5 py-0.5 text-[0.6875rem] font-bold">Your current plan</span>}
              <h2 className="font-display text-[1.375rem] font-extrabold">{info.name}</h2>
              <p className="min-h-10 text-sm text-muted-foreground">{info.forWho}</p>
              <p className="font-display text-[2.75rem] font-extrabold leading-none tracking-tight">{c.amt}</p>
              <p className="min-h-[1.125rem] text-[0.78125rem] text-muted-foreground">{c.sub}</p>
              {mine ? <button type="button" disabled className="min-h-11 w-full rounded-xl border px-4 text-sm font-semibold text-muted-foreground">You are on this plan</button> : c.button}
              <ul className="mt-1.5 flex flex-1 list-none flex-col gap-2.5 p-0">
                {PLAN_FEATURES[c.key].map((f) =>
                  f.startsWith("=") ? (
                    <li key={f} className="text-sm font-bold">{f.slice(1)}</li>
                  ) : (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug">
                      <span aria-hidden="true" className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-100 text-xs font-extrabold text-green-800">✓</span>
                      {f}
                    </li>
                  ),
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {foundingOpen && (
        <div className="mt-7 flex flex-wrap items-center gap-4 rounded-[1.125rem] bg-gradient-to-br from-amber-100 to-amber-200 px-6 py-5 text-amber-950">
          <span className="text-3xl" aria-hidden="true">⭐</span>
          <div className="flex min-w-0 flex-1 basis-[17rem] flex-col gap-0.5">
            <strong className="font-display text-lg font-extrabold">Founding Member offer: Plus for $99 in year one</strong>
            <span className="text-sm">For the first 250 members who upgrade. You keep the Founding Member badge for good.</span>
          </div>
          {mine(current, "plus") ? null : upgrade("plus", "Claim the founding price", true, true)}
        </div>
      )}

      <h2 className="mb-5 mt-16 text-center font-display text-[clamp(1.375rem,2.6vw,1.75rem)] font-extrabold">Compare the plans</h2>
      <div tabIndex={0} role="region" aria-label="Plan comparison" className="overflow-x-auto rounded-[1.125rem] border bg-card">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <colgroup><col /><col /><col className="bg-blue-600/5" /><col /></colgroup>
          <thead>
            <tr>
              <th scope="col" className="border-b p-3.5"><span className="sr-only">Feature</span></th>
              {(["free", "plus", "advisor"] as const).map((k) => (
                <th key={k} scope="col" className="border-b p-3.5 text-center font-display text-[0.9375rem] font-bold">{PLAN_INFO[k].name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((r) =>
              r[0] === "g" ? (
                <tr key={r[1]} className="bg-muted/60">
                  <th scope="colgroup" colSpan={4} className="border-b p-3.5 text-left text-[0.71875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">{r[1]}</th>
                </tr>
              ) : (
                <tr key={r[0]}>
                  <th scope="row" className="border-b p-3.5 text-left font-medium">{r[0]}</th>
                  <td className="border-b p-3.5 text-center">{cell(r[1])}</td>
                  <td className="border-b p-3.5 text-center">{cell(r[2] as string | 0 | 1)}</td>
                  <td className="border-b p-3.5 text-center">{cell(r[3] as string | 0 | 1)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-5 mt-16 text-center font-display text-[clamp(1.375rem,2.6vw,1.75rem)] font-extrabold">Which plan fits you?</h2>
      <div className="grid gap-[1.125rem] [grid-template-columns:repeat(auto-fit,minmax(min(17.5rem,100%),1fr))]">
        {[
          ["Stay on Free if…", "You mainly want answers, contacts and ideas from other owners. Most members never need to pay.", false],
          ["Choose Plus if…", "Other owners could be your customers, and you want your business and your offers in front of them.", true],
          ["Choose Advisor if…", "Small businesses are your clients. One new client a year usually covers the fee.", false],
        ].map(([t, d, hot]) => (
          <div key={t as string} className={`panel p-5 ${hot ? "border-primary" : ""}`}>
            <strong className="font-display text-base font-bold">{t as string}</strong>
            <p className="mt-1 text-sm text-muted-foreground">{d as string}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-5 mt-16 text-center font-display text-[clamp(1.375rem,2.6vw,1.75rem)] font-extrabold">Questions owners ask</h2>
      <div className="mx-auto max-w-[47.5rem]">
        {FAQ.map(([q, a]) => (
          <details key={q} className="border-b py-3">
            <summary className="cursor-pointer text-[0.9375rem] font-semibold">{q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
        <p className="mt-3.5 border-t pt-3.5 text-xs text-muted-foreground">Prices in Canadian dollars, before HST.</p>
      </div>

      <div className="mt-14 flex flex-wrap items-center gap-4 rounded-2xl bg-zinc-900 p-7 text-white">
        <div className="flex min-w-0 flex-1 basis-[17rem] flex-col gap-1.5">
          <h2 className="text-lg font-bold">Does your company sell to small businesses?</h2>
          <p>Partner plans start at $5,000 a year and include event and magazine exposure.</p>
        </div>
        <Link href="/contact" className="press rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900">Talk to our team</Link>
      </div>
    </div>
  );
}

function mine(current: PlanKey | null, plan: PlanKey) {
  return current === plan;
}
