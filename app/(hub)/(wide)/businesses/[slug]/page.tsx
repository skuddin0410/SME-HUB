/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";
import { AUTHOR_FIELDS, getViewer, type Author } from "@/lib/hub";
import { AvatarImg, Cover } from "@/components/hub-client";
import { Reviews, type Review } from "@/components/business-client";

type Company = {
  id: string;
  name: string;
  category: string;
  description: string;
  website: string;
  logo_url: string | null;
  owner_id: string;
  owner: Author | null;
};

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const { supabase, userId, profile, isStaff } = await getViewer();

  const { data } = await supabase
    .from("companies")
    .select(`id, name, category, description, website, logo_url, owner_id, owner:profiles!companies_owner_id_fkey(${AUTHOR_FIELDS})`)
    .eq("slug", slug)
    .maybeSingle();
  const company = data as unknown as Company | null;
  if (!company) notFound();

  const { data: rows } = await supabase
    .from("company_reviews")
    .select(`rating, body, created_at, author:profiles!company_reviews_author_id_fkey(${AUTHOR_FIELDS})`)
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });
  const reviews = (rows ?? []) as unknown as Review[];
  const site = company.website && (company.website.startsWith("http") ? company.website : `https://${company.website}`);
  const me: Author | null = profile
    ? { id: profile.id, full_name: profile.full_name, headline: profile.headline, avatar_url: profile.avatar_url, member_type: profile.member_type }
    : null;

  return (
    <>
      <Link href="/businesses" className="inline-flex items-center gap-1.5 self-start rounded px-1 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All businesses
      </Link>

      <section className="panel overflow-hidden">
        <Cover seed={company.id} className="h-32" />
        <div className="px-5 pb-5">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="relative -mt-12 h-24 w-24 rounded-xl bg-white object-cover ring-4 ring-white" />
          ) : (
            <span className="cover relative -mt-12 flex h-24 w-24 items-center justify-center rounded-xl text-4xl font-semibold text-white ring-4 ring-white">
              {company.name.charAt(0)}
            </span>
          )}
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">{company.name}</h1>
              {company.category && <p className="text-sm text-muted-foreground">{company.category}</p>}
            </div>
            <div className="flex gap-2">
              {site && (
                <a
                  href={site}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  <Globe className="h-4 w-4" /> Visit website
                </a>
              )}
              {company.owner_id === userId && (
                <Link href={`/businesses/mine?edit=${company.id}`} className="press rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10">
                  Edit listing
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {company.description && (
        <section className="panel p-4">
          <h2 className="text-base font-semibold">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-5">{company.description}</p>
        </section>
      )}

      {company.owner && (
        <section className="panel p-4">
          <h2 className="text-base font-semibold">Listed by</h2>
          <Link href={`/members/${company.owner.id}`} className="mt-3 flex items-center gap-3">
            <AvatarImg person={company.owner} size={56} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold hover:underline">{company.owner.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{company.owner.headline}</span>
            </span>
          </Link>
        </section>
      )}

      <Reviews companyId={company.id} initial={reviews} me={me} canReview={company.owner_id !== userId} isStaff={isStaff} />
    </>
  );
}
