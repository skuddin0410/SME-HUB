import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { getMyDeadlines } from "@/lib/deadlines-server";
import { dlWhen } from "@/lib/deadlines";

const mon = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", { month: "short", timeZone: "UTC" });

/** Home right column (Update 13): the next 3 deadlines, or an invitation to set them up. Only the member sees it. */
export async function DeadlineCard({ where }: { where: "top" | "bottom" }) {
  const D = await getMyDeadlines();
  if (!D) return null;
  const set = !!D.setup;
  if ((where === "top") !== set) return null;
  if (!set) {
    return (
      <div className="card dlhome">
        <div className="row" style={{ gap: 10, alignItems: "center" }}><span className="tlico sm"><Ic n="cal2" s={16} /></span><h2 className="grow" style={{ font: "800 15px var(--display)", margin: 0 }}>Never miss a tax deadline</h2></div>
        <p className="small muted" style={{ margin: 0 }}>Add your GST/HST, payroll and tax dates. We’ll remind you before each one.</p>
        <Link className="btn sm ghost" href="/deadlines" style={{ alignSelf: "flex-start" }}>Set up my deadlines</Link>
      </div>
    );
  }
  const L = D.list.filter((o) => !D.done[o.key]).slice(0, 3);
  return (
    <div className="card dlhome">
      <div className="row" style={{ alignItems: "center" }}><h2 className="grow" style={{ font: "800 15px var(--display)", margin: 0 }}>Upcoming deadlines</h2><Link className="small" href="/deadlines">See all</Link></div>
      {L.length ? L.map((o) => (
        <Link key={o.key} className="dlmini" href="/deadlines">
          <div className="dldate sm" aria-hidden="true"><span>{mon(o.iso)}</span><b>{Number(o.iso.slice(8, 10))}</b></div>
          <span className="stack" style={{ gap: 0 }}><b>{o.t}</b><small className="muted">{dlWhen(o.iso, D.today)}</small></span>
        </Link>
      )) : <p className="small muted" style={{ margin: 0 }}>You’re all caught up.</p>}
    </div>
  );
}
