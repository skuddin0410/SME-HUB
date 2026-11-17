/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Globe } from "lucide-react";
import { cleanTerm, getViewer } from "@/lib/hub";
import { Empty, PageTitle } from "@/components/hub";
import { Cover, SubmitButton } from "@/components/hub-client";

type Company = {
  id: string;
  name: string;
  category: string;
  description: string;
  website: string;
  logo_url: string | null;
  owner: { id: string; full_name: string } | null;
};

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "" } = await searchParams;
  const { supabase } = await getViewer();

  let query = supabase
    .from("companies")
    .select("id, name, category, description, website, logo_url, owner:profiles!companies_owner_id_fkey(id, full_name)")
    .order("name")
    .limit(60);
  const term = cleanTerm(q);
  if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  if (category) query = query.eq("category", category);
  const [{ data }, { data: cats }] = await Promise.all([query, supabase.from("companies").select("category")]);
  const companies = (data ?? []) as unknown as Company[];
  const categories = [...new Set((cats ?? []).map((c) => c.category as string).filter(Boolean))].sort();

  return (
    <>
      <PageTitle title="Explore businesses">
        <Link href="/businesses/mine" className="press rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5">
          List your business
        </Link>
      </PageTitle>
      <form className="panel flex flex-wrap gap-2 p-3">
        <input name="q" defaultValue={q} placeholder="Search for a business" aria-label="Search businesses" className="field min-w-[180px] flex-1" />
        <select name="category" defaultValue={category} aria-label="Category" className="rounded-xl border border-input bg-white px-3 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <SubmitButton>Search</SubmitButton>
      </form>

      {companies.length === 0 && <Empty title="No businesses found">Try another name or category.</Empty>}
      <div className="grid gap-4 sm:grid-cols-2">
        {companies.map((c) => {
          const site = c.website && (c.website.startsWith("http") ? c.website : `https://${c.website}`);
          return (
            <section key={c.id} className="panel lift flex flex-col overflow-hidden">
              <Cover seed={c.id} className="h-20" />
              <div className="flex flex-1 flex-col px-4 pb-4">
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="relative -mt-7 h-14 w-14 rounded-xl bg-white object-cover ring-4 ring-white" />
                ) : (
                  <span className="cover relative -mt-7 flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold text-white ring-4 ring-white">
                    {c.name.charAt(0)}
                  </span>
                )}
                <h2 className="mt-2 text-base font-semibold">{c.name}</h2>
                {c.category && <p className="text-xs font-medium text-primary">{c.category}</p>}
                {c.description && <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{c.description}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                  {c.owner && (
                    <Link href={`/members/${c.owner.id}`} className="text-muted-foreground hover:text-primary">
                      Listed by <span className="font-semibold">{c.owner.full_name}</span>
                    </Link>
                  )}
                  {site && (
                    <a href={site} target="_blank" rel="noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                      <Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
