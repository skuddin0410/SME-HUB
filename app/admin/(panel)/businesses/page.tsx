import Link from "next/link";
import { requireStaff, timeAgo } from "@/lib/hub";
import { SubmitButton } from "@/components/hub-client";
import { SettingsForm } from "@/components/business-manage";
import { decideBusiness, decideClaim, decideReview } from "@/app/(hub)/business-actions";
import { getBusinessSettings } from "@/lib/business-server";

export const dynamic = "force-dynamic";

export default async function AdminBusinesses() {
  const { supabase } = await requireStaff();
  const settings = await getBusinessSettings();
  const [{ data: pending }, { data: claims }, { data: reviews }] = await Promise.all([
    supabase.from("companies").select("id, slug, name, category, city, province, updated_at, owner:profiles!companies_owner_id_fkey(full_name)").eq("status", "pending").order("updated_at"),
    supabase.from("business_claims").select("id, evidence, created_at, company:companies!business_claims_company_id_fkey(name, slug), claimant:profiles!business_claims_user_id_fkey(full_name)").eq("status", "pending").order("created_at"),
    supabase.from("company_reviews").select("company_id, author_id, rating, body, created_at, company:companies!company_reviews_company_id_fkey(name), author:profiles!company_reviews_author_id_fkey(full_name)").eq("status", "pending").order("created_at"),
  ]);
  type P = { id: string; slug: string; name: string; category: string; city: string; province: string; updated_at: string; owner: { full_name: string } | null };
  type C = { id: string; evidence: string; created_at: string; company: { name: string; slug: string } | null; claimant: { full_name: string } | null };
  type R = { company_id: string; author_id: string; rating: number; body: string; created_at: string; company: { name: string } | null; author: { full_name: string } | null };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Business directory</h1>

      <section className="panel p-4">
        <h2 className="mb-3 text-base font-semibold">Pages waiting for approval ({pending?.length ?? 0})</h2>
        {(pending as unknown as P[] | null)?.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3 first:border-t-0">
            <div>
              <Link href={`/businesses/${b.slug}`} className="text-sm font-semibold hover:underline">{b.name}</Link>
              <p className="text-xs text-muted-foreground">{b.category} · {b.city}, {b.province} · by {b.owner?.full_name} · {timeAgo(b.updated_at)}</p>
            </div>
            <span className="flex gap-2">
              <form action={decideBusiness.bind(null, b.id, true)}><SubmitButton>Approve</SubmitButton></form>
              <form action={decideBusiness.bind(null, b.id, false)} style={{ display: "flex", gap: 6, alignItems: "center" }}><input name="reason" className="rounded-md border px-2 py-1 text-sm" placeholder="Reason (the member sees it)" maxLength={500} aria-label="Reason for turning it down" style={{ minWidth: 200 }} /><SubmitButton tone="danger">Reject</SubmitButton></form>
            </span>
          </div>
        ))}
        {!pending?.length && <p className="text-sm text-muted-foreground">Nothing waiting.</p>}
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-base font-semibold">Ownership claims ({claims?.length ?? 0})</h2>
        {(claims as unknown as C[] | null)?.map((c) => (
          <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 border-t py-3 first:border-t-0">
            <div className="min-w-0 max-w-xl">
              <p className="text-sm font-semibold">{c.claimant?.full_name} wants {c.company?.name}</p>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{c.evidence}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
            </div>
            <span className="flex gap-2">
              <form action={decideClaim.bind(null, c.id, true)}><SubmitButton>Approve</SubmitButton></form>
              <form action={decideClaim.bind(null, c.id, false)} style={{ display: "flex", gap: 6, alignItems: "center" }}><input name="reason" className="rounded-md border px-2 py-1 text-sm" placeholder="Reason (the member sees it)" maxLength={500} aria-label="Reason for turning it down" style={{ minWidth: 200 }} /><SubmitButton tone="danger">Reject</SubmitButton></form>
            </span>
          </div>
        ))}
        {!claims?.length && <p className="text-sm text-muted-foreground">No open claims.</p>}
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-base font-semibold">Reviews waiting for approval ({reviews?.length ?? 0})</h2>
        {(reviews as unknown as R[] | null)?.map((r) => (
          <div key={`${r.company_id}-${r.author_id}`} className="flex flex-wrap items-start justify-between gap-3 border-t py-3 first:border-t-0">
            <div className="min-w-0 max-w-xl">
              <p className="text-sm font-semibold">{r.author?.full_name} on {r.company?.name}: {r.rating}/5</p>
              {r.body && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{r.body}</p>}
            </div>
            <span className="flex gap-2">
              <form action={decideReview.bind(null, r.company_id, r.author_id, true)}><SubmitButton>Show</SubmitButton></form>
              <form action={decideReview.bind(null, r.company_id, r.author_id, false)}><SubmitButton tone="danger">Hide</SubmitButton></form>
            </span>
          </div>
        ))}
        {!reviews?.length && <p className="text-sm text-muted-foreground">No reviews waiting.</p>}
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-base font-semibold">Directory settings</h2>
        <SettingsForm s={settings} />
      </section>
    </div>
  );
}
