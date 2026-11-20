import Link from "next/link";
import { Pin } from "lucide-react";
import { requireCms, pageOf, rangeOf, cleanSearch, fmtDate, isUuid, CMS_PAGE } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { Badge, BTN_DANGER, BTN_OUTLINE, Card, Empty, Filters, INPUT, PageHeader, Pager, Person, SELECT, TABLE, TD, TH } from "@/components/cms/ui";
import { cmsDeletePost, cmsPinPost } from "@/app/cms/actions";

export const metadata = { title: "Posts" };

const KINDS = ["update", "question", "win", "offer", "hiring"];
type Params = { q?: string; kind?: string; author?: string; group?: string; pinned?: string; page?: string };
type Row = {
  id: string;
  body: string;
  kind: string;
  visibility: string;
  image_url: string | null;
  created_at: string;
  pinned_at: string | null;
  author: { id: string; full_name: string; avatar_url: string | null } | null;
  group: { id: string; name: string } | null;
};
type Stats = { post_id: string; reactions: number; comments: number; reposts: number; saves: number; reports: number };

export default async function CmsPosts({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const { supabase } = await requireCms();
  const params = {
    q: cleanSearch(sp.q),
    kind: KINDS.includes(sp.kind ?? "") ? sp.kind : "",
    author: isUuid(sp.author) ? sp.author : "",
    group: isUuid(sp.group) ? sp.group : "",
    pinned: sp.pinned === "yes" ? "yes" : "",
  };

  let query = supabase
    .from("posts")
    .select(
      "id, body, kind, visibility, image_url, created_at, pinned_at, author:profiles!posts_author_id_fkey(id, full_name, avatar_url), group:groups!posts_group_id_fkey(id, name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (params.q) query = query.ilike("body", `%${params.q}%`);
  if (params.kind) query = query.eq("kind", params.kind);
  if (params.author) query = query.eq("author_id", params.author);
  if (params.group) query = query.eq("group_id", params.group);
  if (params.pinned) query = query.not("pinned_at", "is", null);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const { data: st } = rows.length ? await supabase.rpc("cms_post_stats", { p_ids: rows.map((r) => r.id) }) : { data: [] };
  const stats = new Map(((st ?? []) as Stats[]).map((s) => [s.post_id, s]));

  return (
    <>
      <PageHeader title="Posts" description="Every post on the hub, including private and group posts." />
      <Filters reset="/cms/posts">
        <input name="q" defaultValue={params.q} placeholder="Words in the post" aria-label="Search posts" className={`${INPUT} min-w-[220px] flex-1`} />
        <select name="kind" defaultValue={params.kind} aria-label="Type" className={SELECT}>
          <option value="">Any type</option>
          {KINDS.map((k) => (
            <option key={k} value={k} className="capitalize">{k}</option>
          ))}
        </select>
        <select name="pinned" defaultValue={params.pinned} aria-label="Pinned" className={SELECT}>
          <option value="">Pinned or not</option>
          <option value="yes">Pinned only</option>
        </select>
        {params.author && <input type="hidden" name="author" value={params.author} />}
        {params.group && <input type="hidden" name="group" value={params.group} />}
      </Filters>
      {(params.author || params.group) && (
        <p className="text-[12.5px] text-zinc-600">
          Showing posts {params.author ? "by one member" : "in one group"}. <Link href="/cms/posts" className="font-semibold text-blue-600 hover:underline">Show all posts</Link>
        </p>
      )}

      <Card flush>
        {rows.length === 0 ? (
          <Empty>No posts match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>Post</th>
                  <th className={TH}>Author</th>
                  <th className={TH}>Where</th>
                  <th className={`${TH} text-right`}>Reactions</th>
                  <th className={`${TH} text-right`}>Comments</th>
                  <th className={`${TH} text-right`}>Reports</th>
                  <th className={TH}>Posted</th>
                  <th className={`${TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const s = stats.get(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/70">
                      <td className={`${TD} max-w-[380px]`}>
                        <Link href={`/cms/posts/${p.id}`} className="block hover:underline">
                          <span className="line-clamp-2 text-zinc-900">{p.body}</span>
                        </Link>
                        <span className="mt-1 flex flex-wrap gap-1">
                          <Badge tone={p.kind === "question" ? "blue" : p.kind === "win" ? "amber" : p.kind === "offer" ? "green" : p.kind === "hiring" ? "violet" : "zinc"}>{p.kind}</Badge>
                          {p.visibility !== "public" && <Badge>{p.visibility}</Badge>}
                          {p.image_url && <Badge>photo</Badge>}
                          {p.pinned_at && <Badge tone="blue">pinned</Badge>}
                        </span>
                      </td>
                      <td className={`${TD} max-w-[200px]`}>
                        <Person person={p.author} size={28} />
                      </td>
                      <td className={`${TD} text-zinc-600`}>
                        {p.group ? <Link href={`/cms/groups/${p.group.id}`} className="hover:underline">{p.group.name}</Link> : "Feed"}
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>{s?.reactions ?? 0}</td>
                      <td className={`${TD} text-right tabular-nums`}>{s?.comments ?? 0}</td>
                      <td className={`${TD} text-right tabular-nums ${s?.reports ? "font-semibold text-rose-600" : ""}`}>{s?.reports ?? 0}</td>
                      <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(p.created_at)}</td>
                      <td className={`${TD} text-right`}>
                        <span className="inline-flex gap-1.5">
                          <form action={cmsPinPost.bind(null, p.id, !p.pinned_at)}>
                            <ConfirmSubmit className={`${BTN_OUTLINE} h-8 px-2.5`}>
                              <Pin className="h-3.5 w-3.5" /> {p.pinned_at ? "Unpin" : "Pin"}
                            </ConfirmSubmit>
                          </form>
                          <form action={cmsDeletePost.bind(null, p.id, undefined)}>
                            <ConfirmSubmit className={`${BTN_DANGER} h-8 px-2.5`} confirm="Delete this post and its comments and reactions? This cannot be undone.">
                              Delete
                            </ConfirmSubmit>
                          </form>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/posts" params={params as Record<string, string>} />
    </>
  );
}
