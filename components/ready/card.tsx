"use client";

import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { READY_ROWS, readyCount, type ReadyItems } from "@/lib/ready-shared";
import { useReady } from "./provider";

/** The five steps, as the card and the Spotlight page list them. */
export function ReadyRows() {
  const r = useReady();
  if (!r) return null;
  const { me } = r;
  return (
    <ol className="gslist">
      {READY_ROWS.map(([key, title, text, label]) => {
        const ok = me.items[key];
        return (
          <li key={key} className={ok ? "done" : ""}>
            <span className="gsck" aria-hidden="true">{ok ? "✓" : ""}</span>
            <span className="stack grow" style={{ gap: 1, minWidth: 0 }}>
              <strong>{title}</strong>
              <span className="muted small">{text}</span>
            </span>
            {ok ? (
              <span className="sr">Done</span>
            ) : key === "photo" ? (
              <label className="btn sm ghost pcup">{label}<input type="file" accept="image/*" className="sr" id="pcphoto" onChange={(e) => r.upload(e.target.files?.[0])} /></label>
            ) : key === "biz" ? (
              <button type="button" className="btn sm" onClick={r.openAi}><Ic n="spark" s={14} />{label}</button>
            ) : (
              <button type="button" className="btn sm ghost" onClick={() => r.openEdit(key)}>{label}</button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** "Your profile is N of 5 ready". Shows until all five are done, at the top of Home and of the member's own profile. */
export function ReadyCard({ where, miss }: { where: "home" | "profile"; miss: [string, string] }) {
  const r = useReady();
  if (!r || r.me.count === 5) return null;
  const { me } = r;
  const n = me.count;
  return (
    <div className={`zip`} style={{ display: "contents" }}>
      <div className={`card gs4 pccard${where === "profile" ? " pcprof" : ""}`} id="pccard">
        <div className="row" style={{ flexWrap: "wrap" }}>
          <div className="stack grow" style={{ gap: 2, flexBasis: 240 }}>
            <p className="eyebrow">Your profile</p>
            <h2 style={{ font: "800 19px var(--display)" }}>Your profile is {n} of 5 ready</h2>
          </div>
          <span className="muted small">{5 - n} step{5 - n === 1 ? "" : "s"} left</span>
        </div>
        <div className="bar" role="img" aria-label={`${n} of 5 ready`}><i style={{ width: `${n * 20}%` }} /></div>
        <div className="pcmiss">
          <span className="pcmi" aria-hidden="true"><Ic n="eye" s={16} /></span>
          <span><strong>{miss[0]}</strong> {miss[1]}</span>
        </div>
        <div className={`gsgrid${me.items.biz ? " pcone" : ""}`}>
          <ReadyRows />
          {!me.items.biz && (
            <div className="gsval pcai">
              <span className="eyebrow">Fastest way</span>
              <strong>Let AI set it up from your website</strong>
              <span className="small muted">Paste your website or Google listing. AI drafts your profile and business page. You check it before anything is saved.</span>
              <button type="button" className="btn sm" onClick={r.openAi}><Ic n="spark" s={14} />Set it up for me</button>
              <span className="small muted">Takes about 30 seconds.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The profile box in the right rail: "Profile ready N of 5" with the next step. */
export function ReadyStrength({ items }: { items: ReadyItems }) {
  const r = useReady();
  const n = readyCount(items);
  const nx = READY_ROWS.find(([k]) => !items[k]);
  return (
    <div className="strength">
      <div className="row"><strong className="grow" style={{ fontWeight: 500, fontSize: 13 }}>Profile ready</strong><b style={{ color: "var(--accent)", fontFamily: "var(--display)" }}>{n} of 5</b></div>
      <div className="bar" role="img" aria-label={`${n} of 5 ready`}><i style={{ width: `${n * 20}%` }} /></div>
      {nx ? (
        <div className="row">
          <span className="muted small grow">Next: {nx[1].toLowerCase()}</span>
          <button type="button" className="linkbtn" style={{ color: "var(--accent)", fontWeight: 600, whiteSpace: "nowrap" }} onClick={() => r?.next()}>Finish →</button>
        </div>
      ) : (
        <span className="muted small">Ready. You show up in search, the Directory and suggestions.</span>
      )}
    </div>
  );
}

/** The two soft-limit banners: the Business Directory ("Your business isn't in the Directory yet") and Members ("Other members can't find you yet"). */
export function ReadyBanner({ kind }: { kind: "biz" | "people" }) {
  const r = useReady();
  if (!r) return null;
  const { me } = r;
  if (kind === "biz" && !me.items.biz) {
    return (
      <div className="card pcban">
        <Ic n="store" s={18} />
        <div className="stack grow" style={{ gap: 2 }}>
          <strong>Your business isn’t in the Directory yet</strong>
          <span className="muted small">Owners searching here can’t find you. AI can set up your business page from your website in about 30 seconds.</span>
        </div>
        <button type="button" className="btn sm" onClick={r.openAi}><Ic n="spark" s={14} />Set it up</button>
      </div>
    );
  }
  if (kind === "people" && me.count < 5) {
    return (
      <div className="card pcban">
        <Ic n="eyeoff" s={18} />
        <div className="stack grow" style={{ gap: 2 }}>
          <strong>Other members can’t find you yet</strong>
          <span className="muted small">You show up in member search and daily “People to meet” once your profile is ready. You’re {me.count} of 5.</span>
        </div>
        <Link className="btn sm ghost" href="/feed">Finish my profile</Link>
      </div>
    );
  }
  return null;
}

/** On the member's own profile once it is ready: the way into the Member Spotlight. */
export function SpotlightBanner() {
  return (
    <div className="zip" style={{ display: "contents" }}>
      <div className="card pcban pcspotban">
        <Ic n="crown" s={18} />
        <div className="stack grow" style={{ gap: 2 }}>
          <strong>You can apply for the Member Spotlight</strong>
          <span className="muted small">Your profile is ready. Get featured in CanadianSME Small Business Magazine.</span>
        </div>
        <Link className="btn sm" href="/spotlight">Apply</Link>
      </div>
    </div>
  );
}
