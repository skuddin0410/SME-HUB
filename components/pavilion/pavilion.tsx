"use client";
import { Crumbs } from "@/components/zip/crumbs";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ZipAv } from "@/components/zip/bits";
import { Scene } from "@/components/zip/scene";
import { toast } from "@/components/toast";
import { pavilionAction, reportLabel, submitListing } from "@/app/(hub)/pavilion-actions";
import { CLAIMS, PSEC, type PavListing } from "@/lib/pavilion";
import { PROVS } from "@/lib/forsale-shared";

const PNAME = Object.fromEntries(PROVS);
const Claim = ({ c }: { c: string }) => <span className={`claim${CLAIMS[c]?.[2] ? " soft" : ""}`}>{CLAIMS[c]?.[0] ?? c}</span>;
const intro = (l: PavListing) => `/messages?with=${l.owner.id}&text=${encodeURIComponent(`Hi ${l.owner.name.split(" ")[0]}, I found ${l.name} in the Made in Canada Pavilion and would like to learn more. Do you have 15 minutes this week?`)}`;

type Modal = { type: "view"; l: PavListing } | { type: "form" } | { type: "report"; l: PavListing | null };

/** The Made in Canada Pavilion (handoff: pavilion): search, province, sections, claim filters, cards and the exhibit form. */
export function Pavilion({ listings, member, staff, meBiz }: { listings: PavListing[]; member: boolean; staff: boolean; meBiz: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [prov, setProv] = useState("");
  const [sec, setSec] = useState("all");
  const [claim, setClaim] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);
  const pub = listings.filter((l) => l.status === "published");
  const provs = useMemo(() => [...new Set(pub.map((l) => l.province).filter(Boolean))].sort(), [pub]);
  const list = listings.filter((l) => {
    if (sec !== "all" && l.sec !== sec) return false;
    if (claim && !l.claims.includes(claim)) return false;
    if (prov && l.province !== prov) return false;
    const t = q.trim().toLowerCase();
    return !t || `${l.name} ${l.by} ${l.what} ${l.city}`.toLowerCase().includes(t);
  });
  const exhibit = member
    ? <button type="button" className="btn" onClick={() => setModal({ type: "form" })}>Exhibit your product free</button>
    : <Link className="btn" href="/auth/sign-up">Exhibit your product free</Link>;
  const exhibitLight = member
    ? <button type="button" className="btn light" onClick={() => setModal({ type: "form" })}>Exhibit your product free</button>
    : <Link className="btn light" href="/auth/sign-up">Exhibit your product free</Link>;
  const team = async (l: PavListing, a: "approve" | "remove" | "feature" | "unfeature" | "resolve", ok: string) => {
    const r = await pavilionAction(l.id, a);
    toast(r.error ?? ok);
    router.refresh();
  };

  return (
    <>
      <section className="bizhead pavhead" aria-label="Made in Canada Pavilion">
        <div className="txt">
          <Crumbs items={[["Made in Canada Pavilion"]]} />
          <h1>Buy from, build with and back Canadian businesses</h1>
          <p>Canadian manufacturers, owner-run services and AI tools built here, all run by Hub members. Find one, then ask for an introduction.</p>
          <div className="srow">
            <label className="sr" htmlFor="pvq">Search the pavilion</label>
            <input id="pvq" className="field" type="search" placeholder="Search by product, service or city" value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="sr" htmlFor="pvprov">Province</label>
            <select id="pvprov" className="field" value={prov} onChange={(e) => setProv(e.target.value)}>
              <option value="">All of Canada</option>
              {provs.map((p) => <option key={p} value={p}>{PNAME[p]}</option>)}
            </select>
            {exhibit}
          </div>
          <div className="stats"><span><b>{pub.length}</b>exhibitors</span><span><b>{provs.length}</b>provinces</span><span><b>{pub.filter((l) => l.ai).length}</b>Canadian AI tools</span></div>
        </div>
        <div className="leaf" aria-hidden="true">Proudly Canadian<br />coast to coast</div>
      </section>
      <div className="tools" style={{ marginBottom: 10 }}>
        <div className="chips grow" role="group" aria-label="Section">
          {PSEC.map(([k, label]) => {
            const n = k === "all" ? pub.length : pub.filter((l) => l.sec === k).length;
            return <button key={k} type="button" className="chip" aria-pressed={sec === k} onClick={() => setSec(k)}>{label} ({n})</button>;
          })}
        </div>
      </div>
      <div className="tools" style={{ marginBottom: 16 }}>
        <span className="small" style={{ fontWeight: 600 }}>Show only:</span>
        <div className="chips grow" role="group" aria-label="Claim">
          {Object.keys(CLAIMS).map((c) => <button key={c} type="button" className="chip" aria-pressed={claim === c} onClick={() => setClaim((x) => (x === c ? "" : c))}>{CLAIMS[c][0]}</button>)}
        </div>
        <span className="muted small">{list.length}{list.length === 1 ? " exhibitor" : " exhibitors"}</span>
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((l) => (
            <div key={l.id} className="card bizcard pavcard">
              <div className="cover"><Scene n={l.scene} h={190} />{l.featured && <span className="feat">Featured</span>}</div>
              <div className="row" style={{ alignItems: "flex-end" }}>
                <span className="bizlogo" aria-hidden="true">{l.name[0]}</span>
                <span className="tag" style={{ marginLeft: "auto" }}>{l.status === "pending" ? "Pending review" : l.status === "removed" ? "Removed" : l.ai ? "AI tool" : { make: "Maker", serv: "Service", soft: "Software" }[l.sec]}</span>
              </div>
              <div className="stack">
                <h2><button type="button" className="namebtn" style={{ fontSize: 15 }} onClick={() => setModal({ type: "view", l })}>{l.name}</button></h2>
                <span className="muted small">{l.by ? `by ${l.by} · ` : ""}{l.city}</span>
              </div>
              <p>{l.what}</p>
              <div className="chips">{l.claims.map((c) => <Claim key={c} c={c} />)}</div>
              <div className="bizfoot"><ZipAv name={l.owner.name} src={l.owner.avatar} size="s" /><span className="small grow"><Link className="namebtn" style={{ fontSize: 12 }} href={`/members/${l.owner.id}`}>{l.owner.name}</Link></span></div>
              <div className="row" style={{ flexWrap: "wrap" }}>
                {l.mine ? (
                  <span className="muted small">Your listing{l.status === "pending" ? " · waiting for the Hub team" : ""}</span>
                ) : member ? (
                  <Link className="btn sm" href={intro(l)}>Ask for an introduction</Link>
                ) : (
                  <Link className="btn sm" href="/auth/sign-up">Ask for an introduction</Link>
                )}
                <button type="button" className="btn sm ghost" onClick={() => setModal({ type: "view", l })}>Details</button>
              </div>
              {staff && (
                <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                  {l.status !== "published" && <button type="button" className="btn sm" onClick={() => team(l, "approve", "Approved. It is in the pavilion now.")}>Approve</button>}
                  {l.status !== "removed" && <button type="button" className="btn sm ghost" onClick={() => team(l, "remove", "Listing removed")}>Remove</button>}
                  {l.status === "published" && <button type="button" className="btn sm ghost" onClick={() => team(l, l.featured ? "unfeature" : "feature", l.featured ? "No longer featured" : "Featured")}>{l.featured ? "Unfeature" : "Feature"}</button>}
                  {l.reports > 0 && <button type="button" className="btn sm ghost" onClick={() => team(l, "resolve", "Label reports closed")}>{l.reports} label report{l.reports === 1 ? "" : "s"}: mark checked</button>}
                </div>
              )}
            </div>
          ))}
          {sec !== "all" && !claim && !q && !prov && (
            <div className="card sponsor">
              <p className="eyebrow">Category sponsor</p>
              <strong style={{ font: "700 16px var(--display)" }}>Your brand here</strong>
              <p className="muted small">One sponsor per section. Ask the team about sponsoring this section.</p>
              <Link className="btn sm ghost" href="/contact">Ask about sponsoring</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <strong>{pub.length ? "No exhibitors match." : "No exhibitors yet."}</strong>
          <p className="muted">{pub.length ? "Try another section or clear the filters." : "Be the first: a basic listing is free for every member."}</p>
          {pub.length > 0 && <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={() => { setQ(""); setProv(""); setSec("all"); setClaim(""); }}>Clear filters</button>}
        </div>
      )}
      <div className="card" style={{ marginTop: 16 }}>
        <h2>What the labels mean</h2>
        <p className="muted small">Each business chooses its own label and confirms it is accurate. SME Hub does not certify these claims. The first three follow Competition Bureau guidance for products.</p>
        <div className="claimtable">{Object.keys(CLAIMS).map((c) => <div key={c}><Claim c={c} /><span>{CLAIMS[c][1]}</span></div>)}</div>
        <button type="button" className="linkbtn" style={{ alignSelf: "flex-start", color: "var(--link)" }} onClick={() => (member ? setModal({ type: "report", l: null }) : router.push("/auth/sign-up"))}>Report a label that looks wrong</button>
      </div>
      <div className="band">
        <div className="stack grow" style={{ flexBasis: 380, gap: 6 }}>
          <h2 style={{ fontSize: 18 }}>Make, build or code it in Canada? Exhibit free.</h2>
          <p>A basic listing is free for every member. Featured spots and section sponsorships are available.</p>
        </div>
        {exhibitLight}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mt" onClick={(e) => e.stopPropagation()}>
            {modal.type === "view" && (
              <>
                <div className="pic" style={{ overflow: "hidden", lineHeight: 0 }}><Scene n={modal.l.scene} h={180} /></div>
                <div className="stack"><h2 id="mt" style={{ fontSize: 20 }}>{modal.l.name}</h2><span className="muted small">{modal.l.by ? `by ${modal.l.by} · ` : ""}{modal.l.city}</span></div>
                <p>{modal.l.what}</p>
                <div className="stack" style={{ gap: 8 }}>
                  <span className="eyebrow">Canadian claims, declared by the seller</span>
                  {modal.l.claims.map((c) => <div key={c} className="stack" style={{ gap: 2, alignItems: "flex-start" }}><Claim c={c} /><span className="small muted">{CLAIMS[c]?.[1]}</span></div>)}
                  {modal.l.note && <span className="small"><b>Seller’s note:</b> {modal.l.note}</span>}
                </div>
                <div className="row"><ZipAv name={modal.l.owner.name} src={modal.l.owner.avatar} size="s" /><span className="small grow"><Link className="namebtn" href={`/members/${modal.l.owner.id}`}>{modal.l.owner.name}</Link>{modal.l.owner.role ? `, ${modal.l.owner.role}` : ""}</span></div>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {!modal.l.mine && <Link className="btn" href={member ? intro(modal.l) : "/auth/sign-up"}>Ask for an introduction</Link>}
                  {member && !modal.l.mine && <button type="button" className="btn ghost" onClick={() => setModal({ type: "report", l: modal.l })}>Report a label</button>}
                  {modal.l.mine && modal.l.status !== "removed" && <button type="button" className="btn ghost" onClick={async () => { const r = await pavilionAction(modal.l.id, "remove"); setModal(null); toast(r.error ?? "Your listing was taken down"); router.refresh(); }}>Take down my listing</button>}
                  <button type="button" className="btn ghost" onClick={() => setModal(null)}>Close</button>
                </div>
              </>
            )}
            {modal.type === "form" && <ExhibitForm biz={meBiz} onClose={() => setModal(null)} onDone={() => { setModal(null); setSec("all"); toast("Sent to the Hub team for review"); router.refresh(); }} />}
            {modal.type === "report" && <ReportForm listings={pub.filter((l) => !l.mine)} start={modal.l} onClose={() => setModal(null)} />}
          </div>
        </div>
      )}
    </>
  );
}

