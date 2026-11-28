"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { blockSite, decideHeld, saveSafetyList, saveSafetyRule, unblockSite, watchDecide } from "@/app/(hub)/safety-actions";
import { teamJob } from "@/app/(hub)/job-actions";
import { toast } from "@/components/toast";
import { Ic } from "@/components/zip/ic";

/** Update 41: the buttons in Moderation's safety tabs. Every action is checked again on the server and logged. */

function useRun() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const run = (save: () => Promise<{ ok?: boolean; error?: string }>, done: string) =>
    start(async () => {
      const r = await save().catch(() => ({ error: "That didn’t save. Try again." }));
      if (r.error) return toast(r.error);
      toast(done);
      router.refresh();
    });
  return { busy, run };
}

const HELD_DONE = {
  approve: "Approved and published",
  remove: "Removed. The member is told which guideline it broke.",
  limit: "Removed, and the account can’t post links or message strangers for 7 days",
  suspend: "Removed and the account is suspended. They can ask for a review by email.",
};

export function HeldActions({ id }: { id: string }) {
  const { busy, run } = useRun();
  const b = (d: keyof typeof HELD_DONE, label: string, red?: boolean) => (
    <button type="button" className={`btn sm ${red ? "sfred" : "ghost"}`} disabled={busy} onClick={() => run(() => decideHeld(id, d), HELD_DONE[d])}>{label}</button>
  );
  return (
    <div className="sfacts">
      {b("approve", "Approve")}
      {b("remove", "Remove")}
      {b("limit", "Remove and limit account")}
      {b("suspend", "Remove and suspend", true)}
    </div>
  );
}

export function WatchActions({ id }: { id: string }) {
  const { busy, run } = useRun();
  return (
    <span className="sfacts">
      <button type="button" className="btn sm ghost" disabled={busy} onClick={() => run(() => watchDecide(id, "fine"), "Marked as fine")}>Looks fine</button>
      <button type="button" className="btn sm ghost" disabled={busy} onClick={() => run(() => watchDecide(id, "limit"), "Limited for 7 days")}>Limit for 7 days</button>
      <button type="button" className="btn sm sfred" disabled={busy} onClick={() => run(() => watchDecide(id, "suspend"), "Account suspended")}>Suspend</button>
    </span>
  );
}

export function UnblockSite({ domain }: { domain: string }) {
  const { busy, run } = useRun();
  return <button type="button" className="linkbtn" disabled={busy} onClick={() => run(() => unblockSite(domain), `${domain} is no longer blocked`)}>Unblock</button>;
}

export function BlockSiteForm() {
  const { busy, run } = useRun();
  const [dom, setDom] = useState("");
  const [why, setWhy] = useState("Phishing or look-alike");
  return (
    <form className="sfadd" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await blockSite(dom, why); if (r.ok) setDom(""); return r; }, `${dom.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]} is blocked everywhere on SME Hub`); }}>
      <label className="sr" htmlFor="sf-dom">Site to block</label>
      <input className="field" id="sf-dom" placeholder="example.com" value={dom} onChange={(e) => setDom(e.target.value)} />
      <label className="sr" htmlFor="sf-why">Why</label>
      <select className="field" id="sf-why" value={why} onChange={(e) => setWhy(e.target.value)}>
        <option>Phishing or look-alike</option>
        <option>Spam</option>
        <option>Scam</option>
      </select>
      <button type="submit" className="btn sm dark" disabled={busy}>Block site</button>
    </form>
  );
}

type Cfg = Record<string, boolean | number>;

