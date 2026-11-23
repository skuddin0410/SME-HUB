import { getViewer } from "@/lib/hub";
import { RsvpBtn } from "@/components/zip/rsvp-btn";
import { pageMeta } from "@/lib/seo";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Events", description: "One live session every week, plus CanadianSME events through the year.", path: "/events" });

type Ev = { id: string; title: string; when_label: string; location: string; note: string };

export default async function EventsPage() {
  const { supabase, userId } = await getViewer();
  const { data } = await supabase.from("hub_events").select("id, title, when_label, location, note").eq("status", "published").order("position");
  const events = (data ?? []) as Ev[];
  const mine = new Set(userId ? ((await supabase.from("event_rsvps").select("event_id").eq("user_id", userId)).data ?? []).map((r) => r.event_id as string) : []);
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead">
          <h1>Events</h1>
          <p className="muted">One live session every week, plus CanadianSME events through the year.</p>
        </div>
        <div className="stack" style={{ gap: 14, maxWidth: 820 }}>
          {events.length === 0 && <div className="card"><strong>No events yet.</strong><p className="muted">New sessions are added here as they are scheduled.</p></div>}
          {events.map((e) => (
            <div key={e.id} className="card">
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div className="stack grow" style={{ flexBasis: 300, gap: 4 }}>
                  <span className="eyebrow">{e.when_label}</span>
                  <h2 style={{ fontSize: 16 }}>{e.title}</h2>
                  <span className="muted">{e.location}</span>
                  <span className="muted small">{e.note}</span>
                </div>
                <RsvpBtn eventId={e.id} saved={mine.has(e.id)} signedIn={!!userId} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
