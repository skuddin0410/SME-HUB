"use client";

import { useState } from "react";
import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { Scene } from "@/components/zip/events-x";
import { toast } from "@/components/toast";
import { ROLES, type Role } from "@/lib/business";
import type { BizCheck } from "@/lib/business-complete";

/** Update 40: My businesses. One card per page you own or help run, your ownership claims, and who can do what. */
export type MxBiz = {
  id: string; slug: string; name: string; cat: string; place: string; status: string; reason: string | null; logo: string | null; cover: string | null;
  role: Role; team: number; can: { edit: boolean; post: boolean; inbox: boolean };
  followers: number; views: number | null; inquiries: number | null; unread: number; reviews: { avg: number | null; n: number }; updates: number;
  checks: BizCheck[] | null; photosTab: boolean;
};
export type MxClaim = { id: string; status: "pending" | "approved" | "rejected"; at: string; decided: string | null; reason: string | null; biz: { id: string; slug: string; name: string; logo_url: string | null } | null };

const ROLE_DO: Record<Role, string> = {
  owner: "Everything: details, updates, inquiries, the team and the page itself",
  manager: "Edit details, post updates and stories, answer inquiries",
  editor: "Post updates and stories as the business",
  responder: "Read and answer inquiries as the business",
};
const STATUS: Record<string, [string, string, string]> = {
  draft: ["Draft", "mxst-draft", "Only your team can see it"],
  pending: ["Waiting for review", "mxst-wait", "The CanadianSME team usually checks new pages within 2 business days"],
  published: ["Live", "mxst-live", "In the Business Directory"],
  rejected: ["Not approved", "mxst-no", "Fix the details below and send it again"],
};

