import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pin } from "lucide-react";
import { requireCms, fmtDate, isUuid } from "@/lib/cms";

/** The hub's three reactions, as members see them. */
const REACTIONS = [
  { kind: "like", emoji: "👍", label: "Helpful" },
  { kind: "love", emoji: "💡", label: "Insightful" },
  { kind: "celebrate", emoji: "🎉", label: "Celebrate" },
] as const;
import { ConfirmSubmit } from "@/components/cms/client";
import { Badge, BTN_DANGER, BTN_OUTLINE, BTN_PRIMARY, Card, Empty, Facts, INPUT, Person, SELECT } from "@/components/cms/ui";
import { cmsDeleteComment, cmsDeletePost, cmsPinPost, cmsUpdatePost } from "@/app/cms/actions";

export const metadata = { title: "Post" };

type Who = { id: string; full_name: string; avatar_url: string | null };

export default async function CmsPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireCms();
  const [{ data: post }, { data: comments }, { data: reactions }, { data: st }, { data: reports }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, body, kind, visibility, image_url, created_at, pinned_at, author:profiles!posts_author_id_fkey(id, full_name, avatar_url, headline), group:groups!posts_group_id_fkey(id, name)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("comments").select("id, body, created_at, author:profiles!comments_author_id_fkey(id, full_name, avatar_url)").eq("post_id", id).order("created_at"),
    supabase.from("reactions").select("kind, created_at, user:profiles!reactions_user_id_fkey(id, full_name, avatar_url)").eq("post_id", id).order("created_at", { ascending: false }),
    supabase.rpc("cms_post_stats", { p_ids: [id] }),
    supabase.from("reports").select("id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(id, full_name, avatar_url)").eq("post_id", id),
  ]);
  if (!post) notFound();
  const author = post.author as unknown as (Who & { headline: string }) | null;
  const group = post.group as unknown as { id: string; name: string } | null;
  const s = ((st ?? []) as { reactions: number; comments: number; reposts: number; saves: number; reports: number }[])[0];
  const hub = process.env.NEXT_PUBLIC_SITE_URL || "";
  const byKind = REACTIONS.map((r) => ({ ...r, n: (reactions ?? []).filter((x) => x.kind === r.kind).length }));

  return (
    <>
      <Link href="/cms/posts" className="inline-flex items-center gap-1 text-[0.8438rem] font-medium text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-3.5 w-3.5" /> All posts
      </Link>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card
            title={<Person person={author} sub={`${author?.headline || "Member"} · ${fmtDate(post.created_at, true)}`} size={36} />}
            actions={
              <span className="flex flex-wrap gap-1.5">
                <Badge>{post.kind}</Badge>
                <Badge>{post.visibility}</Badge>
                {post.pinned_at && <Badge tone="blue">Pinned</Badge>}
              </span>
            }
          >
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-zinc-900">{post.body}</p>
            {post.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.image_url} alt="" className="mt-4 max-h-[26.25rem] w-full rounded-xl border border-zinc-200 object-cover" />
            )}
          </Card>

          <Card title="Edit post">
            <form action={cmsUpdatePost.bind(null, post.id)} className="grid gap-3">
              <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700">
                Text
                <textarea name="body" defaultValue={post.body} rows={5} maxLength={5000} className={`${INPUT} h-auto py-2`} />
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700">
                  Type
                  <select name="kind" defaultValue={post.kind} className={SELECT}>
                    {["update", "question", "win", "offer", "hiring", "intro"].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700">
                  Who can see it
                  <select name="visibility" defaultValue={post.visibility} className={SELECT}>
                    <option value="public">Everyone</option>
                    <option value="members">Members</option>
                    <option value="connections">Connections</option>
                    <option value="private">Only the author</option>
                  </select>
                </label>
                <ConfirmSubmit className={BTN_PRIMARY}>Save changes</ConfirmSubmit>
              </div>
            </form>
          </Card>

          <Card flush title={`Comments (${(comments ?? []).length})`}>
            {(comments ?? []).length === 0 ? (
              <Empty>No comments.</Empty>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(comments ?? []).map((c) => (
                  <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Person person={c.author as unknown as Who} sub={fmtDate(c.created_at, true)} size={28} />
                      <p className="mt-1.5 whitespace-pre-wrap pl-[2.375rem] text-[0.875rem] text-zinc-800">{c.body}</p>
                    </div>
                    <form action={cmsDeleteComment.bind(null, c.id)}>
                      <ConfirmSubmit className={`${BTN_DANGER} h-8 px-2.5`} confirm="Delete this comment?">Delete</ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Actions">
            <div className="flex flex-wrap gap-2">
              <a href={`${hub}/posts/${post.id}`} target="_blank" rel="noreferrer" className={BTN_OUTLINE}>
                <ExternalLink className="h-3.5 w-3.5" /> View on hub
              </a>
              <form action={cmsPinPost.bind(null, post.id, !post.pinned_at)}>
                <ConfirmSubmit className={BTN_OUTLINE}>
                  <Pin className="h-3.5 w-3.5" /> {post.pinned_at ? "Unpin" : "Pin to top of feed"}
                </ConfirmSubmit>
              </form>
              <form action={cmsDeletePost.bind(null, post.id, "/cms/posts")}>
                <ConfirmSubmit className={BTN_DANGER} confirm="Delete this post with its comments and reactions? This cannot be undone.">
                  Delete post
                </ConfirmSubmit>
              </form>
            </div>
          </Card>

          <Card title="Engagement">
            <Facts
              rows={[
                ...byKind.map((r) => [`${r.emoji} ${r.label}`, r.n] as [string, React.ReactNode]),
                ["Comments", s?.comments ?? 0],
                ["Reposts", s?.reposts ?? 0],
                ["Saved by", `${s?.saves ?? 0} members`],
                ["Posted in", group ? <Link key="g" href={`/cms/groups/${group.id}`} className="text-blue-600 hover:underline">{group.name}</Link> : "Main feed"],
              ]}
            />
          </Card>

          {(reactions ?? []).length > 0 && (
            <Card flush title="Who reacted">
              <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto">
                {(reactions ?? []).map((r, i) => (
                  <li key={i} className="flex items-center gap-2 px-4 py-2 text-[0.875rem]">
                    <div className="min-w-0 flex-1">
                      <Person person={r.user as unknown as Who} size={24} />
                    </div>
                    <span aria-label={r.kind}>{REACTIONS.find((x) => x.kind === r.kind)?.emoji}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card flush title={`Reports (${(reports ?? []).length})`}>
            {(reports ?? []).length === 0 ? (
              <Empty>Nobody has reported this post.</Empty>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(reports ?? []).map((r) => (
                  <li key={r.id} className="px-4 py-3 text-[0.875rem]">
                    <p className="text-zinc-900">“{r.reason || "No reason given"}”</p>
                    <p className="mt-0.5 text-[0.8125rem] text-zinc-500">
                      {(r.reporter as unknown as Who | null)?.full_name ?? "A member"} · {fmtDate(r.created_at)} · {r.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
