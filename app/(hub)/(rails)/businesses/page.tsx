/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ftsQuery, getViewer } from "@/lib/hub";
import { Empty, PageTitle } from "@/components/hub";
import { Cover, SubmitButton } from "@/components/hub-client";
import { Stars } from "@/components/business-client";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Business directory", description: "Find Canadian small businesses by name, category and member rating in the SMB Hub directory.", path: "/businesses" });

type Company = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  logo_url: string | null;
  owner: { id: string; full_name: string } | null;
  company_reviews: { rating: number }[];
};

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; rating?: string }> }) {
  const { q = "", category = "", rating = "" } = await searchParams;
  const min = Math.min(5, Math.max(0, Number(rating) || 0));
  const { supabase } = await getViewer();

  let query = supabase
    .from("companies")
    .select("id, slug, name, category, description, logo_url, owner:profiles!companies_owner_id_fkey(id, full_name), company_reviews(rating)")
    .order("name")
    .limit(80);
  const fts = ftsQuery(q);
  if (fts) query = query.textSearch("fts", fts, { config: "english" });
  if (category) query = query.eq("category", category);
  const [{ data }, { data: cats }] = await Promise.all([query, supabase.from("companies").select("category")]);
  const categories = [...new Set((cats ?? []).map((c) => c.category as string).filter(Boolean))].sort();
  const companies = ((data ?? []) as unknown as Company[])
    .map((c) => ({ ...c, count: c.company_reviews.length, average: c.company_reviews.length ? c.company_reviews.reduce((n, r) => n + r.rating, 0) / c.company_reviews.length : 0 }))
    .filter((c) => c.average >= min);
  const select = "rounded-lg border border-input bg-white px-3 text-sm";

  return (
    <>
      <PageTitle title="Explore businesses">
        <Link href="/businesses/mine" className="press rounded-xl border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10">
          List your business
        </Link>
      </PageTitle>
      <form className="panel flex flex-wrap gap-2 p-3">
        <input name="q" defaultValue={q} placeholder="Search for a business" aria-label="Search businesses" className="field min-w-[160px] flex-1" />
        <select name="category" defaultValue={category} aria-label="Category" className={select}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="rating" defaultValue={rating} aria-label="Rating" className={select}>
          <option value="">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars and up</option>
          <option value="3">3 stars and up</option>
        </select>
        <SubmitButton>Search</SubmitButton>
      </form>

      {companies.length === 0 && <Empty title="No businesses found">Try another name, category or rating.</Empty>}
      <div className="grid gap-2 sm:grid-cols-2">
        {companies.map((c) => (
          <Link key={c.id} href={`/businesses/${c.slug}`} className="panel group flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-lg">
            <Cover seed={c.id} className="h-16" />
            <div className="flex flex-1 flex-col px-4 pb-4">
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="relative -mt-7 h-14 w-14 rounded-lg bg-white object-cover ring-2 ring-white" />
              ) : (
                <span className="cover relative -mt-7 flex h-14 w-14 items-center justify-center rounded-lg text-xl font-semibold text-white ring-2 ring-white">
                  {c.name.charAt(0)}
                </span>
              )}
              <h2 className="mt-2 text-base font-semibold group-hover:underline">{c.name}</h2>
              <p className="text-xs text-muted-foreground">{c.category}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {c.count > 0 ? (
                  <>
                    <Stars value={c.average} size={13} />
                    <span className="font-semibold text-foreground">{c.average.toFixed(1)}</span> ({c.count})
                  </>
                ) : (
                  "No reviews yet"
                )}
              </p>
              {c.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{c.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