const Logo = ({ b, size }: { b: { name: string; logo: string | null }; size: "l" | "s" }) => (
  <span className={`av ${size} bzav`} aria-hidden="true" style={{ borderRadius: 6 }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {b.logo ? <img src={b.logo} alt="" /> : b.name.charAt(0).toUpperCase()}
  </span>
);

function Card({ b }: { b: MxBiz }) {
  const [open, setOpen] = useState(false);
  const st = STATUS[b.status] ?? [b.status, "", ""];
  const manage = (tab: string) => (tab === "updates" ? `/feed?compose=update&as=${b.id}` : tab === "inbox" ? `/businesses/mine/${b.slug}/inbox` : `/businesses/mine/${b.slug}?tab=${tab === "photos" && !b.photosTab ? "details" : tab}`);
  const C = b.checks;
  const done = C ? C.filter((c) => c.ok).length : 0;
  const pct = C ? Math.round((done / C.length) * 100) : 100;
  const live = b.status === "published";
  const stats: [string, string | number, string][] = [
    ["Followers", b.followers, ""],
    ["Page views", live && b.views !== null ? b.views : "–", "last 30 days"],
    ["Inquiries", b.inquiries ?? "–", b.inquiries === null ? "" : b.unread ? `${b.unread} unread` : "all answered"],
    ["Reviews", b.reviews.n ? `${b.reviews.avg} ★` : "–", b.reviews.n ? `${b.reviews.n} ${b.reviews.n === 1 ? "review" : "reviews"}` : "none yet"],
    ["Updates", b.updates, "posted"],
  ];
  const copy = async () => {
    const url = `${window.location.origin}/businesses/${b.slug}`;
    try { await navigator.clipboard.writeText(url); } catch { /* still say it */ }
    toast(`Link copied: ${url.replace(/^https?:\/\//, "")}`);
  };
  return (
    <article className="mxcard">
      <div className="mxcov">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {b.cover ? <img className="hdrimg" src={b.cover} alt="" /> : <Scene n="awning" h={120} />}
        <span className={`mxst ${st[1]}`}><i />{st[0]}</span>
      </div>
      <div className="mxhead">
        <Logo b={b} size="l" />
        <div className="mxid">
          <h2>{b.name}</h2>
          <p>{b.cat}{b.place ? ` · ${b.place}` : ""}</p>
          <p className="mxrole"><Ic n="users" s={13} />You are the <b>{ROLES[b.role].toLowerCase()}</b>{b.team > 1 ? ` · team of ${b.team}` : ""}</p>
        </div>
        <div className="mxacts">
          {b.can.edit ? <Link className="btn sm dark" href={`/businesses/mine/${b.slug}`}><Ic n="edit" s={14} />Manage page</Link>
            : b.can.inbox ? <Link className="btn sm dark" href={`/businesses/mine/${b.slug}/inbox`}><Ic n="edit" s={14} />Open</Link>
            : <Link className="btn sm dark" href={manage("updates")}><Ic n="edit" s={14} />Open</Link>}
          <Link className="btn sm ghost" href={`/businesses/${b.slug}`}>View page</Link>
        </div>
      </div>
      {!live && (
        <div className={`mxnote ${st[1]}`}>
          <Ic n={b.status === "rejected" ? "alert" : b.status === "pending" ? "clock" : "lock"} s={15} />
          <span><b>{st[0]}.</b> {st[2]}.{b.status === "rejected" && b.reason ? ` Reason: ${b.reason}` : ""}</span>
          {b.status === "draft" && b.can.edit && <Link className="btn sm dark" href={manage("publish")}>Send for review</Link>}
          {b.status === "rejected" && b.can.edit && <Link className="btn sm dark" href={manage("details")}>Fix and resend</Link>}
        </div>
      )}
      <div className="mxstats">{stats.map(([l, v, s]) => <div key={l}><small>{l}</small><b>{v}</b><span>{s}</span></div>)}</div>
      <div className="mxquick">
        {b.can.post && <Link href={manage("updates")}><Ic n="edit" s={15} />Post an update</Link>}
        {b.can.inbox && <Link href={manage("inbox")}><Ic n="mail" s={15} />Answer inquiries{b.unread ? <em>{b.unread}</em> : null}</Link>}
        {b.can.edit && <Link href={manage("details")}><Ic n="clock" s={15} />Hours and closures</Link>}
        {b.can.edit && <Link href={manage("team")}><Ic n="users" s={15} />Team</Link>}
        {live && <button type="button" onClick={copy}><Ic n="link" s={15} />Copy page link</button>}
      </div>
      {C && pct < 100 && (
        <div className="mxprog">
          <button type="button" className="mxph" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className="mxpt"><b>Your page is {pct}% complete</b><small>{C.length - done} quick {C.length - done === 1 ? "step" : "steps"} to a stronger page. Complete pages get more inquiries.</small></span>
            <span className="mxbar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
            <Ic n={open ? "up" : "down"} s={16} />
          </button>
          {open && (
            <ul className="mxchk">
              {C.map((c) => (
                <li key={c.key} className={c.ok ? "ok" : ""}>
                  {c.ok ? <><span className="mxok"><Ic n="check" s={13} /></span><span>{c.label}</span></> : <><span className="mxno" /><Link className="linkbtn" href={manage(c.tab)}>{c.label}</Link></>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {C && pct >= 100 && <div className="mxprog done"><Ic n="check" s={15} /><b>Your page is complete.</b><span>Keep it fresh with an update each month.</span></div>}
    </article>
  );
}

export function MyBusinesses({ biz, claims, latest, owned, limit, canAdd }: { biz: MxBiz[]; claims: MxClaim[]; latest: string[]; owned: number; limit: number; canAdd: boolean }) {
  const date = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="mxpage">
      <div className="mxtop">
        <div>
          <p className="mxeye">Your account</p>
          <h1>My businesses</h1>
          <p className="mxsub">Pages you own or help run, and your ownership claims.</p>
        </div>
        <div className="mxtb">
          {canAdd && <Link className="btn sm dark" href="/businesses/new"><Ic n="plus" s={14} />Add a business</Link>}
          <Link className="btn sm ghost" href="/businesses"><Ic n="search" s={14} />Claim a listed business</Link>
        </div>
      </div>
      {latest.length > 0 && (
        <section className="mxnews"><Ic n="bell" s={16} /><div><b>Latest</b><ul>{latest.map((n) => <li key={n}>{n}</li>)}</ul></div></section>
      )}
      <div className="mxgrid">
        <div className="mxcol">
          {biz.length ? biz.map((b) => <Card key={b.id} b={b} />) : (
            <div className="mxempty">
              <h2>You don’t have a business page yet</h2>
              <p>It’s free. Members find you in the Business Directory and can send you inquiries.</p>
              <div className="mxpaths">
                <Link href="/businesses/new" className="mxpath"><Ic n="plus" s={20} /><b>Add my business</b><span>Takes about 5 minutes. The CanadianSME team checks it before it goes live.</span></Link>
                <Link href="/businesses" className="mxpath"><Ic n="search" s={20} /><b>It’s already listed</b><span>Find it in the directory and claim it. We check you own it first.</span></Link>
              </div>
            </div>
          )}
          {claims.length > 0 && (
            <section className="mxsec">
              <div className="mxsh"><h2>Ownership claims</h2><span>{claims.length}</span></div>
              <div className="mxclaims">
                {claims.map((c) => {
                  const step = c.status === "pending" ? 1 : 2;
                  return (
                    <div key={c.id} className="mxclaim">
                      {c.biz && <Logo b={{ name: c.biz.name, logo: c.biz.logo_url }} size="s" />}
                      <div className="mxci">
                        <b>{c.biz?.name ?? "Business"}</b>
                        <small>Sent {date(c.at)}</small>
                        <ol className="mxtrack">
                          <li className="on">Sent</li>
                          <li className={step >= 1 ? "on" : ""}>Under review</li>
                          <li className={step >= 2 ? (c.status === "approved" ? "on" : "no") : ""}>{c.status === "approved" ? "Approved" : c.status === "rejected" ? "Not approved" : "Decision"}</li>
                        </ol>
                        {c.status === "rejected" && c.reason && <small className="mxwhy">Reason: {c.reason}</small>}
                      </div>
                      {c.status === "approved" && c.biz ? <Link className="btn sm dark" href={`/businesses/mine/${c.biz.slug}`}>Manage page</Link>
                        : c.status === "pending" ? <span className="mxpill wait">Usually 2 to 3 business days</span>
                        : <Link className="btn sm ghost" href="/contact">Contact us</Link>}
                    </div>
                  );
                })}
              </div>
              <p className="mxfine"><Ic n="lock" s={12} />Only the CanadianSME team sees the proof you send.</p>
            </section>
          )}
        </div>
        <aside className="mxside">
          <div className="mxbox">
            <h3>Who can do what</h3>
            <ul className="mxroles">{(Object.keys(ROLES) as Role[]).map((k) => <li key={k}><b>{ROLES[k]}</b><span>{ROLE_DO[k]}</span></li>)}</ul>
            <p className="mxfine">Owners add people from the Team tab of their page.</p>
          </div>
          <div className="mxbox">
            <h3>Your pages</h3>
            <p className="mxfine">You own {owned} of {limit} pages you can add.</p>
            <span className="mxbar" aria-hidden="true"><i style={{ width: `${Math.min(100, (owned / Math.max(1, limit)) * 100)}%` }} /></span>
          </div>
          <div className="mxbox">
            <h3>Help</h3>
            <Link className="mxlink" href="/help/manage-business"><Ic n="doc" s={14} />Manage your business page</Link>
            <Link className="mxlink" href="/help/claim-business"><Ic n="doc" s={14} />Claim a business that is already listed</Link>
            <Link className="mxlink" href="/help/business-roles"><Ic n="doc" s={14} />Business team roles</Link>
            <Link className="mxlink" href="/help/business-images"><Ic n="doc" s={14} />Logo and header sizes</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
