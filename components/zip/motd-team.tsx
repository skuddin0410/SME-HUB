"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pickMemberOfDay, removeMemberOfDay } from "@/app/(hub)/motd-actions";

type Row = { day: string; member_id: string; name: string; auto: boolean };
type Cand = { id: string; name: string; headline: string; last: string | null };

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The team's list for Member of the Day (Update 11): pick a member for a date; days with no pick are chosen automatically. */
export function MotdTeam({ today, rows, candidates }: { today: string; rows: Row[]; candidates: Cand[] }) {
  const router = useRouter();
  const [day, setDay] = useState(today);
  const [who, setWho] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [pending, start] = useTransition();
  const shown = candidates.filter((c) => !q.trim() || `${c.name} ${c.headline}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 50);
  const upcoming = rows.filter((r) => r.day >= today);
  const past = rows.filter((r) => r.day < today).reverse(); // newest first
  const pick = () => start(async () => {
    const r = await pickMemberOfDay(day, who);
    setMsg(r.ok ? { ok: `Saved. ${candidates.find((c) => c.id === who)?.name ?? "The member"} is the Member of the Day on ${fmt(day)}.` } : { error: r.error });
    if (r.ok) router.refresh();
  });
  const remove = (d: string) => start(async () => {
    const r = await removeMemberOfDay(d);
    setMsg(r.ok ? { ok: `Removed. ${fmt(d)} will get an automatic member.` } : { error: r.error });
    if (r.ok) router.refresh();
  });
  return (
    <div className="setgrid">
      <div className="card">
        <h2>Pick a member</h2>
        <p className="small muted">Only members whose profile is ready are listed. A day with no pick gets one automatically: ready, active, not featured in the last 90 days, paid and active members first.</p>
        <label className="small" style={{ fontWeight: 600 }} htmlFor="motdday">Date</label>
        <input id="motdday" className="field" type="date" min={today} value={day} onChange={(e) => setDay(e.target.value)} />
        <label className="small" style={{ fontWeight: 600 }} htmlFor="motdq">Find a member</label>
        <input id="motdq" className="field" type="search" placeholder="Name or business" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="stack" role="radiogroup" aria-label="Member" style={{ gap: 4, maxHeight: 320, overflow: "auto" }}>
          {shown.map((c) => (
            <label key={c.id} className="row small" style={{ gap: 8, alignItems: "flex-start" }}>
              <input type="radio" name="motdwho" value={c.id} checked={who === c.id} onChange={() => setWho(c.id)} />
              <span className="stack" style={{ gap: 0 }}>
                <b>{c.name}</b>
                <span className="muted">{c.headline}{c.last ? ` · last featured ${fmt(c.last)}` : ""}</span>
              </span>
            </label>
          ))}
          {!shown.length && <p className="small muted">No ready members match.</p>}
        </div>
        <button type="button" className="btn" style={{ alignSelf: "flex-start" }} disabled={pending || !who || !day} onClick={pick}>Save pick</button>
        {(msg.error || msg.ok) && <p className="small" role={msg.error ? "alert" : "status"}>{msg.error || msg.ok}</p>}
      </div>
      <div className="card">
        <h2>Coming up</h2>
        {upcoming.length ? (
          <div className="list">
            {upcoming.map((r) => (
              <div key={r.day} className="row" style={{ flexWrap: "wrap" }}>
                <span className="grow"><b>{fmt(r.day)}</b>{r.day === today ? " (today)" : ""}: <Link href={`/members/${r.member_id}`}>{r.name}</Link> <span className="muted small">{r.auto ? "· chosen automatically" : "· picked by the team"}</span></span>
                <button type="button" className="btn sm ghost" disabled={pending} onClick={() => remove(r.day)} aria-label={`Remove the pick for ${fmt(r.day)}`}>Remove</button>
              </div>
            ))}
          </div>
        ) : <p className="small muted">No picks yet. Today’s member is chosen automatically when the first person opens the Hub.</p>}
        <h2 style={{ marginTop: 12 }}>Last 90 days</h2>
        {past.length ? (
          <div className="list">
            {past.map((r) => <div key={r.day} className="small"><b>{fmt(r.day)}</b>: <Link href={`/members/${r.member_id}`}>{r.name}</Link> <span className="muted">{r.auto ? "· automatic" : "· team pick"}</span></div>)}
          </div>
        ) : <p className="small muted">Nobody featured yet.</p>}
      </div>
    </div>
  );
}
