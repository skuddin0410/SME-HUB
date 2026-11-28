"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { SxNav } from "@/components/zip/settings-x";
import { cancelPlan, keepPlan, saveBillingDetails, startCheckout, stayMonthly, switchToYearly, updateCard } from "@/app/(hub)/billing-actions";
import type { Receipt } from "@/lib/billing-live";

/**
 * Update 34: Plan and billing, inside Settings and privacy. Your plan (with the next payment and HST), this month's
 * numbers, receipts, cancelling with a clear "what changes" box; the card on file and the billing details on the side.
 * It follows the member's real plan (the preview's "Preview as" switch is not on the live site).
 */
export type BlUse = [label: string, used: number | string | null, of: number | string];
export type BlData = {
  plan: "free" | "plus" | "advisor";
  interval: "month" | "year" | null;
  founding: boolean;
  price: number; // before tax
  cancelled: boolean;
  endsOn: string | null;
  next: { total: number; base: number; tax: number; taxLabel: string; date: string } | null;
  card: { brand: string; last4: string; exp: string } | null;
  receipts: Receipt[];
  scheduledYearly: boolean;
  yearlySave: number | null;
  /** Update 43: this Plus subscription keeps the Founding Member price */
  foundingPrice?: boolean;
  usage: BlUse[];
  resets: string;
  details: { business: string; address: string; email: string; tax: string };
  foundingLeft: boolean;
  configured: boolean;
  sections: [string, string, string][];
};

