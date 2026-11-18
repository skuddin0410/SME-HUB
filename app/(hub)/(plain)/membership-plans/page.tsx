import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/site";
import { getViewer } from "@/lib/hub";

export default async function PlansPage() {
  const { userId, profile } = await getViewer();
  const current = profile ? (profile.member_type === "owner" ? "free" : profile.member_type) : null;

  return (
    <>
      <div className="cover rounded-2xl p-7 text-white shadow-xl shadow-blue-900/20">
        <h1 className="text-3xl font-bold">Membership plans</h1>
        <p className="mt-2 max-w-xl text-white/85">
          Start free. Upgrade when you want a company page, a wider network and a louder voice in the community.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const featured = "featured" in plan && plan.featured;
          const mine = current === plan.key;
          return (
            <section key={plan.key} className={`panel lift relative flex flex-col p-6 ${featured ? "border-primary ring-1 ring-primary" : ""}`}>
              {featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">Most popular</span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
              <p className="mt-4">
                <span className="font-display text-4xl font-bold">{plan.monthly === 0 ? "Free" : `$${plan.monthly}`}</span>
                {plan.monthly > 0 && <span className="text-sm text-muted-foreground"> a month, or ${plan.yearly.toLocaleString("en-CA")} a year</span>}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              {mine ? (
                <p className="mt-6 rounded-lg bg-muted py-2.5 text-center text-sm font-semibold">Your current plan</p>
              ) : plan.monthly === 0 ? (
                !userId && (
                  <Link href="/auth/sign-up" className="press mt-6 block rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-white hover:bg-primary/90">
                    Sign up free
                  </Link>
                )
              ) : (
                <Link href="/contact" className="press mt-6 block rounded-lg border border-primary py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/5">
                  Contact us to upgrade
                </Link>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">Prices in Canadian dollars. Online checkout is on the way; until then our team sets up paid plans for you.</p>
    </>
  );
}
