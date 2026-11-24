"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Ic } from "@/components/zip/ic";
import { ZipAv, ago } from "@/components/zip/bits";
import { FsTabs, SellBtn, useFs } from "@/components/forsale/ui";
import { enquiriesSeen, openThread, setSaleStatus, shareDocs } from "@/app/(hub)/forsale-actions";
import { FS_ST, priceText, where, type SaleStatus } from "@/lib/forsale-shared";
import type { Enquiry, ListingRow } from "@/lib/forsale";

const DONE: Record<string, string> = {
  offer: "Marked as under offer. Buyers can still save it.",
  paused: "Paused. Buyers can’t see it until you show it again.",
  live: "Your listing is live again",
  sold: "Congratulations on the sale! The listing is now hidden from buyers.",
};

/** My listings and their enquiries (screen 09). */
export function MyListings({ listings, enquiries, tabs }: { listings: ListingRow[]; enquiries: Record<string, Enquiry[]>; tabs: { mine: number; unread: number; saved: number } }) {
  const x = useFs();
  const router = useRouter();
  useEffect(() => {
    if (tabs.unread > 0) void enquiriesSeen();
  }, [tabs.unread]);
  const st = async (l: ListingRow, s: SaleStatus) => {
    const r = await x.run(() => setSaleStatus(l.id, s));
    if (!r || r.error) return x.toast(r?.error ?? "Something went wrong. Try again.");
    x.toast(DONE[s]);
    router.refresh();
  };
  const reply = async (e: Enquiry) => {
    const r = await x.run(() => openThread(e.id));
    if (!r || r.error || !r.buyer) return x.toast(r?.error ?? "Something went wrong. Try again.");
    router.push(`/messages?with=${r.buyer}`);
  };
  const share = async (l: ListingRow, e: Enquiry) => {
    const r = await x.run(() => shareDocs(e.id));
    if (!r || r.error) return x.toast(r?.error ?? "Something went wrong. Try again.");
    x.toast(`Shared with ${e.buyer.name}${l.confidential ? ". They can now see your name." : ""}`);
    router.refresh();
  };
  const head = <FsTabs a="mysales" {...tabs} />;
  if (!listings.length)
    return (
      <>
        {head}
        <div className="card crempty">
          <span className="sq big"><Ic n="tag" s={22} /></span>
          <strong>You haven’t listed a business for sale</strong>
          <p className="muted" style={{ maxWidth: 520 }}>List your business in front of Canadian owners and buyers. You can hide your name and business name until you choose to share them.</p>
          <SellBtn><Ic n="tag" s={15} />Sell your business</SellBtn>
          {!x.paid && <span className="small muted">Listing a business for sale is included with Plus and Advisor plans.</span>}
        </div>
      </>
    );
  return (
    <>
      {head}
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", marginBottom: 12 }}>
        <h1 className="crh1s">My listings</h1>
        <SellBtn cls="btn sm"><Ic n="plus" s={14} />New listing</SellBtn>
      </div>
      {listings.map((l) => {
        const E = enquiries[l.id] ?? [];
        const [label, cls] = FS_ST[l.status];
        return (
          <section key={l.id} className="card fsmy">
            <div className="fsmyrow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="fsmyimg" src={l.photo_url} alt="" />
              <div className="stack grow" style={{ gap: 4, minWidth: 0 }}>
                <span className={`fsst ${cls}`}>{label}</span>
                <Link className="fsmyt" href={`/for-sale/${l.slug}`}>{l.title}</Link>
                <span className="small muted">{priceText({ por: l.price_on_request, price: l.price })} · {where({ area: l.area_shown, province: l.province })} · {l.confidential ? "Name hidden" : "Name shown"}</span>
              </div>
              <div className="fsstats">
                <span><b>{l.views}</b><small>views</small></span>
                <span><b>{l.saves}</b><small>saves</small></span>
                <span><b>{E.length}</b><small>enquiries</small></span>
              </div>
            </div>
            <div className="row fsmyact">
              <Link className="btn sm ghost" href={`/for-sale/${l.id}/edit`}><Ic n="edit" s={14} />Edit</Link>
              {l.status === "live" && (
                <>
                  <button type="button" className="btn sm ghost" disabled={x.busy} onClick={() => st(l, "offer")}>Mark as under offer</button>
                  <button type="button" className="btn sm ghost" disabled={x.busy} onClick={() => st(l, "paused")}>Pause</button>
                </>
              )}
              {l.status === "offer" && <button type="button" className="btn sm ghost" disabled={x.busy} onClick={() => st(l, "live")}>Back on the market</button>}
              {l.status === "paused" && <button type="button" className="btn sm" disabled={x.busy} onClick={() => st(l, "live")}>Show it again</button>}
              {(l.status === "live" || l.status === "offer") && <button type="button" className="btn sm ghost" disabled={x.busy} onClick={() => st(l, "sold")}>Mark as sold</button>}
            </div>
            {l.status === "hidden" && <p className="small fswarn">The Hub team has hidden this listing while they check it. You’ll get an email from the team.</p>}
            <h2 className="fsenqh">Enquiries <span className="muted">{E.length}</span></h2>
            {E.length ? (
              E.map((e) => (
                <div key={e.id} className="fsenq">
                  <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                    <ZipAv name={e.buyer.name} src={e.buyer.avatar} size="s" />
                    <div className="stack grow" style={{ gap: 3, minWidth: 0 }}>
                      <span><b>{e.buyer.name}</b> <span className="small muted">{e.buyer.role} · {ago(e.created_at).toLowerCase()}</span></span>
                      <span className="small fsenqtags"><span>{e.funding}</span><span>{e.timing}</span><span><Ic n="check" s={12} />Agreed to keep details private</span></span>
                      <p className="small">{e.message}</p>
                      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                        <button type="button" className="btn sm" disabled={x.busy} onClick={() => reply(e)}><Ic n="msg" s={14} />Reply</button>
                        {e.docs_shared_at ? (
                          <span className="small fssent"><Ic n="check" s={14} />Documents shared{l.confidential ? " and name shown" : ""}</span>
                        ) : (
                          <button type="button" className="btn sm ghost" disabled={x.busy} onClick={() => share(l, e)}><Ic n="doc" s={14} />Share documents{l.confidential ? " and my name" : ""}</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="small muted">No enquiries yet. Most listings get their first enquiry in the first week. Share your listing to reach more buyers.</p>
            )}
          </section>
        );
      })}
    </>
  );
}
