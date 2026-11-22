import { ExternalLink } from "lucide-react";
import { requireCms, pageOf, rangeOf, cleanSearch, fmtDate, CMS_PAGE } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { BTN_DANGER, BTN_OUTLINE, BTN_PRIMARY, Card, Empty, Filters, INPUT, PageHeader, Pager, Person } from "@/components/cms/ui";
import { cmsDeleteCompany, cmsUpdateCompany } from "@/app/cms/actions";

export const metadata = { title: "Business listings" };
type Row = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  website: string;
  logo_url: string | null;
  created_at: string;
  owner: { id: string; full_name: string; avatar_url: string | null } | null;
  company_reviews: { rating: number }[];
};

export default async function CmsBusinesses({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const q = cleanSearch(sp.q);
  const { supabase } = await requireCms();
  let query = supabase
    .from("companies")
    .select("id, slug, name, category, description, website, logo_url, created_at, owner:profiles!companies_owner_id_fkey(id, full_name, avatar_url), company_reviews(rating)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (q) query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const hub = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <>
      <PageHeader title="Business listings" description="Company pages members list in the business directory." />
      <Filters reset="/cms/businesses">
        <input name="q" defaultValue={q} placeholder="Business name, category or description" aria-label="Search businesses" className={`${INPUT} min-w-[15rem] flex-1`} />
      </Filters>
      {rows.length === 0 ? (
        <Card><Empty>No business listings match.</Empty></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((c) => {
            const ratings = c.company_reviews.map((r) => r.rating);
            const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
            return (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start gap-4">
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo_url} alt="" className="h-12 w-12 rounded-xl border border-zinc-200 object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 font-bold text-zinc-500">{c.name.slice(0, 1)}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-950">{c.name}</p>
                    <p className="text-[0.8438rem] text-zinc-500">
                      {c.category || "No category"} · listed {fmtDate(c.created_at)} · {avg ? `${avg}★ from ${ratings.length} reviews` : "no reviews"}
                    </p>
                    <div className="mt-2"><Person person={c.owner} sub="Owner" size={26} /></div>
                  </div>
                  <span className="flex gap-2">
                    <a href={`${hub}/businesses/${c.slug}`} target="_blank" rel="noreferrer" className={BTN_OUTLINE}><ExternalLink className="h-3.5 w-3.5" /> View</a>
                    <form action={cmsDeleteCompany.bind(null, c.id)}>
                      <ConfirmSubmit className={BTN_DANGER} confirm={`Delete the listing for ${c.name} and its reviews?`}>Delete</ConfirmSubmit>
                    </form>
                  </span>
                </div>
                <details className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60">
                  <summary className="cursor-pointer px-3 py-2 text-[0.8438rem] font-semibold text-zinc-700">Edit listing</summary>
                  <form action={cmsUpdateCompany.bind(null, c.id)} className="grid gap-3 p-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700">Name<input name="name" defaultValue={c.name} required maxLength={120} className={INPUT} /></label>
                    <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700">Category<input name="category" defaultValue={c.category ?? ""} maxLength={80} className={INPUT} /></label>
                    <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700 sm:col-span-2">Website<input name="website" defaultValue={c.website ?? ""} maxLength={200} className={INPUT} /></label>
                    <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700 sm:col-span-2">Description<textarea name="description" defaultValue={c.description ?? ""} rows={4} maxLength={3000} className={`${INPUT} h-auto py-2`} /></label>
                    <div><ConfirmSubmit className={BTN_PRIMARY}>Save listing</ConfirmSubmit></div>
                  </form>
                </details>
              </Card>
            );
          })}
        </div>
      )}
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/businesses" params={{ q }} />
    </>
  );
}
