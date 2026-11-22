import { requireStaff } from "@/lib/hub";
import { billingConfigured } from "@/lib/stripe";

type Sub = { user_id: string; plan: string; billing_interval: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean; profile: { full_name: string | null } | null };
type Ev = { id: string; type: string; outcome: string; received_at: string };

export default async function AdminBilling() {
  const { supabase } = await requireStaff();
  const [{ data: subs }, { data: events }] = await Promise.all([
    supabase.from("subscriptions").select("user_id, plan, billing_interval, status, current_period_end, cancel_at_period_end, profile:profiles!subscriptions_user_id_fkey(full_name)").order("updated_at", { ascending: false }),
    supabase.from("billing_events").select("id, type, outcome, received_at").order("received_at", { ascending: false }).limit(25),
  ]);
  const ready = billingConfigured() && !!process.env.STRIPE_WEBHOOK_SECRET && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const d = (v: string) => new Date(v).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p role="status" className={`panel px-4 py-3 text-sm ${ready ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
        {ready ? "Stripe is connected. Checkout and the webhook are on." : "Stripe is not connected yet. Add the Stripe settings in AWS Amplify to turn on checkout (see docs/v2-phase6.md)."}
      </p>
      <section className="panel divide-y">
        <h2 className="px-4 py-3 text-base font-semibold">Subscriptions ({(subs ?? []).length})</h2>
        {(subs ?? []).length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">No paid members yet.</p>}
        {((subs ?? []) as unknown as Sub[]).map((s) => (
          <div key={s.user_id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
            <span className="font-semibold">{s.profile?.full_name ?? "Member"}</span>
            <span className="text-muted-foreground">
              {s.plan}, {s.billing_interval === "month" ? "monthly" : "yearly"}, {s.status}
              {s.current_period_end && `, ${s.cancel_at_period_end ? "ends" : "renews"} ${d(s.current_period_end)}`}
            </span>
          </div>
        ))}
      </section>
      <section className="panel divide-y">
        <h2 className="px-4 py-3 text-base font-semibold">Recent Stripe events</h2>
        {((events ?? []) as Ev[]).map((e) => (
          <div key={e.id} className="flex flex-wrap justify-between gap-2 px-4 py-2 text-xs">
            <span className="font-mono">{e.type}</span>
            <span className="text-muted-foreground">{e.outcome}, {d(e.received_at)}</span>
          </div>
        ))}
        {(events ?? []).length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">No events yet.</p>}
      </section>
    </>
  );
}
