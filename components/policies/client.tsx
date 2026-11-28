"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";

/**
 * Update 45: Cookie settings. Necessary is always on; Analytics and outside players (podcast, video, magazine) only
 * after a yes. The choice lives in this browser (smehub.cookies.v1). Signed-out visitors see a small bar until they choose.
 * Anything that loads an outside tool must call cookieChoice() first.
 */

const KEY = "smehub.cookies.v1";
const OPEN = "hub:cookies";
export type CookieChoice = { set: boolean; analytics: boolean; media: boolean };

export function cookieChoice(): CookieChoice {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as CookieChoice | null;
    if (v && typeof v === "object") return { set: !!v.set, analytics: !!v.analytics, media: !!v.media };
  } catch {}
  return { set: false, analytics: false, media: false };
}
function save(c: CookieChoice) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
  window.dispatchEvent(new CustomEvent("hub:cookies-changed", { detail: c }));
}

export function CookieButton({ className = "polfbtn", label = "Cookie settings" }: { className?: string; label?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN))}>{label}</button>;
}

export function PrintButton() {
  return <button type="button" className="btn sm ghost" onClick={() => setTimeout(() => window.print(), 50)}><Ic n="doc" s={14} />Print</button>;
}

function Sw({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <button type="button" className={`polsw${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={onClick}><i /></button>;
}

export function CookieHost({ member }: { member: boolean }) {
  const [open, setOpen] = useState(false);
  const [bar, setBar] = useState(false);
  const [d, setD] = useState({ analytics: false, media: false });
  useEffect(() => {
    setBar(!member && !cookieChoice().set);
    const on = () => {
      const c = cookieChoice();
      setD({ analytics: c.analytics, media: c.media });
      setOpen(true);
    };
    window.addEventListener(OPEN, on);
    return () => window.removeEventListener(OPEN, on);
  }, [member]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const all = (yes: boolean) => {
    save({ set: true, analytics: yes, media: yes });
    setOpen(false);
    setBar(false);
    toast(yes ? "Optional cookies turned on" : "Only necessary cookies are on");
  };
  return (
    <div className="zip" style={{ display: "contents" }}>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal polmodal" role="dialog" aria-modal="true" aria-labelledby="ckmt" onClick={(e) => e.stopPropagation()}>
            <div className="polmh"><h2 id="ckmt">Cookie settings</h2><button type="button" className="iconbtn" aria-label="Close" onClick={() => setOpen(false)}><Ic n="x" s={18} /></button></div>
            <p className="small muted">Choose which optional tools can run in this browser. You can change this at any time from <b>Cookie settings</b> at the bottom of any page. <Link href="/policies/cookies" onClick={() => setOpen(false)}>Read the cookies notice</Link></p>
            <div className="polck"><span><b>Necessary</b><small>Sign-in, security and remembering these choices. SME Hub can’t work without them.</small></span><span className="polalways">Always on</span></div>
            <div className="polck"><span><b>Analytics</b><small>Helps us see which pages people use and where they get stuck.</small></span><Sw on={d.analytics} label="Analytics" onClick={() => setD((x) => ({ ...x, analytics: !x.analytics }))} /></div>
            <div className="polck"><span><b>Podcast, video and magazine players</b><small>Players from other sites get some device details when they load. If you turn this off, you can still open the content on their site.</small></span><Sw on={d.media} label="Podcast, video and magazine players" onClick={() => setD((x) => ({ ...x, media: !x.media }))} /></div>
            <div className="polmf">
              <button type="button" className="btn ghost sm" onClick={() => all(false)}>Necessary only</button>
              <button type="button" className="btn dark sm" onClick={() => { save({ set: true, ...d }); setOpen(false); setBar(false); toast("Cookie choices saved"); }}>Save my choices</button>
            </div>
          </div>
        </div>
      )}
      {bar && !open && (
        <div className="polbar" role="region" aria-label="Cookie choices">
          <span>We use necessary cookies to run SME Hub. With your OK, we also use analytics and podcast or video players. <Link href="/policies/cookies">Learn more</Link></span>
          <span className="row">
            <CookieButton className="btn sm ghost" label="Choose" />
            <button type="button" className="btn sm ghost" onClick={() => all(false)}>Necessary only</button>
            <button type="button" className="btn sm dark" onClick={() => all(true)}>Accept all</button>
          </span>
        </div>
      )}
    </div>
  );
}
