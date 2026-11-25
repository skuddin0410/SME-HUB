import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { RestoreBtn } from "./mod-log-client";

const ACTION: Record<string, string> = { hide: "Hid", unhide: "Unhid", suspend: "Suspended", unsuspend: "Lifted the suspension of", remove: "Removed", restore: "Restored", reject: "Rejected", approve: "Approved", dismiss: "Dismissed reports on" };
const KIND: Record<string, string> = { post: "post", member: "member", story: "story", course_review: "course review", business: "business page", business_review: "business review", advisor_review: "advisor review", pavilion: "pavilion listing" };
const UNDO = new Set(["hide", "suspend", "remove", "reject"]);

function link(kind: string, target: string): string | null {
  const [a] = target.split(":");
  if (kind === "post") return `/posts/${a}`;
  if (kind === "member" || kind === "advisor_review") return `/members/${a}`;
  if (kind === "pavilion") return "/pavilion";
  if (kind === "story") return "/moderation?tab=stories";
  return null;
}

/** Moderation → Log: every hide, removal, suspension and reversal, newest first, with Restore where it can be undone. */
export async function ModLog({ filter }: { filter: string }) {
  const { supabase } = await getViewer();
  let q = supabase.from("mod_log").select("id, at, action, kind, target_id, label, undone_at, actor:profiles!mod_log_actor_id_fkey(full_name), undoer:profiles!mod_log_undone_by_fkey(full_name)").order("at", { ascending: false }).limit(200);
  if (filter === "auto") q = q.is("actor_id", null);
  if (filter === "undoable") q = q.in("action", [...UNDO]).is("undone_at", null);
  const { data } = await q;
  const rows = (data ?? []) as unknown as { id: string; at: string; action: string; kind: string; target_id: string; label: string; undone_at: string | null; actor: { full_name: string | null } | null; undoer: { full_name: string | null } | null }[];
  const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <div className="card">
      <div className="row" style={{ flexWrap: "wrap" }}>
        <h2 className="grow">Moderation log</h2>
        <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {[["", "Everything"], ["undoable", "Can be restored"], ["auto", "Done automatically"]].map(([k, l]) => <Link key={k} className="chip" href={`/moderation?tab=log${k ? `&lf=${k}` : ""}`} aria-current={filter === k ? "true" : undefined}>{l}</Link>)}
        </span>
      </div>
      <p className="muted small">Every hide, removal and suspension, by the team or by the automatic limits. Restore puts it back and is logged too.</p>
      {rows.length ? (
        <div className="list">
          {rows.map((r) => {
            const href = link(r.kind, r.target_id);
            return (
              <div key={r.id} className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
                <span className="stack grow" style={{ gap: 2, flexBasis: 300 }}>
                  <span className="small"><strong>{r.actor?.full_name ?? "Automatic"}</strong> {ACTION[r.action] ?? r.action} a {KIND[r.kind] ?? r.kind}{r.label ? <>: {href ? <Link href={href}>“{r.label}”</Link> : <>“{r.label}”</>}</> : null}</span>
                  <span className="muted small">{when(r.at)}{r.undone_at ? ` · restored by ${r.undoer?.full_name ?? "the team"} on ${when(r.undone_at)}` : ""}</span>
                </span>
                {UNDO.has(r.action) && !r.undone_at && <RestoreBtn id={r.id} />}
                {r.undone_at && <span className="pill">Restored</span>}
              </div>
            );
          })}
        </div>
      ) : <p className="muted">Nothing logged yet.</p>}
    </div>
  );
}
