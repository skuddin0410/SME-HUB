"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Ic } from "@/components/zip/ic";
import { ZipAv, ago } from "@/components/zip/bits";
import { FsCard, Flag, SaveBtn, useFs } from "@/components/forsale/ui";
import { FS_RE, FS_ST, FS_TYPE, listedAgo, money, priceText, where, type SaleCard, type SaleDetail } from "@/lib/forsale-shared";

function Fact({ ic, k, v, lock }: { ic: string; k: string; v: React.ReactNode; lock?: boolean }) {
  return (
    <div className="fsfact">
      <Ic n={ic} s={18} />
      <span><small>{k}</small><b>{lock ? <span className="fslk"><Ic n="lock" s={12} />Members only</span> : v}</b></span>
    </div>
  );
}

/** One listing (screens 02, 04, 13). Visitors get only what the database sent them. */
export function Listing({ l, similar }: { l: SaleDetail; similar: SaleCard[] }) {
  const x = useFs();
  const m = l.member;
  useEffect(() => {
    if (l.mine) return;
    fetch("/api/sale-view", { method: "POST", body: JSON.stringify({ id: l.id }), keepalive: true }).catch(() => {});
  }, [l.id, l.mine]);
  const asked = l.enquiry;
  const plan = l.seller_plan === "advisor" ? "SME Advisor" : l.seller_plan === "plus" ? "Plus member" : "Member";
  const share = () => {
    const u = `${location.origin}/for-sale/${l.slug}`;
    try {
      void navigator.clipboard.writeText(u);
    } catch {}
    x.toast(`Link copied: ${u}`);
  };
  const msgHref = l.seller ? `/messages?with=${l.seller.id}` : "/messages";
  return (
    <>
      <nav className="fscrumb small"><Link href="/for-sale">Businesses for sale</Link> <span aria-hidden="true">›</span> <span>{l.industry}</span></nav>
      {l.mine && (
        <div className="card fsownbar">
          <span className="grow small"><b>This is your listing.</b> Status: {FS_ST[l.status][0]} · {l.views ?? 0} views · {l.enquiries ?? 0} enquir{l.enquiries === 1 ? "y" : "ies"}</span>
          <Link className="btn sm ghost" href={`/for-sale/${l.id}/edit`}><Ic n="edit" s={14} />Edit</Link>
          <Link className="btn sm" href="/for-sale/my-listings">Manage</Link>
        </div>
      )}
      <div className="fspage">
        <div className="fsmain">
          <div className="fsphoto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.photo} alt={`Photo of the business: ${l.title}`} />
            <Flag s={l.status} />
          </div>
          <div className="card fshead">
            <span className="crtopic">{l.industry} · {FS_TYPE[l.type]}</span>
            <h1 className="fsh1">{l.title}</h1>
            <span className="muted fsloc"><Ic n="pin" s={15} />{where(l)} · {listedAgo(l.created_at)}{l.checked && <> · <span className="fsver"><Ic n="shield" s={14} />Checked by the Hub team</span></>}</span>
            <div className="fsfacts">
              <Fact ic="tag" k="Asking price" v={priceText(l)} />
              {l.type === "assets" ? (
                <Fact ic="list" k="What’s for sale" v="Equipment, stock and brand" />
              ) : (
                <>
                  <Fact ic="chart" k="Yearly sales" v={money(l.sales ?? 0)} lock={!m} />
                  <Fact ic="coin" k="Owner earnings a year" v={money(l.earnings ?? 0)} lock={!m} />
                </>
              )}
              <Fact ic="cal" k="Established" v={l.established ?? ""} />
              {(m ? !!l.employees : l.has_employees) && <Fact ic="users" k="Employees" v={l.employees} lock={!m} />}
              <Fact ic="building" k="Premises" v={FS_RE[l.premises]} />
            </div>
            {m && l.type !== "assets" && <p className="small muted fsdef">Owner earnings: what the business earns for one full-time owner each year, before the owner’s pay, interest and tax. Ask the seller how it’s worked out.</p>}
          </div>
          <section className="card fssec">
            <h2>About the business</h2>
            {l.description.map((t, i) => <p key={i}>{t}</p>)}
            <h3>Highlights</h3>
            <ul className="fsul">{l.highlights.map((t, i) => <li key={i}><Ic n="check" s={15} /><span>{t}</span></li>)}</ul>
            {!m && (
              <>
                <div className="fsblur" aria-hidden="true"><p>Sales have grown each year and the team runs day-to-day operations. The owner will train the new owner and introduce key customers.</p></div>
                <div className="fsgate">
                  <span className="sq big"><Ic n="lock" s={22} /></span>
                  <strong>Join free to see the full listing</strong>
                  <span className="small muted">Yearly sales, owner earnings, what’s included, why the owner is selling, and how to contact the seller.</span>
                  <Link className="btn" href="/auth/sign-up">Join free</Link>
                </div>
              </>
            )}
          </section>
          {m && (
            <section className="card fssec">
              <h2>The sale</h2>
              <dl className="fsdl">
                <div><dt>Type of sale</dt><dd>{FS_TYPE[l.type]}</dd></div>
                <div><dt>Why the owner is selling</dt><dd>{l.reason}</dd></div>
                <div><dt>Premises</dt><dd>{FS_RE[l.premises] + (l.lease ? `. ${l.lease}` : "")}</dd></div>
                <div><dt>Training and handover</dt><dd>{l.training}</dd></div>
                <div><dt>Seller financing</dt><dd>{l.financing ? "Yes. The seller may accept part of the price in payments over time." : "No. The buyer pays the full price at closing."}</dd></div>
                <div><dt>Ideal buyer</dt><dd>{l.buyer}</dd></div>
              </dl>
              {!!l.included?.length && (
                <>
                  <h3>Included in the price</h3>
                  <ul className="fsul fsinc">{l.included.map((t) => <li key={t}><Ic n="check" s={15} /><span>{t}</span></li>)}</ul>
                </>
              )}
              <h3>Documents the seller can share</h3>
              <ul className="fsul">
                {(l.documents ?? []).map((d, i) => (
                  <li key={i}><Ic n={asked?.shared ? "doc" : "lock"} s={15} /><span>{d}{asked?.shared && <> <Link className="small" href={msgHref}>Open</Link></>}</span></li>
                ))}
              </ul>
              <p className="small muted">{asked?.shared ? "The seller shared these documents with you." : "Shared after you contact the seller and agree to keep the details private."}</p>
            </section>
          )}
        </div>
        <aside className="fsside">
          <div className="card fsprice">
            <span className="eyebrow">Asking price</span>
            <span className="fspamt">{priceText(l)}</span>
            {l.financing && m && <span className="small fsfin"><Ic n="coin" s={14} />Seller financing available</span>}
            {l.mine ? (
              <Link className="btn" href="/for-sale/my-listings">See enquiries ({l.enquiries ?? 0})</Link>
            ) : !m ? (
              <>
                <Link className="btn" href="/auth/sign-up">Join free to contact the seller</Link>
                <span className="small muted">Free membership. No credit card.</span>
              </>
            ) : l.status === "offer" ? (
              <>
                <button type="button" className="btn" aria-disabled="true" disabled>Under offer</button>
                <span className="small muted">The seller has accepted an offer. Save it in case the sale falls through.</span>
              </>
            ) : asked ? (
              <>
                <span className="fssent"><Ic n="check" s={15} />Enquiry sent {ago(asked.created_at).toLowerCase()}</span>
                <Link className="btn ghost" href={msgHref}><Ic n="msg" s={15} />Open messages</Link>
              </>
            ) : l.status === "live" ? (
              <button type="button" className="btn" onClick={() => x.open({ type: "ask", l })}><Ic n="msg" s={15} />Contact the seller</button>
            ) : null}
            {!l.mine && <SaveBtn l={l} big />}
            <button type="button" className="btn ghost" onClick={share}><Ic n="send" s={15} />Share</button>
          </div>
          <div className="card fsseller">
            <span className="eyebrow">Seller</span>
            {m ? (
              <>
                {l.seller ? (
                  <Link className="row" style={{ gap: 10, textDecoration: "none", color: "inherit" }} href={`/members/${l.seller.id}`}>
                    <ZipAv name={l.seller.name} src={l.seller.avatar} />
                    <span className="stack" style={{ gap: 1 }}><b>{l.seller.name}</b><span className="small muted">{l.business_name || l.seller.role}</span></span>
                  </Link>
                ) : (
                  <div className="row" style={{ gap: 10 }}>
                    <span className="sq big"><Ic n="eyeoff" s={20} /></span>
                    <span className="stack" style={{ gap: 1 }}><b>Confidential seller</b><span className="small muted">The seller shares their name after you make contact.</span></span>
                  </div>
                )}
                <span className="small fsver"><Ic n="shield" s={14} />{plan} on SME Hub</span>
              </>
            ) : (
              <span className="small muted"><Ic n="lock" s={13} /> Members see who is selling.</span>
            )}
          </div>
          <div className="card fstips">
            <h2 style={{ fontSize: 15 }}><Ic n="shield" s={16} /> Before you buy</h2>
            <ul className="fsul small">
              <li><Ic n="check" s={14} /><span>Ask an accountant to check the financial statements.</span></li>
              <li><Ic n="check" s={14} /><span>Use a lawyer for the offer and purchase agreement.</span></li>
              <li><Ic n="check" s={14} /><span>Never send money to hold a business. SME Hub never asks for payment.</span></li>
            </ul>
            {m && !l.mine && <button type="button" className="linkbtn small" onClick={() => x.open({ type: "report", l })}><Ic n="flag" s={13} /> Report this listing</button>}
          </div>
        </aside>
      </div>
      {similar.length > 0 && (
        <>
          <h2 className="crsec">Similar businesses for sale</h2>
          <div className="fsgrid">{similar.map((o) => <FsCard key={o.id} l={o} />)}</div>
        </>
      )}
    </>
  );
}
