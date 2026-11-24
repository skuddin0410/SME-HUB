import Link from "next/link";
import { redirect } from "next/navigation";
import { BlogWriter } from "@/components/zip/blog-writer";
import { getViewer } from "@/lib/hub";
import { canWrite, MB_SELECT, needsApproval, type MemberBlog } from "@/lib/zip/member-blogs";
import { getHubSettings } from "@/lib/zip/settings-load";
import { pageMeta } from "@/lib/seo";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Write a blog post", description: "Write a post for the Member blogs.", path: "/write", index: false });

export default async function WritePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const { supabase, userId, isStaff, profile } = await getViewer();
  if (!userId) redirect("/auth/login");
  const rules = await getHubSettings("blogs");
  const plan = (profile as { plan?: string } | null)?.plan;
  if (!canWrite(rules, plan, isStaff)) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="card" style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", alignItems: "center" }}>
          <h1 style={{ font: "800 24px var(--display)" }}>Blogging is open to {rules.who === "advisor" ? "SME Advisors" : "Plus members and SME Advisors"}</h1>
          <p className="muted">Your current plan can read and save every post. Upgrade to write your own.</p>
          <Link className="btn" href="/membership-plans">See membership plans</Link>
        </div>
      </div></div>
    );
  }
  let post: MemberBlog | null = null;
  if (id && /^[0-9a-f-]{36}$/i.test(id)) {
    const { data } = await supabase.from("member_blogs").select(MB_SELECT).eq("id", id).eq("author_id", userId).maybeSingle();
    post = data as unknown as MemberBlog | null;
  }
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="row" style={{ flexWrap: "wrap", marginBottom: 16 }}>
          <Link className="small backlink" href="/member-blogs">← Member blogs</Link>
        </div>
        <BlogWriter
          initial={{ id: post?.id ?? null, title: post?.title ?? "", cat: post?.cat ?? "", tags: post?.tags.join(", ") ?? "", image: post?.image_url ?? null, blocks: post?.blocks ?? [] }}
          cats={rules.cats as string[]}
          memberTags={!!rules.memberTags}
          reqImg={!!rules.reqImg}
          needsApproval={needsApproval(rules, plan, isStaff)}
        />
      </div>
    </div>
  );
}