function ExhibitForm({ biz, onClose, onDone }: { biz: string; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      setBusy(true);
      const r = await submitListing({ name: String(f.get("name")), what: String(f.get("what")), section: String(f.get("sec")), claim: String(f.get("claim")), confirm: f.get("ok") === "on" });
      setBusy(false);
      if (r.error) return toast(r.error);
      onDone();
    }}>
      <h2 id="mt" style={{ fontSize: 18 }}>Exhibit in the Made in Canada Pavilion</h2>
      <p className="muted small">Free for members. The Hub team reviews every listing before it appears.</p>
      <label htmlFor="pfn">Product or business name<input className="field" id="pfn" name="name" defaultValue={biz} maxLength={80} /></label>
      <label htmlFor="pfw">What you make or do, in one sentence<input className="field" id="pfw" name="what" maxLength={200} placeholder="e.g. Kitchen and bathroom renovations across Peel Region" /></label>
      <label htmlFor="pfs">Section<select className="field" id="pfs" name="sec" defaultValue="serv">{PSEC.slice(1).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label htmlFor="pfc">Your Canadian claim<select className="field" id="pfc" name="claim" defaultValue="own">{Object.keys(CLAIMS).map((c) => <option key={c} value={c}>{CLAIMS[c][0]}: {CLAIMS[c][1].split(".")[0]}</option>)}</select></label>
      <label className="check" htmlFor="pfk"><input type="checkbox" id="pfk" name="ok" style={{ marginTop: 3 }} /><span>I confirm this claim is true for my product and I can show proof if asked. I understand SME Hub may remove listings with inaccurate claims.</span></label>
      <div className="row"><button type="submit" className="btn" disabled={busy}>Send for review</button><button type="button" className="btn ghost" onClick={onClose}>Cancel</button></div>
    </form>
  );
}

