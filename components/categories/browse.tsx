"use client";

import Link from "next/link";
import { useState } from "react";
import { Ic } from "@/components/zip/ic";
import type { Taxo } from "@/lib/categories";

const go = (cat: string, sub = "") => `/businesses?${new URLSearchParams(sub ? { category: cat, q: sub } : { category: cat })}`;

/** Update 15: Browse all categories. Search the list, then pick an industry or speciality to see who offers it. */
export function CategoriesBrowse({ taxo, counts }: { taxo: Taxo; counts: Record<string, number> }) {
  const [q, setQ] = useState("");
  const s = q.toLowerCase().trim();
  const subN = taxo.reduce((n, t) => n + t[2].length, 0);
  const rows = taxo
    .map(([name, icon, all]) => {
      const hit = !!s && name.toLowerCase().includes(s);
      let subs = s ? all.filter((x) => x.toLowerCase().includes(s)) : all;
      if (s && !subs.length && !hit) return null;
      if (hit && !subs.length) subs = all;
      return (
        <section key={name} className="xcat">
          <Link className="xcath" href={go(name)} style={{ textDecoration: "none" }}>
            <span className="xcatico"><Ic n={icon} s={20} /></span>
            <span><b>{name}</b><small>{all.length} specialities{counts[name] ? ` · ${counts[name]} listed` : ""}</small></span>
            <Ic n="right" s={16} />
          </Link>
          <div className="xcatsubs">{subs.map((x) => <Link key={x} className="chip" href={go(name, x)} style={{ textDecoration: "none", color: "var(--ink)", display: "inline-flex", alignItems: "center" }}>{x}</Link>)}</div>
        </section>
      );
    })
    .filter(Boolean);
  return (
    <div className="tlpage">
      <nav className="crumbs small" aria-label="Breadcrumb"><Link href="/businesses">Business Directory</Link> / All categories</nav>
      <section className="tlhero">
        <p className="pgkick2">Browse by category</p>
        <h1>Every kind of Canadian small business</h1>
        <p>{taxo.length} industries and {subN} specialities. Pick one to see the businesses that offer it.</p>
        <label className="gfq" htmlFor="catq" style={{ marginTop: 18, maxWidth: 560 }}>
          <Ic n="search" s={18} /><span className="sr-only">Search categories</span>
          <input id="catq" type="search" placeholder="Try “plumber”, “bakery”, “bookkeeping”" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </section>
      <div className="xcatgrid">
        {rows.length ? rows : <p className="muted">No category matches “{q}”. Try a simpler word, or <Link href="/businesses">search the directory</Link>.</p>}
      </div>
    </div>
  );
}
