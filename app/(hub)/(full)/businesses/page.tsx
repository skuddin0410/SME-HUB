/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ftsQuery, getViewer } from "@/lib/hub";
import { Stars } from "@/components/business-client";
import { BusinessMap, type BusinessCity } from "@/components/business-map";
import { Ic } from "@/components/zip/ic";
import { LiveForm } from "@/components/zip/live-form";
import { Join } from "@/components/zip/bits";
import { KINDS } from "@/lib/business";
import { getBusinessSettings } from "@/lib/business-server";
import { PROVINCES } from "@/lib/profile-extra";
import { pageMeta } from "@/lib/seo";
import { ReadyBanner } from "@/components/ready/card";
import { logDirectorySearch } from "@/app/(hub)/ready-actions";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Business directory", description: "Find Canadian small businesses by name, category, city and member rating in the SME Hub directory.", path: "/businesses" });

const SIZE = 24;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const KIND_LABEL: Record<string, string> = { storefront: "Visit in person", service: "Comes to you", online: "Online" };
const CAT_ICON: Record<string, string> = {
  "Food & Drink": "store", "Catering & Events": "cal", Retail: "tag", "Professional Services": "users", "Finance & Accounting": "coin", Legal: "book",
  "Construction & Trades": "building", "Home Services": "home", Technology: "spark", "Logistics & Transport": "send", "Health & Wellness": "help",
  Manufacturing: "building", "Marketing & Design": "edit",
};
const BCOL = ["#1D4ED8", "#B91C1C", "#047857", "#7C3AED", "#B45309", "#0E7490", "#BE185D", "#4D7C0F"];
const hsh = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const hue = (s: string) => [212, 12, 152, 32, 268, 190, 340, 96][hsh(s) % 8];

type Row = {
  id: string; slug: string; name: string; category: string; description: string; logo_url: string | null; cover_url: string | null;
  city: string; province: string; kind: string; rating: number | null; reviews: number; followers: number; is_open: boolean; claimable: boolean;
};
type Facets = { total: number; open_now: number; categories: { category: string; n: number }[]; provinces: string[]; cities: { city: string; province: string }[] };

const initials = (n: string) => {
  const w = n.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean);
  return ((w[0]?.[0] ?? "?") + (w[1]?.[0] ?? "")).toUpperCase();
};

function Logo({ b }: { b: Row }) {
  return b.logo_url ? (
    <span className="av l bzav" aria-hidden="true">
      <img src={b.logo_url} alt="" />
    </span>
  ) : (
    <span className="av l bzav" aria-hidden="true" style={{ background: BCOL[hsh(b.id) % BCOL.length], color: "#fff", fontWeight: 800 }}>
      {initials(b.name)}
      </span>
  );
}

function Cover({ b, h }: { b: Row; h: number }) {
  return b.cover_url ? (
    <img className="hdrimg" src={b.cover_url} alt="" />
  ) : (
    <span style={{ display: "block", height: h, background: `linear-gradient(135deg, hsl(${hue(b.id)} 60% 86%), hsl(${(hue(b.id) + 40) % 360} 55% 76%))` }} />
  );
}

function Rating({ b }: { b: Row }) {
  return b.reviews > 0 && b.rating != null ? (
    <span className="small">
      <Stars value={Number(b.rating)} size={13} /> <strong>{Number(b.rating).toFixed(1)}</strong> <span className="muted">({b.reviews})</span>
    </span>
  ) : (
    <span className="muted small">No reviews yet</span>
  );
}

