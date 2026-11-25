"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/toast";
import { saveContactNote, setContactHandled } from "@/app/(hub)/team-extra-actions";

export type CMsg = { id: string; name: string; email: string; business: string; topic: string; topicLabel: string; inbox: string; message: string; created_at: string; handled_at: string | null; team_note: string; member: string | null };

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** One message from the Contact us page, with reply, handled and a team note. */
export function ContactRow({ m }: { m: CMsg }) {
  const router = useRouter();
  const [note, setNote] = useState(m.team_note);
  const [done, setDone] = useState(!!m.handled_at);
  const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to SME Hub (${m.topicLabel})`)}&body=${encodeURIComponent(`Hi ${m.name.split(" ")[0]},\n\n\n\n---\nYou wrote:\n${m.message}`)}`;
  return (
    <div className="card" style={{ gap: 10 }}>
      <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
        <span className="stack grow" style={{ gap: 2, flexBasis: 260 }}>
          <span><strong>{m.name}</strong>{m.business ? <span className="muted"> · {m.business}</span> : null}{m.member ? <> · <a className="namebtn" href={`/members/${m.member}`}>Member profile</a></> : null}</span>
          <span className="muted small">{m.email} · {when(m.created_at)} · sent to {m.inbox}</span>
        </span>
        <span className="tag">{m.topicLabel}</span>
        <span className={`pill ${done ? "on" : "warn"}`}>{done ? "Handled" : "Open"}</span>
      </div>
      <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
      <label className="small" htmlFor={`n-${m.id}`}>Team note <span className="muted">(only the team sees this)</span></label>
      <textarea id={`n-${m.id}`} className="field" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} onBlur={async () => { if (note !== m.team_note) { const r = await saveContactNote(m.id, note); toast(r.error ?? "Note saved"); } }} placeholder="For example: replied by phone, sent pricing" />
      <div className="row" style={{ flexWrap: "wrap" }}>
        <a className="btn sm" href={reply}>Reply by email</a>
        <button type="button" className="btn sm ghost" onClick={async () => { setDone(!done); const r = await setContactHandled(m.id, !done); if (r.error) { setDone(done); toast(r.error); } else { toast(done ? "Marked as open" : "Marked as handled"); router.refresh(); } }}>{done ? "Mark as open" : "Mark as handled"}</button>
      </div>
    </div>
  );
}
