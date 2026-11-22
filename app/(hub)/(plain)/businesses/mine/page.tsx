import Link from "next/link";
import { requireUser } from "@/lib/hub";
import { PageTitle } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { BusinessForm } from "@/components/business-form";
import { deleteBusiness } from "@/app/(hub)/business-actions";
import { ROLES, STATUS_LABEL, type Role } from "@/lib/business";
import { getBusinessSettings } from "@/lib/business-server";

type Row = { role: Role; company: { id: string; slug: string; name: string; category: string; status: string; owner_id: string } };

export default async function MyBusinessesPage() {
  const { supabase, userId, isStaff } = await requireUser();
  const settings = await getBusinessSettings();
  const { data } = await supabase
    .from("business_team")
    .select("role, company:companies!inner(id, slug, name, category, status, owner_id)")
    .eq("user_id", userId)
    .neq("company.status", "deleted");
  const mine = (data ?? []) as unknown as Row[];
  const owned = mine.filter((r) => r.company.owner_id === userId).length;
  const canAdd = isStaff || owned < settings.member_limit;

  return (
    <>
      <PageTitle title="My business pages">
        <Link href="/businesses" className="text-sm font-semibold text-primary hover:underline">
          See the directory
        </Link>
      </PageTitle>

      {mine.length > 0 && (
        <section className="panel divide-y">
          {mine.map(({ role, company: c }) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.category || "No category"} · {STATUS_LABEL[c.status] ?? c.status} · You are {ROLES[role].toLowerCase()}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/businesses/${c.slug}`} className="press rounded-full border border-input bg-white px-3 py-1.5 text-sm font-semibold hover:bg-muted">
                  View
                </Link>
                {(role === "owner" || role === "manager") && (
                  <Link href={`/businesses/mine/${c.slug}`} className="press rounded-full border border-input bg-white px-3 py-1.5 text-sm font-semibold hover:bg-muted">
                    Manage
                  </Link>
                )}
                {role === "responder" && (
                  <Link href={`/businesses/mine/${c.slug}/inbox`} className="press rounded-full border border-input bg-white px-3 py-1.5 text-sm font-semibold hover:bg-muted">
                    Inbox
                  </Link>
                )}
                {c.owner_id === userId && (
                  <form action={deleteBusiness.bind(null, c.id)}>
                    <SubmitButton tone="danger" className="!px-3 !py-1.5">
                      Delete
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {canAdd ? (
        <section className="panel p-5">
          <h2 className="mb-1 text-base font-semibold">Add a business</h2>
          <p className="mb-4 text-sm text-muted-foreground">Start with the basics. You can add hours, services and contact details next.</p>
          <BusinessForm categories={settings.categories} />
        </section>
      ) : (
        <section className="panel p-6 text-center">
          <p className="text-base font-semibold">You have reached the limit of {settings.member_limit} business {settings.member_limit === 1 ? "page" : "pages"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Delete a page you no longer need, or contact the team.</p>
        </section>
      )}
    </>
  );
}
