"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { applyJob, referJob, reportJob, saveJob, viewJob } from "@/app/(hub)/job-actions";
import { createClient } from "@/lib/supabase/client";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";

/** Update 43: Apply, I know someone, Save, Copy link and report on a job page. */

type Me = { id: string; name: string; email: string; avatar: string | null } | null;
type Conn = { id: string; name: string };

const CV_TYPES: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

export function JobActions({ job, me, own, applied: applied0, saved: saved0, connections, how, email, url }: {
  job: { id: string; title: string; biz: string };
  me: Me; own: boolean; applied: boolean; saved: boolean; connections: Conn[];
  how: "hub" | "email" | "url"; email: string | null; url: string | null;
}) {
  const [modal, setModal] = useState<"apply" | "refer" | null>(null);
  const [applied, setApplied] = useState(applied0);
  const [saved, setSaved] = useState(saved0);
  useEffect(() => { viewJob(job.id).catch(() => {}); }, [job.id]);

  const join = () => (window.location.href = "/auth/sign-up");
  const toggleSave = () => {
    if (!me) return join();
    const on = !saved;
    setSaved(on);
    saveJob(job.id, on).then((r) => { if (r.error) { setSaved(!on); toast(r.error); } else toast(on ? "Saved. Find it under Saved on Jobs." : "Removed from saved"); });
  };
  const copy = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/jobs/${job.id}`).catch(() => {});
    toast("Link copied");
  };

  return (
    <>
      <div className="jxacts">
        {own ? (
          <Link className="btn dark" href="/jobs/mine"><Ic n="users" s={15} />See applicants</Link>
        ) : applied ? (
          <span className="jxdone"><Ic n="check" s={15} />You applied. We sent you a copy by email.</span>
        ) : how === "email" && email ? (
          <a className="btn dark" href={`mailto:${email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}>Apply by email</a>
        ) : how === "url" && url ? (
          <a className="btn dark" href={url} target="_blank" rel="noopener nofollow">Apply on their website</a>
        ) : (
          <button type="button" className="btn dark" onClick={() => (me ? setModal("apply") : join())}>Apply</button>
        )}
        {!own && <button type="button" className="btn ghost" onClick={() => (me ? setModal("refer") : join())}><Ic n="users" s={15} />I know someone</button>}
        <button type="button" className="btn ghost" aria-pressed={saved} onClick={toggleSave}><Ic n="bookmark" s={15} />{saved ? "Saved" : "Save"}</button>
        <button type="button" className="btn ghost" onClick={copy}><Ic n="link" s={15} />Copy link</button>
      </div>
      {modal === "apply" && me && <ApplyModal job={job} me={me} onClose={() => setModal(null)} onDone={() => { setApplied(true); setModal(null); }} />}
      {modal === "refer" && <ReferModal job={job} connections={connections} onClose={() => setModal(null)} />}
    </>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal jxmodal" role="dialog" aria-modal="true" aria-labelledby="jxmt" onClick={(e) => e.stopPropagation()}>
        <div className="jxmh2"><h2 id="jxmt">{title}</h2><button type="button" className="iconbtn" aria-label="Close" onClick={onClose}><Ic n="x" s={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function ApplyModal({ job, me, onClose, onDone }: { job: { id: string; title: string; biz: string }; me: NonNullable<Me>; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [share, setShare] = useState(true);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const send = () => start(async () => {
    setErr("");
    if (!note.trim()) return setErr("Add a short note so the owner knows why you’re a good fit.");
    let cvPath: string | null = null;
    let cvName: string | null = null;
    if (file) {
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      if (!CV_TYPES[ext]) return setErr("Your CV should be a PDF or Word file.");
      if (file.size > 5 * 1024 * 1024) return setErr("Your CV can be up to 5 MB.");
      cvPath = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("job-cvs").upload(cvPath, file, { contentType: CV_TYPES[ext] });
      if (error) return setErr("Your CV didn’t upload. Try again, or send the application without it.");
      cvName = file.name.replace(/[\u0000-\u001f\\/]/g, "").slice(0, 200) || `cv.${ext}`;
    }
    const r = await applyJob({ job: job.id, note, cvPath, cvName, share });
    if (r.error) return setErr(r.error);
    toast(`Application sent to ${job.biz}. We emailed you a copy.`);
    onDone();
  });
  return (
    <Shell title={`Apply: ${job.title}`} onClose={onClose}>
      <p className="jxmut">To {job.biz}. They’ll see your name, email and your note.</p>
      <div className="jxwho"><ZipAv name={me.name} src={me.avatar} size="s" /><span><b>{me.name}</b><small>{me.email}</small></span></div>
      <label className="jxl" htmlFor="jxa-note">Why you’re a good fit</label>
      <textarea id="jxa-note" className="jxin" rows={4} maxLength={3000} placeholder="A few lines about your experience and when you can start" value={note} onChange={(e) => setNote(e.target.value)} />
      <label className="jxl" htmlFor="jxa-cv">Your CV (optional)</label>
      <input id="jxa-cv" type="file" accept=".pdf,.doc,.docx" className="jxfile" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label className="jxcb"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> Share my SME Hub profile too</label>
      {err && <p className="jxerr" role="alert">{err}</p>}
      <p className="jxsafe2"><Ic n="lock" s={13} />Never share banking details or pay anything to apply.</p>
      <div className="jxfoot"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn dark" disabled={busy} onClick={send}>Send application</button></div>
    </Shell>
  );
}

function ReferModal({ job, connections, onClose }: { job: { id: string; title: string; biz: string }; connections: Conn[]; onClose: () => void }) {
  const [who, setWho] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const send = () => start(async () => {
    setErr("");
    const nm = who ? connections.find((c) => c.id === who)?.name ?? "" : name.trim();
    if (!nm) return setErr("Choose a connection, or add their name and email.");
    if (!who && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim())) return setErr("Add their email so we can send them the job.");
    const r = await referJob({ job: job.id, member: who || null, name, email, note });
    if (r.error) return setErr(r.error);
    toast(`Thanks. We sent ${nm} the job with your note, and told ${job.biz} you recommended them.`);
    onClose();
  });
  return (
    <Shell title="Who would be great for this?" onClose={onClose}>
      <p className="jxmut">{job.title} at {job.biz}. We send them the job with your note, and tell the owner you recommended them.</p>
      {connections.length > 0 && (
        <>
          <label className="jxl" htmlFor="jxr-who">One of your connections</label>
          <select id="jxr-who" className="jxin" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Choose a connection</option>
            {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="jxor"><span>or someone not on SME Hub</span></p>
        </>
      )}
      <div className="jx2">
        <div><label className="jxl" htmlFor="jxr-name">Their name</label><input id="jxr-name" className="jxin" value={name} disabled={!!who} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="jxl" htmlFor="jxr-email">Their email</label><input id="jxr-email" className="jxin" type="email" value={email} disabled={!!who} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
      <label className="jxl" htmlFor="jxr-note">A note for them (optional)</label>
      <textarea id="jxr-note" className="jxin" rows={3} maxLength={1000} placeholder="Saw this and thought of you" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p className="jxerr" role="alert">{err}</p>}
      <div className="jxfoot"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="button" className="btn dark" disabled={busy} onClick={send}>Send the job</button></div>
    </Shell>
  );
}

export function ReportJob({ id, signedIn }: { id: string; signedIn: boolean }) {
  const [sent, setSent] = useState(false);
  return (
    <button type="button" className="linkbtn" disabled={sent} onClick={async () => {
      if (!signedIn) return void (window.location.href = "/auth/sign-up");
      const r = await reportJob(id, "Asks for money or banking details");
      if (r.error) return toast(r.error);
      setSent(true);
      toast("Thanks for reporting this job. The Hub team looks at every reported job today.");
    }}>{sent ? "reported" : "report this job"}</button>
  );
}
