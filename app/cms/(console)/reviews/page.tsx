import { Star } from "lucide-react";
import { requireCms, pageOf, rangeOf, fmtDate, CMS_PAGE } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { BTN_DANGER, Card, Empty, Filters, PageHeader, Pager, Person, SELECT, TABLE, TD, TH } from "@/components/cms/ui";
import { cmsDeleteReview } from "@/app/cms/actions";

export const metadata = { title: "Reviews" };
type Row = { company_id: string; author_id: string; rating: number; body: string; created_at: string; author: { id: string; full_name: string; avatar_url: string | null } | null; company: { name: string } | null };

export default async function CmsReviews({ searchParams }: { searchParams: Promise<{ rating?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const rating = ["1", "2", "3", "4", "5"].includes(sp.rating ?? "") ? sp.rating! : "";
  const { supabase } = await requireCms();
  let query = supabase
    .from("company_reviews")
    .select("company_id, author_id, rating, body, created_at, author:profiles!company_reviews_author_id_fkey(id, full_name, avatar_url), company:companies!company_reviews_company_id_fkey(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (rating) query = query.eq("rating", Number(rating));
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Reviews" description="Star ratings members leave on business listings." />
      <Filters reset="/cms/reviews">
        <select name="rating" defaultValue={rating} aria-label="Rating" className={SELECT}>
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
        </select>
      </Filters>
      <Card flush>
        {rows.length === 0 ? (
          <Empty>No reviews match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead><tr><th className={TH}>Business</th><th className={TH}>Rating</th><th className={TH}>Review</th><th className={TH}>By</th><th className={TH}>When</th><th className={`${TH} text-right`}>Actions</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.company_id}:${r.author_id}`}>
                    <td className={`${TD} font-semibold text-zinc-900`}>{r.company?.name ?? "Deleted listing"}</td>
                    <td className={TD}>
                      <span className="inline-flex items-center gap-1 tabular-nums" aria-label={`${r.rating} out of 5`}>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating}
                      </span>
                    </td>
                    <td className={`${TD} max-w-[360px]`}><span className="line-clamp-2 text-zinc-800">{r.body || "No text"}</span></td>
                    <td className={`${TD} max-w-[200px]`}><Person person={r.author} size={26} /></td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(r.created_at)}</td>
                    <td className={`${TD} text-right`}>
                      <form action={cmsDeleteReview.bind(null, r.company_id, r.author_id)}>
                        <ConfirmSubmit className={`${BTN_DANGER} h-8 px-2.5`} confirm="Delete this review?">Delete</ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/reviews" params={{ rating }} />
    </>
  );
}
