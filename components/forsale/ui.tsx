"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { enquire, reportListing, toggleSaleSave } from "@/app/(hub)/forsale-actions";
import { FS_FUND, FS_REPORT, FS_TYPE, FS_WHEN, listedAgo, money, saleHref, short, where, type SaleCard, type SaleStatus, FS_ST, FS_PHOTOS } from "@/lib/forsale-shared";

type Modal = { type: "ask"; l: { id: string; title: string } } | { type: "lock" } | { type: "report"; l: { id: string; title: string } };
type Ctx = {
  member: boolean; staff: boolean; paid: boolean; userId: string | null;
  toast: (t: string) => void; open: (m: Modal) => void; close: () => void;
  busy: boolean; run: <T>(f: () => Promise<T>) => Promise<T | undefined>;
  sell: () => void;
};
const C = createContext<Ctx | null>(null);
export const useFs = () => useContext(C)!;

export function FsProvider({ children, member, staff, paid, userId }: { children: React.ReactNode; member: boolean; staff: boolean; paid: boolean; userId: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [modal, setModal] = useState<Modal | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useCallback((t: string) => {
    setNote(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(""), 3200);
  }, []);
  useEffect(() => {
    if (!modal) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setModal(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [modal]);
  const run = useCallback(async <T,>(f: () => Promise<T>) => {
    setBusy(true);
    try {
      return await f();
    } catch {
      toast("Something went wrong. Try again.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [toast]);
  const value: Ctx = {
    member, staff, paid, userId, toast, busy, run,
    open: setModal, close: () => setModal(null),
    sell: () => {
      if (!member) return router.push("/auth/sign-up");
      if (!paid) return setModal({ type: "lock" });
      router.push("/for-sale/new");
    },
  };
  return (
    <C.Provider value={value}>
      {children}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal fsmodal" role="dialog" aria-modal="true" aria-labelledby="mt" onClick={(e) => e.stopPropagation()}>
            {modal.type === "ask" ? <AskModal l={modal.l} /> : modal.type === "lock" ? <LockModal /> : <ReportModal l={modal.l} />}
          </div>
        </div>
      )}
      {note && <div className="toast" role="status">{note}</div>}
    </C.Provider>
  );
}

export function FsTabs({ a, mine, unread, saved }: { a: string; mine: number; unread: number; saved: number }) {
  const x = useFs();
  const t: [string, string, string][] = [["forsale", "Browse businesses", "/for-sale"], ["mysales", "My listings", "/for-sale/my-listings"], ["savedsales", "Saved", "/for-sale/saved"]];
  if (x.staff && x.member) t.push(["saleadmin", "Manage listings", "/team/for-sale"]);
  return (
    <nav className="crtabs" aria-label="Businesses for sale">
      {t.map(([k, l, h]) => (
        <Link key={k} href={h} aria-current={a === k ? "page" : undefined}>
          {l}
          {k === "mysales" && unread > 0 ? <> <span className="crbadge2">{unread}</span></> : k === "mysales" && mine > 0 ? <> <span className="muted">{mine}</span></> : null}
          {k === "savedsales" && x.member && saved > 0 && <> <span className="muted">{saved}</span></>}
        </Link>
      ))}
    </nav>
  );
}

export function Flag({ s }: { s: SaleStatus }) {
  if (s === "live") return null;
  const [t, c] = FS_ST[s] ?? FS_ST.live;
  return <span className={`fsflag ${c}`}>{t}</span>;
}

export function SaveBtn({ l, big }: { l: { id: string; saved: boolean }; big?: boolean }) {
  const x = useFs();
  const router = useRouter();
  const [on, setOn] = useState(l.saved);
  useEffect(() => setOn(l.saved), [l.saved]);
  const go = async () => {
    if (!x.member) return router.push("/auth/sign-up");
    const r = await x.run(() => toggleSaleSave(l.id));
    if (!r || r.error) return x.toast(r?.error ?? "Something went wrong. Try again.");
    setOn(!!r.saved);
    x.toast(r.saved ? "Saved. We’ll email you if the price changes." : "Removed from saved");
    router.refresh();
  };
  if (big)
    return (
      <button type="button" className="btn ghost" aria-pressed={on} onClick={go} disabled={x.busy}>
        <Ic n="mark" s={15} fill={on ? "currentColor" : "none"} />{on ? "Saved" : "Save listing"}
      </button>
    );
  return (
    <button type="button" className="iconbtn" aria-label={on ? "Remove from saved" : "Save listing"} aria-pressed={on} onClick={go} disabled={x.busy}>
      <Ic n="mark" s={17} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** The listing card (fsCard). `prev` is the sell form's live preview: no links, no save button, numbers shown. */
export function FsCard({ l, prev }: { l: SaleCard; prev?: boolean }) {
  const x = useFs();
  const href = prev ? undefined : saleHref(l);
  const A = ({ children, ...p }: React.ComponentProps<"a">) => (href ? <Link href={href} {...p}>{children}</Link> : <a {...p}>{children}</a>);
  return (
    <article className="card fsc">
      <A className="fscov" tabIndex={-1} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={l.photo || FS_PHOTOS[0]} alt="" loading="lazy" />
        <Flag s={l.status} />
        {l.type !== "full" && <span className="fstype">{FS_TYPE[l.type]}</span>}
      </A>
      <div className="fscb">
        <span className="crtopic">{l.industry || "Industry"}</span>
        <h3 className="fst"><A>{l.title || "Your listing headline"}</A></h3>
        <span className="small muted fsloc"><Ic n="pin" s={13} />{l.area ? where(l) : "Location"}</span>
        <div className="fsnums">
          <span><small>Asking price</small><b>{l.por ? "On request" : l.price ? money(l.price) : "—"}</b></span>
          {l.type === "assets" ? (
            <span><small>Sale type</small><b>Assets only</b></span>
          ) : x.member || prev ? (
            <span><small>Owner earnings</small><b>{l.earnings ? `${short(l.earnings)} a year` : "—"}</b></span>
          ) : (
            <span className="fslockn"><small>Owner earnings</small><b><Ic n="lock" s={12} />Members</b></span>
          )}
        </div>
        <div className="crfoot">
          {l.checked ? <span className="small fsver"><Ic n="shield" s={14} />Checked by the Hub team</span> : <span className="small muted">{listedAgo(l.created_at)}</span>}
          <span className="grow" />
          {!prev && <SaveBtn l={l} />}
        </div>
      </div>
    </article>
  );
}

export function FsGate({ t, x }: { t: string; x: string }) {
  return (
    <div className="card crempty">
      <span className="sq big"><Ic n="tag" s={22} /></span>
      <strong>{t}</strong>
      <p className="muted">{x}</p>
      <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn" href="/auth/sign-up">Join free</Link>
        <Link className="btn ghost" href="/for-sale">Browse businesses</Link>
      </div>
    </div>
  );
}

export function SellBtn({ cls, style, children }: { cls?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const x = useFs();
  return <button type="button" className={cls ?? "btn"} style={style} onClick={x.sell}>{children}</button>;
}

// ---------- pop-up windows ----------
function AskModal({ l }: { l: { id: string; title: string } }) {
  const x = useFs();
  const router = useRouter();
  const [A, setA] = useState({ fund: FS_FUND[0], when: FS_WHEN[0], msg: "", nda: false });
  const [err, setErr] = useState<{ msg?: string; nda?: string }>({});
  const send = async () => {
    const e: { msg?: string; nda?: string } = {};
    if (A.msg.trim().length < 20) e.msg = "Write at least a sentence or two so the seller knows who you are.";
    if (!A.nda) e.nda = "Tick the box to agree to keep the details private.";
    setErr(e);
    if (Object.keys(e).length) return;
    const r = await x.run(() => enquire(l.id, A.fund, A.when, A.msg, A.nda));
    if (!r || r.error) return x.toast(r?.error ?? "Something went wrong. Try again.");
    x.close();
    x.toast("Sent. The seller will reply in your messages.");
    router.refresh();
  };
  return (
    <>
      <h2 id="mt" style={{ fontSize: 20 }}>Contact the seller</h2>
      <p className="small muted">{l.title}</p>
      <div className="fs2">
        <label className="fsfl" htmlFor="fsa-fund"><span>How will you pay?</span>
          <select className="field" id="fsa-fund" value={A.fund} onChange={(e) => setA({ ...A, fund: e.target.value })}>{FS_FUND.map((o) => <option key={o}>{o}</option>)}</select>
        </label>
        <label className="fsfl" htmlFor="fsa-when"><span>When do you want to buy?</span>
          <select className="field" id="fsa-when" value={A.when} onChange={(e) => setA({ ...A, when: e.target.value })}>{FS_WHEN.map((o) => <option key={o}>{o}</option>)}</select>
        </label>
      </div>
      <label className="fsfl" htmlFor="fsa-msg"><span>Message to the seller</span><small className="muted">Say a little about yourself and what you’d like to know.</small>
        <textarea className="field fsta" id="fsa-msg" rows={4} value={A.msg} maxLength={2000} placeholder="Hi, I run a café in Etobicoke and I’m looking to add a second location…"
          onChange={(e) => { setA({ ...A, msg: e.target.value }); if (err.msg) setErr({ ...err, msg: undefined }); }} />
        {err.msg && <span className="fserr">{err.msg}</span>}
      </label>
      <label className={`fschk fsnda${err.nda ? " bad" : ""}`}>
        <input type="checkbox" checked={A.nda} onChange={(e) => { setA({ ...A, nda: e.target.checked }); setErr({ ...err, nda: undefined }); }} />
        <span><b>I’ll keep this private</b><small className="muted">I won’t share what the seller tells me, and I won’t contact their staff, customers, suppliers or landlord without the seller’s permission.</small></span>
      </label>
      {err.nda && <span className="fserr">{err.nda}</span>}
      <p className="small muted">The seller sees your name, profile and answers. They reply in Hub messages.</p>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={send} disabled={x.busy}><Ic n="send" s={15} />Send to the seller</button>
        <button type="button" className="btn ghost" onClick={x.close}>Cancel</button>
      </div>
    </>
  );
}

function LockModal() {
  const x = useFs();
  const router = useRouter();
  return (
    <>
      <h2 id="mt" style={{ fontSize: 20 }}>Selling a business is for Plus members and Advisors</h2>
      <p className="muted">Only paid members can list a business for sale. It keeps listings real, because every seller is a member the Hub team can reach. Browsing and contacting sellers stays free for everyone.</p>
      <div className="pbbox">
        <strong>With Plus you can:</strong>
        <span className="small">✓ List your business for sale, with your name hidden if you like</span>
        <span className="small">✓ See who saved your listing and reply to buyers in messages</span>
        <span className="small">✓ Post 2 offers a month and get a featured company listing</span>
      </div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={() => { x.close(); router.push("/membership-plans"); }}>See membership plans</button>
        <button type="button" className="btn ghost" onClick={x.close}>Not now</button>
      </div>
    </>
  );
}

function ReportModal({ l }: { l: { id: string; title: string } }) {
  const x = useFs();
  const send = async (reason: string) => {
    const r = await x.run(() => reportListing(l.id, reason));
    if (!r || r.error) return x.toast(r?.error ?? "Something went wrong. Try again.");
    x.close();
    x.toast("Thanks. The Hub team will check this listing.");
  };
  return (
    <>
      <h2 id="mt" style={{ fontSize: 20 }}>Report this listing</h2>
      <p className="small muted">{l.title}</p>
      <div className="stack" style={{ gap: 8 }}>
        {FS_REPORT.map((r) => <button key={r} type="button" className="btn ghost fsrep" disabled={x.busy} onClick={() => send(r)}>{r}</button>)}
      </div>
      <p className="small muted">The Hub team checks every report. The seller won’t see who reported it.</p>
    </>
  );
}
