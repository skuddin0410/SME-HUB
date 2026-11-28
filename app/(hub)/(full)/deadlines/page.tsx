import Link from "next/link";
import { getMyDeadlines } from "@/lib/deadlines-server";
import { DeadlinesPage } from "@/components/tools/deadlines";
import { Ic } from "@/components/zip/ic";
import "@/styles/province.css";
import "@/styles/tools.css";
import "@/styles/u31-40.css";
import { MapleStrip } from "@/components/maple/dock";

export const metadata = { title: "My deadlines", robots: { index: false } };
export const dynamic = "force-dynamic";

/** My deadlines (Update 13, redesigned in Update 38): private to the member, never on the profile. */
export default async function Page({ searchParams }: { searchParams: Promise<{ prov?: string }> }) {
  const [{ prov }, D] = await Promise.all([searchParams, getMyDeadlines()]);
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <MapleStrip page="deadlines" />
      {D ? (
        <DeadlinesPage today={D.today} setup={D.setup} done={D.done} rem={D.rem} custom={D.custom} prov={prov && /^[A-Z]{2}$/.test(prov) ? prov : undefined} />
      ) : (
        <div className="dxpage">
          <div className="dxjoin">
            <p className="dxeye"><Ic n="cal2" s={13} /> My deadlines</p>
            <h1>Never pay a late penalty again</h1>
            <p>Answer five questions and get your GST/HST, payroll and income tax dates for the year, with reminders by email. Free for every member.</p>
            <Link className="btn dark" href="/auth/sign-up?next=/deadlines">Join free</Link>
          </div>
        </div>
      )}
    </div></div>
  );
}