function Card({ b, list }: { b: Row; list: boolean }) {
  const place = b.city ? `${b.city}, ${b.province}` : b.province;
  if (list)
    return (
      <Link className="card bzcard bzrow" href={`/businesses/${b.slug}`}>
        <Logo b={b} />
        <span className="stack grow" style={{ gap: 3, minWidth: 0 }}>
          <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <strong className="bzname">{b.name}</strong>
            {b.claimable && <span className="pill">Unclaimed</span>}
          </span>
          <span className="muted small">{b.category} · {place}</span>
          <span className="small bzdesc">{b.description}</span>
          <span className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <Rating b={b} />
            <span className={`bzopen ${b.is_open ? "open" : "closed"} small`}>{b.is_open ? "Open now" : "Closed"}</span>
          </span>
        </span>
        <span className="bzgo" aria-hidden="true">
          <Ic n="right" s={18} />
        </span>
      </Link>
    );
  return (
    <Link className="card bzcard bzc2" href={`/businesses/${b.slug}`}>
      <span className="bzc2cov" aria-hidden="true">
        <Cover b={b} h={90} />
        <span className="bzkind">{KIND_LABEL[b.kind] ?? b.kind}</span>
      </span>
      <span className="bzc2body">
        <span className="bzc2logo">
          <Logo b={b} />
        </span>
        <span className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <strong className="bzname">{b.name}</strong>
          {b.claimable && <span className="pill">Unclaimed</span>}
        </span>
        <span className="muted small">{b.category} · {place}</span>
        <span className="small bzdesc">{b.description}</span>
        <span className="bzc2foot">
          <Rating b={b} />
          <span className={`bzopen ${b.is_open ? "open" : "closed"} small`}>{b.is_open ? "Open now" : "Closed"}</span>
        </span>
      </span>
    </Link>
  );
}

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const { supabase, userId } = await getViewer();
  const settings = await getBusinessSettings();
  const category = settings.categories.includes(one(sp.category)) ? one(sp.category) : "";
  const province = (PROVINCES as readonly string[]).includes(one(sp.province)) ? one(sp.province) : "";
  const city = one(sp.city).slice(0, 80);
  // a real signal for "owners near you searched for businesses like yours" (Update 3)
  if (userId && (q || category || province || city)) await logDirectorySearch(q, category, city, province);
  const kind = one(sp.kind) in KINDS ? one(sp.kind) : "";
  const open = one(sp.open) === "1";
  const sortKey = one(sp.sort);
  const sort = sortKey === "new" ? "new" : sortKey === "name" ? "name" : "rating";
  const view = ["list", "map"].includes(one(sp.view)) ? one(sp.view) : "grid";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [{ data }, facetRes] = await Promise.all([
    supabase.rpc("search_businesses", { q: ftsQuery(q) ?? "", p_cat: category, p_prov: province, p_city: city, p_kind: kind, p_open: open, p_sort: sort, p_limit: SIZE, p_offset: (page - 1) * SIZE }),
    supabase.rpc("directory_facets"),
  ]);
  const rows = (data ?? []) as Row[];
  const facets = (facetRes.data ?? { total: 0, open_now: 0, categories: [], provinces: [], cities: [] }) as Facets;
  const cityRows = view === "map" ? (((await supabase.rpc("business_map_cities", { p_cat: category, p_kind: kind })).data ?? []) as BusinessCity[]) : [];
  const cityOptions = facets.cities.filter((c) => !province || c.province === province).map((c) => c.city);

  const base: Record<string, string> = { q, category, province, city, kind, ...(open ? { open: "1" } : {}), ...(sort !== "rating" ? { sort } : {}), ...(view !== "grid" ? { view } : {}) };
  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries({ ...base, ...over }).filter(([, v]) => v) as [string, string][]).toString();
    return p ? `/businesses?${p}` : "/businesses";
  };
  const active: [string, string][] = [];
  if (category) active.push(["category", category]);
  if (province) active.push(["province", province]);
  if (city) active.push(["city", city]);
  if (kind) active.push(["kind", KIND_LABEL[kind] ?? kind]);
  if (open) active.push(["open", "Open now"]);

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <section className="bdhero">
          <div className="bdh-in">
            <p className="eyebrow">Business Directory</p>
            <h1>
              Find a Canadian small business <span className="hl">you can trust</span>
            </h1>
            <p className="lead">Search by service and place. See who is open, read member reviews, then message the business directly.</p>
            <form className="bdsearch" role="search" action="/businesses">
              <span className="bdsf">
                <Ic n="search" s={18} />
                <label className="sr" htmlFor="bdq">What are you looking for?</label>
                <input id="bdq" name="q" type="search" placeholder="Service, keyword or business name" defaultValue={q} />
              </span>
              <span className="bdsf bdwhere">
                <Ic n="home" s={18} />
                <label className="sr" htmlFor="bdwhere">Where</label>
                <select id="bdwhere" name="province" defaultValue={province}>
                  <option value="">All of Canada</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </span>
              <button type="submit" className="sr">Search</button>
            </form>
            <div className="bdstats">
              <span><b>{facets.total}</b> businesses</span>
              <span><b>{facets.categories.length}</b> categories</span>
              <span><b>{facets.provinces.length}</b> provinces</span>
              <span><b className="bzopen open">{facets.open_now}</b> open now</span>
            </div>
          </div>
          <div className="bdh-side">
            {userId ? (
              <div className="bdlist">
                <strong>Own a business?</strong>
                <span className="small">Add a free page in two minutes, or claim a listing the CanadianSME team created.</span>
                <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                  <Link className="btn" href="/businesses/new"><Ic n="store" s={15} />Add a business</Link>
                  <Link className="btn ghost" href="/businesses/mine">My Businesses</Link>
                </div>
              </div>
            ) : (
              <div className="bdlist">
                <strong>Own a business?</strong>
                <span className="small">Members can add a free business page.</span>
                <Join start>Join free</Join>
              </div>
            )}
          </div>
        </section>
        {userId && <ReadyBanner kind="biz" />}

        <nav className="bdcats" aria-label="Browse by category">
          <Link className="bdcat" aria-current={!category ? "true" : undefined} href={href({ category: "", page: "" })}>
            <Ic n="grid" s={18} />
            <span>All</span>
            <small>{facets.total}</small>
          </Link>
          {facets.categories.map((c) => (
            <Link key={c.category} className="bdcat" aria-current={category === c.category ? "true" : undefined} href={href({ category: c.category })}>
              <Ic n={CAT_ICON[c.category] ?? "grid"} s={18} />
              <span>{c.category}</span>
              <small>{c.n}</small>
            </Link>
          ))}
        </nav>

        <div className="bdcols">
          <aside className="bdside">
            <LiveForm className="card bzfilters open">
              <h2 style={{ fontSize: 15 }}>Filters</h2>
              {q && <input type="hidden" name="q" value={q} />}
              {sort !== "rating" && <input type="hidden" name="sort" value={sort} />}
              {view !== "grid" && <input type="hidden" name="view" value={view} />}
              <label className="small">
                Category
                <select className="field" name="category" defaultValue={category}>
                  <option value="">All categories</option>
                  {settings.categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="small">
                Province or territory
                <select className="field" name="province" defaultValue={province}>
                  <option value="">All of Canada</option>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="small">
                City
                <select className="field" name="city" defaultValue={city}>
                  <option value="">Any city</option>
                  {cityOptions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <fieldset className="bdkind">
                <legend className="small">How they serve you</legend>
                {[["", "Any"], ["storefront", "Visit in person"], ["service", "Comes to you"], ["online", "Online"]].map(([k, l]) => (
                  <Link key={k} className="chip" aria-current={kind === k ? "true" : undefined} href={href({ kind: k })} style={{ textDecoration: "none" }}>
                    {l}
                  </Link>
                ))}
              </fieldset>
              <Link className="sw" role="switch" aria-checked={open} href={href({ open: open ? "" : "1" })}>
                <i />
                <span>Open now</span>
              </Link>
              {active.length > 0 && (
                <Link className="small" href={href({ category: "", province: "", city: "", kind: "", open: "" })} style={{ alignSelf: "flex-start", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                  Clear all filters
                </Link>
              )}
              <noscript>
                <button type="submit" className="btn sm">Apply</button>
              </noscript>
            </LiveForm>
            <Link className="card bdpav" href="/businesses" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="claim">New</span>
              <strong>Made in Canada Pavilion</strong>
              <span className="muted small">Canadian manufacturers, services and AI tools in one place.</span>
              <span className="small" style={{ color: "var(--link)", fontWeight: 600 }}>Visit the pavilion →</span>
            </Link>
          </aside>

          <section className="bdmain">
            <div className="bdbar">
              <div className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                <h2 className="bdcount" aria-live="polite">
                  {rows.length}{rows.length === SIZE ? "+" : ""} business{rows.length === 1 ? "" : "es"}
                  {q ? ` for “${q}”` : ""}
                </h2>
                {active.length > 0 && (
                  <div className="chips" aria-label="Active filters">
                    {active.map(([k, l]) => (
                      <Link key={k} className="chip" aria-current="true" href={href({ [k]: "" })} style={{ textDecoration: "none" }}>
                        {l} ×
                      </Link>
                    ))}
                    <Link className="small" href={href({ category: "", province: "", city: "", kind: "", open: "" })} style={{ textDecoration: "none", color: "var(--accent)" }}>
                      Clear all
                    </Link>
                  </div>
                )}
              </div>
              <LiveForm>
                {Object.entries({ q, category, province, city, kind, ...(open ? { open: "1" } : {}), ...(view !== "grid" ? { view } : {}) })
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                <label className="sr" htmlFor="bdsort">Sort</label>
                <select id="bdsort" name="sort" className="field" style={{ width: "auto", minHeight: 38 }} defaultValue={sort}>
                  <option value="rating">Recommended</option>
                  <option value="new">Newest</option>
                  <option value="name">Name, A to Z</option>
                </select>
              </LiveForm>
              <span className="vsw" role="group" aria-label="View">
                {([["grid", "Grid"], ["list", "List"], ["map", "Map"]] as const).map(([v, l]) => (
                  <Link key={v} href={href({ view: v === "grid" ? "" : v })} aria-current={view === v ? "true" : undefined} style={{ textDecoration: "none" }}>
                    {l}
                  </Link>
                ))}
              </span>
            </div>

            {view === "map" && <BusinessMap cities={cityRows} token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN} base={href({})} />}
            {rows.length === 0 ? (
              <div className="card bdempty">
                <span className="sq big"><Ic n="search" s={22} /></span>
                <strong>No businesses match.</strong>
                <p className="muted">Try fewer words, another city, or all of Canada.</p>
                <Link className="btn" href="/businesses">Clear search and filters</Link>
              </div>
            ) : view !== "map" ? (
              <div className={view === "list" ? "bzlist" : "bzgrid bdgrid"}>
                {rows.map((b) => (
                  <Card key={b.id} b={b} list={view === "list"} />
                ))}
              </div>
            ) : null}
            <div className="row" style={{ justifyContent: "center", gap: 10 }}>
              {page > 1 && <Link className="btn ghost sm" href={href({ page: String(page - 1) })}>Newer</Link>}
              {rows.length === SIZE && <Link className="btn ghost sm" rel="next" href={href({ page: String(page + 1) })}>Show more</Link>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
