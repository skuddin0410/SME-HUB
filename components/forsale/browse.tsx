"use client";
import { Crumbs } from "@/components/zip/crumbs";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { FsCard, FsTabs, SellBtn, useFs } from "@/components/forsale/ui";
import { FS_IND, FS_IND_ICON, FS_PRICE, FS_TYPE, provName, PROVS, type SaleCard, type SaleType } from "@/lib/forsale-shared";

type F = { q: string; ind: string; prov: string; price: string; type: string; sort: string };
const EMPTY = { q: "", ind: "", prov: "", price: "", type: "" };

/** Browse (screens 01, 03, 12). */
export function Browse({ all, tabs }: { all: SaleCard[]; tabs: { mine: number; unread: number; saved: number } }) {
  const x = useFs();
  const [f, setF] = useState<F>({ ...EMPTY, sort: "new" });
  const [open, setOpen] = useState(false);
  const set = (k: keyof F, v: string) => setF((o) => ({ ...o, [k]: v }));
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of all) c[l.industry] = (c[l.industry] ?? 0) + 1;
    return c;
  }, [all]);
  const list = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const out = all.filter((l) => {
      if (f.ind && l.industry !== f.ind) return false;
      if (f.prov && l.province !== f.prov) return false;
      if (f.type && l.type !== f.type) return false;
      if (f.price) {
        const [lo, hi] = f.price.split("-").map(Number);
        if (l.por || l.price < lo || l.price >= hi) return false;
      }
      if (q && `${l.search ?? l.title} ${provName(l.province)}`.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    const off = (l: SaleCard) => Number(l.status === "offer");
    return out.sort((a, b) => {
      if (f.sort === "plo") return (a.por ? 1e15 : a.price) - (b.por ? 1e15 : b.price);
      if (f.sort === "phi") return (b.por ? 0 : b.price) - (a.por ? 0 : a.price);
      return off(a) - off(b) || b.created_at.localeCompare(a.created_at);
    });
  }, [all, f]);
  const act: [keyof F, string][] = [];
  if (f.ind) act.push(["ind", f.ind]);
  if (f.prov) act.push(["prov", provName(f.prov)]);
  if (f.type) act.push(["type", FS_TYPE[f.type as SaleType]]);
  if (f.price) act.push(["price", FS_PRICE.find((p) => p[0] === f.price)![1]]);
  const clear = () => setF((o) => ({ ...EMPTY, sort: o.sort }));
  const sel = (k: keyof F, lab: string, opts: [string, string][]) => (
    <label className="small">{lab}
      <select className="field" value={f[k]} onChange={(e) => set(k, e.target.value)}>{opts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
    </label>
  );
  return (
    <>
      <FsTabs a="forsale" {...tabs} />
      <section className="bdhero fshero">
        <div className="bdh-in">
          <Crumbs items={[["Businesses for sale"]]} />
          <h1>Buy a Canadian small business <span className="hl">that’s already running</span></h1>
          <p className="lead">Every listing comes from a paid SME Hub member. Members see the numbers and contact sellers directly, with no broker in the middle.</p>
          <div className="bdsearch" role="search">
            <span className="bdsf"><Ic n="search" s={18} /><label className="sr" htmlFor="fsq">Search businesses for sale</label>
              <input id="fsq" type="search" placeholder="Type of business, keyword or city" value={f.q} onChange={(e) => set("q", e.target.value)} />
            </span>
            <span className="bdsf bdwhere"><Ic n="home" s={18} /><label className="sr" htmlFor="fsprov">Province</label>
              <select id="fsprov" value={f.prov} onChange={(e) => set("prov", e.target.value)}>
                <option value="">All of Canada</option>
                {PROVS.map((p) => <option key={p[0]} value={p[0]}>{p[1]}</option>)}
              </select>
            </span>
          </div>
          <div className="bdstats">
            <span><b>{all.length}</b> businesses for sale</span>
            <span><b>{Object.keys(counts).length}</b> industries</span>
            <span><b>{all.filter((l) => l.checked).length}</b> checked by the Hub team</span>
          </div>
        </div>
        <div className="bdh-side">
          <div className="bdlist">
            <strong>Thinking of selling?</strong>
            <span className="small">List your business in front of thousands of Canadian owners. Keep your name hidden until you choose to share it.</span>
            <SellBtn style={{ alignSelf: "flex-start" }}><Ic n="tag" s={15} />Sell your business</SellBtn>
            {!x.member ? <span className="small muted">Free to browse. Join free to see the numbers.</span> : !x.paid ? <span className="small muted">Listing is included with Plus and Advisor plans.</span> : null}
          </div>
        </div>
      </section>
      <nav className="bdcats" aria-label="Browse by industry">
        <button type="button" className="bdcat" aria-pressed={!f.ind} onClick={() => set("ind", "")}><Ic n="grid" s={18} /><span>All</span><small>{all.length}</small></button>
        {FS_IND.filter((t) => counts[t]).map((t) => (
          <button key={t} type="button" className="bdcat" aria-pressed={f.ind === t} onClick={() => set("ind", t)}><Ic n={FS_IND_ICON[t] ?? "store"} s={18} /><span>{t}</span><small>{counts[t]}</small></button>
        ))}
      </nav>
      <div className="bdcols">
        <aside className="bdside">
          <button type="button" className="btn ghost bzfbtn" aria-expanded={open} onClick={() => setOpen(!open)}><Ic n="filter" s={15} />Filters{act.length ? ` (${act.length})` : ""}</button>
          <div className={`card bzfilters${open ? " open" : ""}`}>
            <h2 style={{ fontSize: 15 }}>Filters</h2>
            {sel("ind", "Industry", [["", "Any industry"], ...FS_IND.map((v) => [v, v] as [string, string])])}
            {sel("price", "Asking price", FS_PRICE)}
            {sel("type", "Type of sale", [["", "Any type"], ...(Object.keys(FS_TYPE) as SaleType[]).map((k) => [k, FS_TYPE[k]] as [string, string])])}
          </div>
          <div className="card fstips">
            <h2 style={{ fontSize: 15 }}><Ic n="shield" s={16} /> Buying safely</h2>
            <span className="small">Never send a deposit through the Hub. Check the numbers with your accountant, and use a lawyer for the purchase agreement.</span>
            <Link className="small" href="/help/buy-a-business">Read our buyer’s guide</Link>
          </div>
        </aside>
        <section className="bdmain">
          <div className="bdbar">
            <div className="stack grow" style={{ gap: 2, minWidth: 0 }}>
              <h2 className="bdcount" aria-live="polite">{list.length} business{list.length === 1 ? "" : "es"} for sale{f.q ? ` for “${f.q}”` : ""}</h2>
              {act.length > 0 && (
                <div className="chips" aria-label="Active filters">
                  {act.map(([k, v]) => <button key={k} type="button" className="chip" aria-pressed="true" onClick={() => set(k, "")}>{v} ×</button>)}
                  <button type="button" className="linkbtn small" onClick={clear}>Clear all</button>
                </div>
              )}
            </div>
            <label className="small fssort">Sort
              <select className="field" value={f.sort} onChange={(e) => set("sort", e.target.value)}>
                <option value="new">Newest first</option>
                <option value="plo">Price: low to high</option>
                <option value="phi">Price: high to low</option>
              </select>
            </label>
          </div>
          {list.length ? (
            <div className="fsgrid">{list.map((l) => <FsCard key={l.id} l={l} />)}</div>
          ) : (
            <div className="card bdempty">
              <span className="sq big"><Ic n="search" s={22} /></span>
              <strong>No businesses match.</strong>
              <p className="muted">Try another word, or clear the filters. New listings arrive every week.</p>
              <button type="button" className="btn" onClick={clear}>Clear search and filters</button>
            </div>
          )}
          {!x.member && (
            <div className="card fsjoin">
              <div className="stack grow" style={{ gap: 4 }}>
                <strong>See the full numbers on every listing</strong>
                <span className="small">Join SME Hub free to see sales, owner earnings and full details, and to contact sellers.</span>
              </div>
              <Link className="btn" href="/auth/sign-up">Join free</Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
