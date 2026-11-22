/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ftsQuery, getViewer } from "@/lib/hub";
import { Empty, PageTitle, Pager } from "@/components/hub";
import { Cover, SubmitButton } from "@/components/hub-client";
import { Stars } from "@/components/business-client";
import { BusinessMap, type BusinessCity } from "@/components/business-map";
import { KINDS } from "@/lib/business";
import { getBusinessSettings } from "@/lib/business-server";
import { PROVINCES } from "@/lib/profile-extra";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Business directory", description: "Find Canadian small businesses by name, category, city and member rating in the SMB Hub directory.", path: "/businesses" });

const SIZE = 24;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

type Row = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  logo_url: string | null;
  cover_url: string | null;
  city: string;
  province: string;
  kind: string;
  rating: number | null;
  reviews: number;
  followers: number;
  is_open: boolean;
  claimable: boolean;
};

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const category = one(sp.category);
  const province = (PROVINCES as readonly string[]).includes(one(sp.province)) ? one(sp.province) : "";
  const city = one(sp.city).slice(0, 80);
  const kind = one(sp.kind) in KINDS ? one(sp.kind) : "";
  const open = one(sp.open) === "1";
  const sort = one(sp.sort) === "new" ? "new" : one(sp.sort) === "name" ? "name" : "rating";
  const view = ["list", "map"].includes(one(sp.view)) ? one(sp.view) : "grid";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const { supabase, userId } = await getViewer();
  const settings = await getBusinessSettings();

  const { data } = await supabase.rpc("search_businesses", {
    q: ftsQuery(q) ?? "",
    p_cat: settings.categories.includes(category) ? category : "",
    p_prov: province,
    p_city: city,
    p_kind: kind,
    p_open: open,
    p_sort: sort,
    p_limit: SIZE,
    p_offset: (page - 1) * SIZE,
  });
  const rows = (data ?? []) as Row[];
  const cityRows = view === "map" ? (((await supabase.rpc("business_map_cities", { p_cat: settings.categories.includes(category) ? category : "", p_kind: kind })).data ?? []) as BusinessCity[]) : [];

  const filters = { q, category, province, city, kind, ...(open ? { open: "1" } : {}), sort };
  const qs = (extra: Record<string, string> = {}) => new URLSearchParams({ ...filters, ...extra }).toString();
  const select = "rounded-lg border border-input bg-white px-3 text-sm";

  return (
    <>
      <PageTitle title="Explore businesses">
        <Link href={userId ? "/businesses/mine" : "/auth/login"} className="press rounded-xl border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10">
          Add your business
        </Link>
      </PageTitle>
      <form className="panel grid gap-2 p-3 sm:grid-cols-3" role="search">
        <input name="q" defaultValue={q} placeholder="Search for a business" aria-label="Search businesses" className="field sm:col-span-3" />
        <select name="category" defaultValue={category} aria-label="Category" className={select}>
          <option value="">All categories</option>
          {settings.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="province" defaultValue={province} aria-label="Province" className={select}>
          <option value="">All of Canada</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select name="kind" defaultValue={kind} aria-label="Type of business" className={select}>
          <option value="">Any type</option>
          {Object.entries(KINDS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort by" className={select}>
          <option value="rating">Best rated</option>
          <option value="new">Newest</option>
          <option value="name">Name</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="open" value="1" defaultChecked={open} /> Open now
        </label>
        {city && <input type="hidden" name="city" value={city} />}
        {view !== "grid" && <input type="hidden" name="view" value={view} />}
        <SubmitButton>Search</SubmitButton>
      </form>

      <nav aria-label="Directory view" className="flex flex-wrap items-center gap-2">
        {(["grid", "list", "map"] as const).map((v) => (
          <Link
            key={v}
            href={`/businesses?${qs(v === "grid" ? {} : { view: v })}`}
            aria-current={v === view ? "page" : undefined}
            className={`press rounded-xl border px-4 py-1.5 text-sm font-semibold capitalize ${v === view ? "border-primary bg-primary/10 text-foreground" : "hover:bg-muted"}`}
          >
            {v}
          </Link>
        ))}
        {city && (
          <Link href={`/businesses?${new URLSearchParams({ ...filters, city: "", ...(view !== "grid" ? { view } : {}) }).toString()}`} className="rounded-xl bg-muted px-3 py-1.5 text-sm font-semibold hover:bg-muted/70">
            {city} ✕
          </Link>
        )}
      </nav>

      {view === "map" && <BusinessMap cities={cityRows} token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN} base={`/businesses?${qs()}`} />}

      {rows.length === 0 && <Empty title="No businesses found">Try another name, category or city.</Empty>}
      <div className={view === "list" ? "grid gap-2" : "grid gap-2 sm:grid-cols-2"}>
        {rows.map((c) => (
          <Link key={c.id} href={`/businesses/${c.slug}`} className={`panel group flex overflow-hidden transition-shadow duration-200 hover:shadow-lg ${view === "list" ? "items-center gap-3 p-3" : "flex-col"}`}>
            {view !== "list" && (c.cover_url ? <img src={c.cover_url} alt="" className="h-16 w-full object-cover" /> : <Cover seed={c.id} className="h-16" />)}
            <div className={view === "list" ? "flex min-w-0 flex-1 items-center gap-3" : "flex flex-1 flex-col px-4 pb-4"}>
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className={`${view === "list" ? "h-12 w-12" : "relative -mt-7 h-14 w-14"} shrink-0 rounded-lg bg-white object-cover ring-2 ring-white`} />
              ) : (
                <span className={`cover flex shrink-0 items-center justify-center rounded-lg font-semibold text-white ring-2 ring-white ${view === "list" ? "h-12 w-12 text-lg" : "relative -mt-7 h-14 w-14 text-xl"}`}>{c.name.charAt(0)}</span>
              )}
              <div className="min-w-0">
                <h2 className="mt-2 truncate text-base font-semibold group-hover:underline">{c.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {c.category}
                  {c.city && ` · ${c.city}, ${c.province}`}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {c.reviews > 0 && c.rating != null ? (
                    <>
                      <Stars value={Number(c.rating)} size={13} />
                      <span className="font-semibold text-foreground">{Number(c.rating).toFixed(1)}</span> ({c.reviews})
                    </>
                  ) : (
                    "No reviews yet"
                  )}
                  {c.is_open && <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">Open now</span>}
                </p>
                {view !== "list" && c.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{c.description}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Pager page={page} hasMore={rows.length === SIZE} base={`/businesses?${qs(view === "grid" ? {} : { view })}${city ? "" : ""}`} />
    </>
  );
}