function ReportForm({ listings, start, onClose }: { listings: PavListing[]; start: PavListing | null; onClose: () => void }) {
  const [id, setId] = useState(start?.id ?? listings[0]?.id ?? "");
  const l = listings.find((x) => x.id === id) ?? start;
  const [claim, setClaim] = useState(l?.claims[0] ?? "");
  const [note, setNote] = useState("");
  if (!l) return <><h2 id="mt" style={{ fontSize: 18 }}>Report a label</h2><p className="muted">There are no listings to report yet.</p><button type="button" className="btn ghost" onClick={onClose}>Close</button></>;
  return (
    <>
      <h2 id="mt" style={{ fontSize: 18 }}>Report a label</h2>
      <p className="muted small">The Hub team checks the claim with the business and removes the label if it cannot be backed up.</p>
      {!start && <label htmlFor="prl">Listing<select className="field" id="prl" value={id} onChange={(e) => { setId(e.target.value); setClaim(listings.find((x) => x.id === e.target.value)?.claims[0] ?? ""); }}>{listings.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
      <label htmlFor="prc">Which label looks wrong?<select className="field" id="prc" value={claim} onChange={(e) => setClaim(e.target.value)}>{l.claims.map((c) => <option key={c} value={c}>{CLAIMS[c]?.[0]}</option>)}</select></label>
      <label htmlFor="prn">What makes you think so? <span className="muted small">(optional)</span><textarea className="field" id="prn" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="row">
        <button type="button" className="btn" onClick={async () => { const r = await reportLabel(l.id, claim, note); onClose(); toast(r.error ?? "Thanks. The Hub team will check this label."); }}>Send report</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}
