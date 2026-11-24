import Link from "next/link";
import { getMyDeadlines } from "@/lib/deadlines-server";
import { DeadlinesPage } from "@/components/tools/deadlines";
import "@/styles/province.css";
import "@/styles/tools.css";

export const metadata = { title: "My deadlines", robots: { index: false } };
export const dynamic = "force-dynamic";

/** My deadlines (Update 13): private to the member, never on the profile. */
export default async function Page({ searchParams }: { searchParams: Promise<{ prov?: string }> }) {
  const [{ prov }, D] = await Promise.all([searchParams, getMyDeadlines()]);
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      {D ? (
        <DeadlinesPage today={D.today} setup={D.setup} done={D.done} rem={D.rem} custom={D.custom} prov={prov && /^[A-Z]{2}$/.test(prov) ? prov : undefined} />
      ) : (
        <div className="card" style={{ maxWidth: 560, margin: "40px auto" }}>
          <h1 style={{ font: "800 22px var(--display)" }}>Never miss a tax deadline</h1>
          <p className="muted">Members add their GST/HST, payroll and income tax dates and get reminders before each one. Joining is free.</p>
          <Link className="btn" style={{ alignSelf: "flex-start" }} href="/auth/sign-up">Join free</Link>
        </div>
      )}
    </div></div>
  );
}
