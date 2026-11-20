import Link from "next/link";
import { requireUser } from "@/lib/hub";
import { PageTitle } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { BusinessForm, type BusinessValues } from "@/components/business-form";
import { deleteBusiness } from "@/app/(hub)/actions";

const LIMITS = { owner: 0, plus: 1, elite: 2, advisor: 3 };

export default async function MyBusinessesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const { supabase, userId, profile, isStaff } = await requireUser();
  const { data } = await supabase
    .from("companies")
    .select("id, name, category, description, website")
    .eq("owner_id", userId)
    .order("created_at");
  const mine = (data ?? []) as Required<BusinessValues>[];
  const editing = mine.find((c) => c.id === edit);
  const limit = isStaff ? 99 : LIMITS[profile?.member_type ?? "owner"];
  const canAdd = mine.length < limit;

  return (
    <>
      <PageTitle title="My business listings">
        <Link href="/businesses" className="text-sm font-semibold text-primary hover:underline">
          See the directory
        </Link>
      </PageTitle>

      {mine.length > 0 && (
        <section className="panel divide-y">
          {mine.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.category || "No category"}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/businesses/mine?edit=${c.id}`} className="press rounded-full border border-input bg-white px-3 py-1.5 text-sm font-semibold hover:bg-muted">
                  Edit
                </Link>
                <form action={deleteBusiness.bind(null, c.id)}>
                  <SubmitButton tone="danger" className="!px-3 !py-1.5">
                    Delete
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      {editing ? (
        <section className="panel p-5">
          <h2 className="mb-4 text-base font-semibold">Edit {editing.name}</h2>
          <BusinessForm key={editing.id} values={editing} />
        </section>
      ) : canAdd ? (
        <section className="panel p-5">
          <h2 className="mb-4 text-base font-semibold">Add a business</h2>
          <BusinessForm />
        </section>
      ) : (
        <section className="panel p-6 text-center">
          <p className="text-base font-semibold">
            {limit === 0 ? "Business listings come with the paid plans" : `Your plan includes ${limit} ${limit === 1 ? "listing" : "listings"}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Upgrade to put {limit === 0 ? "your business" : "more businesses"} in the directory.</p>
          <Link href="/membership-plans" className="press mt-4 inline-block rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white">
            See plans
          </Link>
        </section>
      )}
    </>
  );
}