export function SafetyRules({ cfg: start, words: w0, names: n0 }: { cfg: Cfg; words: string[]; names: string[] }) {
  const router = useRouter();
  const [cfg, setCfg] = useState(start);
  const [lists, setLists] = useState({ words: w0, names: n0 });
  const [add, setAdd] = useState({ words: "", names: "" });

  const save = (k: string, v: boolean | number) => {
    const before = cfg[k];
    setCfg((c) => ({ ...c, [k]: v }));
    saveSafetyRule(k, v)
      .then((r) => { if (r.error) { setCfg((c) => ({ ...c, [k]: before })); toast(r.error); } else if (typeof v === "boolean") toast("Saved"); })
      .catch(() => { setCfg((c) => ({ ...c, [k]: before })); toast("That didn’t save. Try again."); });
  };
  const saveList = (k: "words" | "names", next: string[]) => {
    const before = lists[k];
    setLists((l) => ({ ...l, [k]: next }));
    saveSafetyList(k, next)
      .then((r) => { if (r.error) { setLists((l) => ({ ...l, [k]: before })); toast(r.error); } else router.refresh(); })
      .catch(() => { setLists((l) => ({ ...l, [k]: before })); toast("That didn’t save. Try again."); });
  };

  const sw = (k: string, l: string, sub?: string) => (
    <div className="sfrow" key={k}>
      <span><b>{l}</b>{sub ? <small>{sub}</small> : null}</span>
      <button type="button" className="sfsw" role="switch" aria-checked={!!cfg[k]} aria-label={l} onClick={() => save(k, !cfg[k])}><i /></button>
    </div>
  );
  const num = (k: string, l: string, opts: number[], sub?: string) => (
    <div className="sfrow" key={k}>
      <span><b>{l}</b>{sub ? <small>{sub}</small> : null}</span>
      <span className="sfseg" role="group" aria-label={l}>
        {opts.map((o) => <button key={o} type="button" aria-pressed={cfg[k] === o} onClick={() => save(k, o)}>{o}</button>)}
      </span>
    </div>
  );
  const list = (k: "words" | "names", label: string, sub: string) => (
    <div className="sfrowc">
      <b>{label}</b>
      <small>{sub}</small>
      <div className="sfchips ed">
        {lists[k].map((w, i) => (
          <span key={`${w}-${i}`}>{w}<button type="button" aria-label={`Remove ${w}`} onClick={() => saveList(k, lists[k].filter((_, j) => j !== i))}><Ic n="x" s={11} /></button></span>
        ))}
        <span className="sfaddw">
          <label className="sr" htmlFor={`sf-${k}`}>Add</label>
          <input id={`sf-${k}`} placeholder="Add…" value={add[k]} onChange={(e) => setAdd((a) => ({ ...a, [k]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = add[k].trim(); if (t) { saveList(k, [...lists[k], t]); setAdd((a) => ({ ...a, [k]: "" })); } } }} />
          <button type="button" onClick={() => { const t = add[k].trim(); if (!t) return; saveList(k, [...lists[k], t]); setAdd((a) => ({ ...a, [k]: "" })); }}>Add</button>
        </span>
      </div>
    </div>
  );

  return (
    <div className="sfpanel sfset">
      <section>
        <h3 className="sfh3">Joining</h3>
        {sw("bot", "Invisible human check", "Cloudflare Turnstile on sign-up, log-in, password reset and the contact form")}
        {sw("code", "Email code before joining", "A 6-digit code proves the email is real")}
        {sw("throwaway", "Block temporary email addresses", "Like mailinator.com and yopmail.com")}
        {num("perIp", "Sign-ups from one connection", [2, 3, 5], "Per hour")}
      </section>
      <section>
        <h3 className="sfh3">Welcome week for new members</h3>
        {num("days", "Length", [3, 7, 14], "Days")}
        {num("fast", "Shorter if they add a photo and make a connection", [2, 3, 5], "Days")}
        {sw("links", "Allow links", "In posts, comments and messages")}
        {sw("groups", "Allow starting groups")}
        {sw("offers", "Allow offers and businesses for sale")}
        {num("conn", "Connection requests a day", [5, 10, 20])}
        {num("msgs", "Messages a day", [10, 20, 40])}
      </section>
      <section>
        <h3 className="sfh3">Everyone</h3>
        {num("allConn", "Connection requests a day", [25, 50, 100])}
        {num("allMsgs", "Messages a day", [50, 100, 200])}
        {num("posts", "Posts an hour", [3, 5, 10])}
        {num("dupes", "Hold the same text after", [2, 3, 5], "Posts or comments")}
        {sw("twostep", "Two-step sign-in required", "For SME Advisors and business page owners")}
      </section>
      <section>
        <h3 className="sfh3">Links and messages</h3>
        {sw("webrisk", "Check links with Google Web Risk", "Blocks known phishing and malware sites")}
        {sw("leave", "Warn before leaving SME Hub", "Shows the real address before members go to another site")}
        {list("words", "Scam words", "Messages with these get a warning, and new members’ posts with them are held.")}
        {list("names", "Protected names", "Members can’t use these in their name, so nobody can pretend to be the Hub team.")}
      </section>
    </div>
  );
}

/** Update 43: a held or reported job: approve it, or remove it. */
export function JobTeamActions({ id, held }: { id: string; held: boolean }) {
  const { busy, run } = useRun();
  return (
    <div className="sfacts">
      {held && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => run(() => teamJob(id, "open"), "Approved. The job is live.")}>Approve</button>}
      {!held && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => run(() => teamJob(id, "open"), "Reports dismissed. The job stays up.")}>Dismiss reports</button>}
      <button type="button" className="btn sm sfred" disabled={busy} onClick={() => run(() => teamJob(id, "removed"), "Job removed")}>Remove job</button>
    </div>
  );
}
