import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { canHostEvents } from "@/lib/events-load";
import { HostEventForm, HostUpsell } from "@/components/zip/host-event";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = { title: "Host an event", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Update 37: Host an event (SME Advisors only; the database checks the plan too). */
export default async function Page() {
  const { supabase, userId } = await getViewer();
  const can = await canHostEvents(supabase, userId);
  const apps = can ? ((await supabase.rpc("my_apps")).data as { zoom?: { email: string; type: number } | null } | null) : null;
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="evpage evform">
          <Link className="evback" href="/events">← All events</Link>
          <div className="evhead">
            <div>
              <h1>Host an event</h1>
              <p className="muted">Your event goes live on Hub Events as soon as you publish it. Members who save it get reminders.</p>
            </div>
          </div>
          {!userId ? (
            <div className="evempty"><b>Join to host events</b><Link className="btn sm dark" href="/auth/sign-up?next=/events/host">Join free</Link></div>
          ) : can ? (
            <HostEventForm zoomAcct={apps?.zoom ?? null} />
          ) : (
            <HostUpsell />
          )}
        </div>
      </div>
    </div>
  );
}