const NAME = { free: "Free", plus: "Plus", advisor: "Advisor" } as const;
const money = (n: number) => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const whole = (n: number) => `$${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

function Bar({ u }: { u: BlUse }) {
  const [label, used, of] = u;
  if (used === null)
    return (
      <div className="blu lock">
        <span className="bll"><b>{label}</b><small><Ic n="lock" s={12} />Comes with {of}</small></span>
      </div>
    );
  if (typeof used === "string" || of === "")
    return (
      <div className="blu">
        <span className="bll"><b>{label}</b><small>{String(used)}</small></span>
      </div>
    );
  const max = Number(of);
  const pc = Math.min(100, Math.round((Number(used) / max) * 100));
  const full = Number(used) >= max;
  return (
    <div className="blu">
      <span className="bll"><b>{label}</b><small>{used} of {max}{full ? " · all used" : ""}</small></span>
      <span className={`blbar${full ? " full" : ""}`} role="img" aria-label={`${used} of ${max} used`}><i style={{ width: `${pc}%` }} /></span>
    </div>
  );
}

export function BillingX({ d }: { d: BlData }) {
  const router = useRouter();
  const [cancelled, setCancelled] = useState(d.cancelled);
  const [switching, setSwitching] = useState(d.scheduledYearly);
  const [confirm, setConfirm] = useState(false);
  const [edit, setEdit] = useState(false);
  const [det, setDet] = useState(d.details);
  const [draft, setDraft] = useState(d.details);
  const [busy, start] = useTransition();
  const P = NAME[d.plan];
  const paid = d.plan !== "free";

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, ok: () => void, msg: string) =>
    start(async () => {
      const r = await fn().catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
      if (!r.ok) return toast(r.error);
      ok();
      toast(msg);
      router.refresh();
    });

  const nextLine = d.next ?? (paid ? { total: d.price, base: d.price, tax: 0, taxLabel: "HST", date: d.endsOn ?? "" } : null);

  return (
    <div className="sxpage">
      <div className="sxhead">
        <div>
          <p className="sxeye"><Ic n="lock" s={12} />Only you can see this page</p>
          <h1>Plan and billing</h1>
        </div>
      </div>
      <div className="sxgrid">
        <SxNav sections={d.sections} cur="billing" />
        <div className="blmain">
          <div className="blcol">
            <section className={`blcard blplan blp-${d.plan}`} aria-labelledby="blh-plan">
              <div className="blptop">
                <div>
                  <p className="bleye">Your plan</p>
                  <h2 id="blh-plan">
                    {P}
                    {paid && <span className="bltag">{d.interval === "year" ? "Yearly" : "Monthly"}</span>}
                    {paid && (d.foundingPrice || d.founding) && <span className="bltag found">{d.foundingPrice ? "Founding price, locked in" : "Founding Member"}</span>}
                  </h2>
                  {paid ? (
                    <p className="blprice">{whole(d.price)} <small>{d.interval === "year" ? "a year" : "a month"} + HST</small></p>
                  ) : (
                    <p className="blprice">$0 <small>No card on file. Free for as long as you like.</small></p>
                  )}
                </div>
                <div className="blpbtn">
                  {paid ? (
                    <Link className="btn ghost" href="/membership-plans">Change plan</Link>
                  ) : (
                    <>
                      <Link className="btn dark" href="/membership-plans?plan=plus">Upgrade to Plus</Link>
                      <Link className="btn ghost" href="/membership-plans">Compare plans</Link>
                    </>
                  )}
                </div>
              </div>
              {!paid && (
                <>
                  <div className="bladds">
                    <b>Plus adds</b>
                    <ul>
                      <li><Ic n="check" s={14} />Featured listing, shown first</li>
                      <li><Ic n="check" s={14} />2 offers a month to all members</li>
                      <li><Ic n="check" s={14} />100 AI questions and grant help</li>
                      <li><Ic n="check" s={14} />See everyone who viewed you</li>
                    </ul>
                  </div>
                  {d.foundingLeft && (
                    <div className="blfound">
                      <Ic n="spark" s={18} />
                      <span><b>Founding Member offer: Plus for $99 in your first year</b><small>For the first 250 members who upgrade. Then $19 a month for as long as you stay on Plus, instead of the regular $25. Switch back to Free at any time.</small></span>
                      <form action={startCheckout.bind(null, "plus", "year", true)}>
                        <button type="submit" className="btn sm dark">Claim $99 price</button>
                      </form>
                    </div>
                  )}
                </>
              )}
              {paid && cancelled && (
                <div className="blnote warn">
                  <Ic n="info" s={16} />
                  <span><b>Your {P} plan ends on {d.endsOn}.</b> After that you are on Free. Nothing is charged again.</span>
                  <button type="button" className="btn sm ghost" disabled={busy} onClick={() => run(keepPlan, () => setCancelled(false), "Welcome back. Your plan continues as before")}>Keep {P}</button>
                </div>
              )}
              {paid && !cancelled && nextLine && (
                <div className="blnote">
                  <Ic n="receipt" s={16} />
                  <span>
                    <b>Next payment: {money(nextLine.total)}{nextLine.date ? ` on ${nextLine.date}` : ""}</b>
                    <small>
                      {whole(Math.round(nextLine.base))}
                      {nextLine.tax ? ` + ${money(nextLine.tax)} ${nextLine.taxLabel}` : " + HST"}
                      {d.card ? `, charged to ${d.card.brand} ending ${d.card.last4}.` : "."}
                      {switching ? " Switches to yearly at this payment." : ""}
                    </small>
                  </span>
                </div>
              )}
              {d.plan === "plus" && d.interval === "month" && !cancelled && d.yearlySave !== null &&
                (switching ? (
                  <button type="button" className="linkbtn blsmall" disabled={busy} onClick={() => run(stayMonthly, () => setSwitching(false), "You stay on monthly")}>Stay on monthly instead</button>
                ) : (
                  <div className="blsave">
                    <Ic n="spark" s={16} />
                    <span><b>Pay yearly and save {whole(d.yearlySave)}</b><small>{d.foundingPrice ? "$190 a year instead of $228. Your founding price stays." : "$240 a year instead of $300."} Starts at your next payment.</small></span>
                    <button type="button" className="btn sm ghost" disabled={busy} onClick={() => run(switchToYearly, () => setSwitching(true), "You switch to yearly at your next payment")}>Switch to yearly</button>
                  </div>
                ))}
            </section>

            <section className="blcard" aria-labelledby="blh-use">
              <header className="blhd"><h2 id="blh-use"><Ic n="gauge" s={16} />This month</h2><span className="small muted">Resets on {d.resets}</span></header>
              <div className="blus">{d.usage.map((u) => <Bar key={u[0]} u={u} />)}</div>
            </section>

            <section className="blcard" aria-labelledby="blh-rec">
              <header className="blhd"><h2 id="blh-rec"><Ic n="receipt" s={16} />Receipts</h2>{d.receipts.length > 0 && <span className="small muted">Emailed from billing@smehub.ca</span>}</header>
              {d.receipts.length ? (
                <div className="bltable" role="table" aria-label="Receipts">
                  <div className="bltr th" role="row">
                    <span role="columnheader">Date</span><span role="columnheader">What for</span><span role="columnheader">Amount</span><span role="columnheader">Status</span><span role="columnheader"><span className="sr">Download</span></span>
                  </div>
                  {d.receipts.map((r) => (
                    <div className="bltr" role="row" key={r.id}>
                      <span role="cell">{r.date}</span>
                      <span role="cell">{r.what}</span>
                      <span role="cell"><b>{money(r.total)}</b><small>incl. HST</small></span>
                      <span role="cell"><em className="blpaid">{r.status}</em></span>
                      <span role="cell">
                        {r.pdf && <a className="btn sm ghost" href={r.pdf} target="_blank" rel="noopener" aria-label={`Download receipt for ${r.date}`}><Ic n="dl" s={14} />PDF</a>}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted small blempty">No receipts yet. When you upgrade, every receipt shows here with HST listed, ready for your bookkeeper.</p>
              )}
            </section>

            {paid && !cancelled && !confirm && (
              <div className="blcancel">
                <span><b>Cancel {P}</b><small>You keep {P} until {d.endsOn ?? "the end of the period you paid for"}, then move to Free. Payments for a period that has started aren’t refunded, unless we made a mistake. <Link href="/policies/membership-terms">Refund terms</Link></small></span>
                <button type="button" className="btn sm ghost" onClick={() => setConfirm(true)}>Cancel plan</button>
              </div>
            )}
            {paid && !cancelled && confirm && (
              <section className="blcard blconfirm" aria-labelledby="blh-can">
                <h2 id="blh-can">Cancel your {P} plan?</h2>
                <p className="small">Here is what changes on {d.endsOn ?? "your renewal date"}:</p>
                <ul className="bllist">
                  <li><b>Stays:</b> your profile, connections, messages, posts and your first business page.</li>
                  <li><b>Stops:</b> featured listing, offers{d.plan === "advisor" ? ", the Advisor badge and intro-call bookings" : ""}, and extra AI questions.</li>
                  <li><b>Hidden, not deleted:</b> extra business pages and private groups. They come back if you upgrade again.</li>
                </ul>
                <div className="blfbtn">
                  <button type="button" className="btn sm dark" onClick={() => setConfirm(false)}>Keep {P}</button>
                  <button
                    type="button"
                    className="btn sm blred"
                    disabled={busy}
                    onClick={() =>
                      run(cancelPlan, () => {
                        setConfirm(false);
                        setCancelled(true);
                        setSwitching(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }, `Cancelled. You keep ${P} until ${d.endsOn ?? "the end of your period"}`)
                    }
                  >
                    {busy ? "Cancelling…" : "Cancel at end of period"}
                  </button>
                </div>
              </section>
            )}
          </div>

          <div className="blcol side">
            <section className="blcard" aria-labelledby="blh-pay">
              <header className="blhd"><h2 id="blh-pay"><Ic n="ccard" s={16} />Payment method</h2></header>
              {d.card ? (
                <>
                  <div className="blvisa">
                    <span className="blcc" aria-hidden="true">{d.card.brand.toUpperCase().slice(0, 4)}</span>
                    <span><b>{d.card.brand} ending {d.card.last4}</b><small>Expires {d.card.exp}</small></span>
                  </div>
                  <form action={updateCard}>
                    <button type="submit" className="btn sm ghost">Update card</button>
                  </form>
                </>
              ) : (
                <p className="small muted">{paid ? "We couldn’t load your card just now." : "No card on file. You only add one if you upgrade."}</p>
              )}
              <p className="blsecure"><Ic n="lock" s={12} />Cards are handled by our payment provider, Stripe. SME Hub never sees or stores your full card number.</p>
            </section>

            <section className="blcard" aria-labelledby="blh-det">
              <header className="blhd">
                <h2 id="blh-det"><Ic n="building" s={16} />Billing details</h2>
                {!edit && <button type="button" className="btn sm ghost" onClick={() => { setDraft(det); setEdit(true); }}>Edit</button>}
              </header>
              {edit ? (
                <form
                  className="blform"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() => saveBillingDetails({ business: draft.business, address: draft.address, email: draft.email, tax: draft.tax }), () => { setDet(draft); setEdit(false); }, "Billing details saved for future receipts");
                  }}
                >
                  <label htmlFor="bl-name">Business name</label>
                  <input id="bl-name" className="field" value={draft.business} maxLength={120} onChange={(e) => setDraft({ ...draft, business: e.target.value })} />
                  <label htmlFor="bl-addr">Address</label>
                  <input id="bl-addr" className="field" value={draft.address} maxLength={200} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
                  <label htmlFor="bl-email">Send receipts to</label>
                  <input id="bl-email" className="field" type="email" value={draft.email} maxLength={254} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                  <label htmlFor="bl-hst">GST/HST number (optional)</label>
                  <input id="bl-hst" className="field" value={draft.tax} maxLength={30} placeholder="123456789 RT0001" onChange={(e) => setDraft({ ...draft, tax: e.target.value })} />
                  <div className="blfbtn">
                    <button type="submit" className="btn sm dark" disabled={busy}>Save</button>
                    <button type="button" className="btn sm ghost" onClick={() => setEdit(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <dl className="bldl">
                    <dt>Business</dt><dd>{det.business || <span className="muted">Not added</span>}</dd>
                    <dt>Address</dt><dd>{det.address || <span className="muted">Not added</span>}</dd>
                    <dt>Receipts to</dt><dd>{det.email}</dd>
                    <dt>GST/HST number</dt><dd>{det.tax || <span className="muted">Not added</span>}</dd>
                  </dl>
                  <p className="small muted">These show on every receipt. Changes apply to future receipts.</p>
                </>
              )}
            </section>

            <section className="blcard blhelp">
              <b>Questions about billing?</b>
              <small>Charged twice, or after you cancelled? Email us your receipt number and we’ll fix it. See <Link href="/policies/membership-terms">Membership, cancellation and refund terms</Link>.</small>
              <small>Email <a href="mailto:billing@smehub.ca">billing@smehub.ca</a> or see <Link href="/help">Upgrade, change or cancel</Link>. Prices are in Canadian dollars. HST is added based on your province.</small>
            </section>
            {!d.configured && <p className="small muted">Payments are being set up. Upgrading opens very soon.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
