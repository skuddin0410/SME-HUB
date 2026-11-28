"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideHost } from "@/app/(hub)/thread-actions";
import { ZipAv } from "@/components/zip/bits";
import { toast } from "@/components/toast";

type Req = { id: string; created_at: string; who: { id: string; full_name: string | null; headline: string | null; avatar_url: string | null } | null };

/** Update 42: members who offered to host. The team picks a public group, or declines. */
export function HostRequests({ list, groups }: { list: Req[]; groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pick, setPick] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();
  const go = (id: string, approve: boolean) => start(async () => {
    const r = await decideHost(id, approve ? pick[id] ?? null : null, approve);
    if (r.error) return toast(r.error);
    toast(approve ? "Done. They’re the host, with a Host badge, and now moderate the group." : "Declined");
    router.refresh();
  });
  return (
    <div className="card">
      <div className="row"><h2 className="grow">Offers to host a group</h2><span className={`pill ${list.length ? "warn" : "on"}`}>{list.length} waiting</span></div>
      <p className="muted small">Hosts welcome new members, run the weekly check-in and make sure every question gets an answer. Free Plus is given from Billing.</p>
      <div className="list">
        {list.map((r) => (
          <div key={r.id} className="row" style={{ flexWrap: "wrap" }}>
            <ZipAv name={r.who?.full_name || "M"} src={r.who?.avatar_url} size="s" />
            <span className="stack grow"><strong>{r.who?.full_name ?? "A member"}</strong><span className="muted small">{r.who?.headline}</span></span>
            <label className="sr" htmlFor={`hg-${r.id}`}>Group to host</label>
            <select id={`hg-${r.id}`} className="field" style={{ width: "auto" }} value={pick[r.id] ?? ""} onChange={(e) => setPick((p) => ({ ...p, [r.id]: e.target.value }))}>
              <option value="">Choose a group</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button type="button" className="btn sm" disabled={busy || !pick[r.id]} onClick={() => go(r.id, true)}>Make host</button>
            <button type="button" className="btn sm ghost" disabled={busy} onClick={() => go(r.id, false)}>Decline</button>
          </div>
        ))}
      </div>
    </div>
  );
}
