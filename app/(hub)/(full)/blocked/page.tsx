import { Crumbs } from "@/components/zip/crumbs";
import { requireUser } from "@/lib/hub";
import { ZipAv } from "@/components/zip/bits";
import { Unblock } from "@/components/zip/account-client";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = { title: "Blocked members", robots: { index: false } };

export default async function BlockedPage() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("blocks").select("blocked_id, blocked:profiles!blocks_blocked_id_fkey(full_name, headline, avatar_url)").eq("blocker_id", userId);
  const rows = (data ?? []) as unknown as { blocked_id: string; blocked: { full_name: string; headline: string; avatar_url: string | null } | null }[];
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40, maxWidth: 720 }}>
        <div className="pagehead">
          <Crumbs items={[["Privacy and account", "/settings"], ["Blocked members"]]} />
          <h1>Blocked members</h1>
          <p className="muted">You will not see posts, profiles or messages from anyone on this list, and they will not see yours. They are not told.</p>
        </div>
        <div className="card">
          {rows.length ? (
            <div className="list">
              {rows.map((r) => (
                <div className="row" key={r.blocked_id}>
                  <ZipAv name={r.blocked?.full_name || "M"} src={r.blocked?.avatar_url} />
                  <div className="stack grow"><strong>{r.blocked?.full_name || "Member"}</strong><span className="muted small">{r.blocked?.headline}</span></div>
                  <Unblock id={r.blocked_id} />
                </div>
              ))}
            </div>
          ) : <p className="muted">You have not blocked anyone.</p>}
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>To block someone, open the three-dot menu on their profile or on one of their posts.</p>
      </div>
    </div>
  );
}
