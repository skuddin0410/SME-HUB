import Link from "next/link";
import { requireCms, pageOf, rangeOf, cleanSearch, fmtDate, CMS_PAGE } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { BTN_DANGER, Card, Empty, Filters, INPUT, PageHeader, Pager, Person, TABLE, TD, TH } from "@/components/cms/ui";
import { cmsDeleteComment } from "@/app/cms/actions";

export const metadata = { title: "Comments" };
type Who = { id: string; full_name: string; avatar_url: string | null };
type Row = { id: string; body: string; created_at: string; post_id: string; author: Who | null; post: { id: string; body: string } | null };

export default async function CmsComments({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const q = cleanSearch(sp.q);
  const { supabase } = await requireCms();
  let query = supabase
    .from("comments")
    .select("id, body, created_at, post_id, author:profiles!comments_author_id_fkey(id, full_name, avatar_url), post:posts!comments_post_id_fkey(id, body)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (q) query = query.ilike("body", `%${q}%`);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Comments" description="Replies on every post, newest first." />
      <Filters reset="/cms/comments">
        <input name="q" defaultValue={q} placeholder="Words in the comment" aria-label="Search comments" className={`${INPUT} min-w-[15rem] flex-1`} />
      </Filters>
      <Card flush>
        {rows.length === 0 ? (
          <Empty>No comments match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>Comment</th>
                  <th className={TH}>Author</th>
                  <th className={TH}>On post</th>
                  <th className={TH}>When</th>
                  <th className={`${TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/70">
                    <td className={`${TD} max-w-[22.5rem]`}><span className="line-clamp-2 text-zinc-900">{c.body}</span></td>
                    <td className={`${TD} max-w-[12.5rem]`}><Person person={c.author} size={28} /></td>
                    <td className={`${TD} max-w-[16.25rem]`}>
                      <Link href={`/cms/posts/${c.post_id}`} className="line-clamp-1 text-zinc-600 hover:underline">{c.post?.body ?? "Post"}</Link>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(c.created_at, true)}</td>
                    <td className={`${TD} text-right`}>
                      <form action={cmsDeleteComment.bind(null, c.id)}>
                        <ConfirmSubmit className={`${BTN_DANGER} h-8 px-2.5`} confirm="Delete this comment?">Delete</ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/comments" params={{ q }} />
    </>
  );
}
