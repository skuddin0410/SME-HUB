import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { loadLeads } from "@/lib/leads";
import { Crumbs } from "@/components/zip/crumbs";
import { LeadsView } from "@/components/zip/leads";
import "@/styles/leads.css";

export const metadata = { title: "My leads", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Update 30: My leads. Every enquiry from SME Hub in one place; private to the member and their business inbox team. */
export default async function Page() {
  const { supabase, userId, profile } = await getViewer();
  if (!userId) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div className="td ld"><section className="tdcard" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h1 style={{ font: "700 24px var(--display)", margin: "0 0 8px" }}>My leads</h1>
          <p className="muted">Join SME Hub to see everyone who contacts your business through the Hub, in one place.</p>
          <Link className="btn" href="/auth/sign-up">Join free</Link>
        </section></div>
      </div></div>
    );
  }
  const [leads, biz] = await Promise.all([
    loadLeads(supabase),
    supabase.from("companies").select("name").eq("owner_id", userId).order("created_at").limit(1).maybeSingle(),
  ]);
  const me = { first: (profile?.full_name ?? "").split(" ")[0] || "", business: (biz.data as { name?: string } | null)?.name ?? "" };
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="td ld">
        <Crumbs items={[["My Businesses", "/businesses/mine"], ["My leads"]]} note="Only you and your business team see this page" lock />
        {leads === null ? (
          <section className="tdcard" style={{ textAlign: "center", padding: "40px 20px" }}>
            <h1 style={{ font: "700 24px var(--display)", margin: "0 0 8px" }}>My leads is almost ready</h1>
            <p className="muted" style={{ margin: 0 }}>Everyone who contacts your business through SME Hub will appear here very soon.</p>
          </section>
        ) : (
          <LeadsView initial={leads} me={me} now={Date.now()} />
        )}
      </div>
    </div></div>
  );
}
