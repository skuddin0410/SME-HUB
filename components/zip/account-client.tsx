"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount, saveDetails, unblockMember, type NetState } from "@/app/(hub)/network-actions";
import { VISIBILITY_FIELDS, VISIBILITY_LEVELS } from "@/lib/profile-extra";
import { Ic } from "@/components/zip/ic";
import { ZipSubmit } from "@/components/zip/submit";

type Details = { visibility: Record<string, string>; private_browsing: boolean };

const LOCKED: [string, string, string][] = [["First name", "About", "public"], ["Last name", "About", "public"], ["Business name", "Business", "public"], ["Industry", "Business", "public"]];
const GROUP: Record<string, string> = { location: "Business", helps_with: "Work history", needs: "Work history", availability: "Contact", social_links: "Contact", followers: "About" };

function Notice({ s }: { s: NetState }) {
  if (s.error) return <p role="alert" className="warnbox">{s.error}</p>;
  if (s.ok) return <p role="status" className="small" style={{ color: "var(--link)" }}>Saved</p>;
  return null;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="sw" onClick={() => onChange(!checked)}>
      <i aria-hidden="true" />
      {label}
    </button>
  );
}

/** Privacy table and profile-view switch share one form, so one Save covers both. */
export function PrivacyCards({ details }: { details: Details }) {
  const [state, action] = useActionState<NetState, FormData>(saveDetails, {});
  const [record, setRecord] = useState(!details.private_browsing);
  return (
    <form action={action} style={{ display: "contents" }}>
      <input type="hidden" name="section" value="privacy" />
      {!record && <input type="hidden" name="private_browsing" value="on" />}
      <div className="card" style={{ gridColumn: "1/-1" }}>
        <h2>Who can see each part of my profile</h2>
        <div className="ftable">
          {LOCKED.map(([l, g, v]) => (
            <div className="frow2" key={l}>
              <span className="stack grow" style={{ gap: 1 }}><strong>{l}</strong><span className="muted small">{g}</span></span>
              <span className="muted small" style={{ display: "flex", gap: 5, alignItems: "center" }}><Ic n="lock" s={12} />{VISIBILITY_LEVELS[v as "public"]} · set by the Hub team</span>
            </div>
          ))}
          {VISIBILITY_FIELDS.map(([f, l]) => (
            <div className="frow2" key={f}>
              <span className="stack grow" style={{ gap: 1 }}><strong>{l}</strong><span className="muted small">{GROUP[f]}</span></span>
              <label className="sr" htmlFor={`mv-${f}`}>Who can see {l}</label>
              <select id={`mv-${f}`} name={`vis_${f}`} className="field" style={{ width: "auto", minHeight: 38 }} defaultValue={details.visibility[f] ?? "public"}>
                {Object.entries(VISIBILITY_LEVELS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
          ))}
        </div>
        <p className="muted small">Public means anyone on the internet. All members means signed-in Hub members. My connections means people you have accepted.</p>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <ZipSubmit>Save privacy</ZipSubmit>
          <Notice s={state} />
        </div>
      </div>
      <div className="card">
        <h2>Profile views</h2>
        <Switch checked={record} onChange={setRecord} label="Record profile views for me" />
        <p className="muted small">When this is on, members you visit can see that you looked, and you can see who viewed you. Turning it off stops both. Press Save privacy to apply.</p>
      </div>
    </form>
  );
}

export function CloseAccount() {
  const [state, action] = useActionState<NetState, FormData>(deleteAccount, {});
  const [ok, setOk] = useState(false);
  return (
    <form action={action} className="card">
      <h2>Close my account</h2>
      <div className="warnbox"><Ic n="flag" s={16} /><span>Closing your account removes your profile, posts and messages. This cannot be undone.</span></div>
      <Switch checked={ok} onChange={setOk} label="I understand the consequences" />
      <label className="stack" style={{ gap: 4, fontSize: 13, fontWeight: 600 }}>
        Type DELETE to confirm
        <input name="confirm" autoComplete="off" className="field" style={{ maxWidth: 220 }} disabled={!ok} />
      </label>
      {state.error && <p role="alert" className="warnbox">{state.error}</p>}
      <ZipSubmit disabled={!ok} className="btn sm"><span style={{ color: "#fff" }}>Close my account</span></ZipSubmit>
    </form>
  );
}

export function Unblock({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <button type="button" className="btn sm ghost" disabled={pending} onClick={() => start(async () => { await unblockMember(id); router.refresh(); })}>Unblock</button>;
}

export function SoonButton({ title }: { title: string }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <button type="button" className="btn" style={{ alignSelf: "flex-start", marginTop: "auto" }} aria-label={`Start course: ${title}`} onClick={() => setShown(true)}>Start course</button>
      {shown && <p role="status" className="small muted">Lessons for this course are being added. Check back soon.</p>}
    </>
  );
}
