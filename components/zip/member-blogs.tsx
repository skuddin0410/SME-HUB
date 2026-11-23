/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { Tabs } from "@/components/zip/articles";
import { SaveBtn } from "@/components/zip/article-client";
import { BlogShare, DeleteBlog } from "@/components/zip/blog-bits";
import { getViewer } from "@/lib/hub";
import { getHubSettings } from "@/lib/zip/settings-load";
import { MB_SELECT, readMinutes, STATUS_LABEL, when, canWrite, type BlogBlock, type MemberBlog } from "@/lib/zip/member-blogs";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

const FALLBACK = "/zip/img/community.jpg";
export const img = (p: Pick<MemberBlog, "image_url">) => p.image_url || FALLBACK;
const live = (p: MemberBlog) => (p.published_at ? when(p.published_at) : when(p.created_at));

function Byline({ p }: { p: MemberBlog }) {
  const a = p.author;
  if (!a) return null;
  return (
    <span className="byl">
      <ZipAv name={a.full_name || "Member"} src={a.avatar_url} size="s" />
      <Link href={`/members/${a.id}`} className="namebtn" style={{ fontSize: 12.5 }}>{a.full_name || "Member"}</Link>
    </span>
  );
}

export async function MemberBlogsIndex({ q = "", cat = "" }: { q?: string; cat?: string }) {
  const rules = await getHubSettings("blogs");
  const { supabase, userId, isStaff, profile } = await getViewer();
  const cats = rules.cats as string[];
  const category = cats.includes(cat) ? cat : "";
  const term = q.replace(/[%,()*]/g, " ").trim().slice(0, 80);
  let query = supabase.from("member_blogs").select(MB_SELECT).in("status", ["published", "scheduled"]).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(60);
  if (category) query = query.eq("cat", category);
  const { data } = await query;
  let list = ((data ?? []) as unknown as MemberBlog[]).filter((p) => p.status === "published" || (p.scheduled_at && p.scheduled_at <= new Date().toISOString()));
  if (term) {
    const t = term.toLowerCase();
    list = list.filter((p) => `${p.title} ${p.tags.join(" ")} ${p.author?.full_name ?? ""}`.toLowerCase().includes(t));
  }
  const saved = new Set<string>();
  if (userId) {
    const { data: m } = await supabase.from("article_marks").select("item").eq("user_id", userId).eq("kind", "saved").like("item", "memberblogs/%");
    for (const r of (m ?? []) as { item: string }[]) saved.add(r.item);
  }
  const plan = (profile as { plan?: string } | null)?.plan;
  const may = !!userId && canWrite(rules, plan, isStaff);
  const href = (c: string) => `/member-blogs${c ? `?cat=${encodeURIComponent(c)}` : ""}`;
  const key = (id: string) => `memberblogs/${id}`;
  const layout = String(rules.layout);
  const write = may ? <Link className="btn" href="/write"><Ic n="edit" s={15} />Write a post</Link> : userId ? <Link className="btn" href="/membership-plans"><Ic n="edit" s={15} />Write a post</Link> : <Link className="btn" href="/auth/login"><Ic n="edit" s={15} />Write a post</Link>;

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <Tabs k="memberblogs" />
        <div className="arthead">
          <div className="stack grow" style={{ flexBasis: 380, gap: 6 }}>
            <p className="eyebrow">Written by members</p>
            <h1>Member blogs</h1>
            <p className="muted" style={{ fontSize: 15 }}>Lessons, how-tos and stories from owners in the Hub. Anyone can read. Members can write.</p>
          </div>
          <div className="row" style={{ flex: "0 1 460px", flexWrap: "wrap" }}>
            <form role="search" className="grow" style={{ flexBasis: 180 }}>
              <label className="sr" htmlFor="mbq">Search member blogs</label>
              <input id="mbq" name="q" className="field" type="search" style={{ borderRadius: 999 }} placeholder="Search posts, tags or authors" defaultValue={q} />
              {category && <input type="hidden" name="cat" value={category} />}
            </form>
            {write}
          </div>
        </div>
        <div className="tools" style={{ marginBottom: 18 }}>
          <nav className="chips grow" aria-label="Category">
            <Link className="chip" href={href("")} aria-current={!category ? "true" : undefined}>All</Link>
            {cats.map((c) => <Link key={c} className="chip" href={href(c)} aria-current={category === c ? "true" : undefined}>{c}</Link>)}
          </nav>
          <span className="muted small">{list.length} {list.length === 1 ? "post" : "posts"}</span>
        </div>
        {list.length === 0 ? (
          <div className="card"><strong>No posts here yet.</strong><p className="muted">Be the first to write one.</p><span style={{ alignSelf: "flex-start" }}>{write}</span></div>
        ) : layout === "grid" ? (
          <div className="artgrid">
            {list.map((p) => (
              <article key={p.id} className="acard">
                <div className="ph"><img src={img(p)} alt="" loading="lazy" /></div>
                <div className="bd">
                  <span className="acat">{p.cat}</span>
                  <h3><Link className="atitle" href={`/member-blogs/${p.id}`}>{p.title}</Link></h3>
                  <Byline p={p} />
                  <span className="ameta" style={{ marginTop: "auto" }}>{live(p)} · {readMinutes(p.blocks)}</span>
                  <div className="row"><Link className="btn sm ghost" href={`/member-blogs/${p.id}`}>Read post</Link><SaveBtn item={key(p.id)} saved={saved.has(key(p.id))} signedIn={!!userId} /></div>
                </div>
              </article>
            ))}
          </div>
        ) : layout === "list" ? (
          <div className="card" style={{ gap: 0 }}>
            {list.map((p) => (
              <div key={p.id} className="mbrow">
                <span className="th"><img src={img(p)} alt="" loading="lazy" /></span>
                <div className="stack grow" style={{ gap: 5, minWidth: 0 }}>
                  <span className="acat">{p.cat}</span>
                  <Link className="atitle" style={{ font: "700 17px/1.3 var(--display)" }} href={`/member-blogs/${p.id}`}>{p.title}</Link>
                  <span className="row" style={{ flexWrap: "wrap" }}><Byline p={p} /><span className="ameta">{live(p)} · {readMinutes(p.blocks)}</span></span>
                </div>
                <SaveBtn item={key(p.id)} saved={saved.has(key(p.id))} signedIn={!!userId} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ gap: 0 }}>
            {list.map((p) => (
              <div key={p.id} className="mbcompact">
                <span className="ameta" style={{ flex: "0 0 96px" }}>{live(p)}</span>
                <Link className="atitle grow" style={{ font: "600 15px/1.35 var(--display)" }} href={`/member-blogs/${p.id}`}>{p.title}</Link>
                <span className="ameta">{p.author?.full_name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="band" style={{ marginTop: 40 }}>
          <div className="stack grow" style={{ flexBasis: 380, gap: 6 }}>
            <h2 style={{ fontSize: 18 }}>Know something other owners should?</h2>
            <p>Write it once and it stays on your profile, in the directory and in the feed.</p>
          </div>
          {write}
        </div>
      </div>
    </div>
  );
}

function Body({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <>
      {blocks.map(([t, v], i) => {
        if (!String(v).trim()) return null;
        if (t === "h") return <h2 key={i}>{v}</h2>;
        if (t === "q") return <blockquote key={i}>{v}</blockquote>;
        if (t === "ul") return <ul key={i} style={{ margin: 0, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 6 }}>{v.split("\n").filter((x) => x.trim()).map((x, j) => <li key={j}>{x}</li>)}</ul>;
        if (t === "img") return <div key={i} className="heroimg" style={{ margin: "4px 0" }}><img src={v} alt="" /></div>;
        return <p key={i}>{v}</p>;
      })}
    </>
  );
}

export async function MemberBlogPage({ id }: { id: string }) {
  const rules = await getHubSettings("blogs");
  const { supabase, userId, isStaff } = await getViewer();
  const { data } = await supabase.from("member_blogs").select(MB_SELECT).eq("id", id).maybeSingle();
  const p = data as unknown as MemberBlog | null;
  if (!p) return null;
  const mine = p.author_id === userId;
  const a = p.author;
  const key = `memberblogs/${p.id}`;
  const [{ data: m }, { data: relData }] = await Promise.all([
    userId ? supabase.from("article_marks").select("kind").eq("user_id", userId).eq("item", key).eq("kind", "saved") : Promise.resolve({ data: [] as { kind: string }[] }),
    supabase.from("member_blogs").select(MB_SELECT).eq("status", "published").neq("id", p.id).order("published_at", { ascending: false }).limit(12),
  ]);
  const saved = ((m ?? []) as unknown[]).length > 0;
  const rel = ((relData ?? []) as unknown as MemberBlog[]).sort((x, y) => Number(y.cat === p.cat) - Number(x.cat === p.cat)).slice(0, 3);
  const style = String(rules.imgStyle);
  const nets = Object.entries(rules.share as Record<string, boolean>).filter(([, on]) => on).map(([k]) => k);
  const notice = p.status === "review" ? "Your blog post is under review. It will be published once the Hub team approves it."
    : p.status === "sent_back" ? "The Hub team sent this post back. Edit it and submit it again."
    : p.status === "scheduled" && p.scheduled_at && p.scheduled_at > new Date().toISOString() ? `Scheduled. This post will publish on ${when(p.scheduled_at)}.`
    : p.status === "draft" ? "Draft. Only you can see this." : "";
  const byline = (
    <div className="byline">
      {a && <ZipAv name={a.full_name || "Member"} src={a.avatar_url} />}
      <span className="stack grow" style={{ gap: 1 }}>{a && <Link href={`/members/${a.id}`} className="namebtn">{a.full_name}</Link>}<span className="ameta">{a?.headline}</span></span>
      <span className="ameta">{live(p)} · {readMinutes(p.blocks)}</span>
      <SaveBtn item={key} saved={saved} signedIn={!!userId} />
      {mine && <Link className="act" href={`/write?id=${p.id}`}><Ic n="edit" s={15} />Edit</Link>}
      {(mine || isStaff) && <DeleteBlog id={p.id} />}
    </div>
  );
  const top = style === "overlay" ? (
    <>
      <div className="overlayhero"><img src={img(p)} alt="" /><div className="in"><span className="acat" style={{ color: "#FCA5A5" }}>{p.cat}</span><h1>{p.title}</h1></div></div>
      {byline}
    </>
  ) : style === "wide" ? (
    <>
      <div className="heroimg" style={{ margin: "14px 0 20px" }}><img src={img(p)} alt="" style={{ aspectRatio: "21/9" }} /></div>
      <span className="acat">{p.cat}</span><h1>{p.title}</h1>{byline}
    </>
  ) : (
    <>
      <div style={{ marginTop: 18 }}><span className="acat">{p.cat}</span></div><h1>{p.title}</h1>{byline}
      <div className="heroimg"><img src={img(p)} alt="" /></div>
    </>
  );

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="artwrap">
          <article className="article">
            <Link className="small backlink" href="/member-blogs">← All member blogs</Link>
            {notice && <div style={{ marginTop: 14 }}><div className="notice" role="status">{notice}</div></div>}
            {top}
            <div className="prose"><Body blocks={p.blocks} /></div>
            {p.tags.length > 0 && <div className="chips" style={{ marginTop: 24 }}>{p.tags.map((t) => <Link key={t} href={`/member-blogs?q=${encodeURIComponent(t)}`} className="tag">#{t}</Link>)}</div>}
            {nets.length > 0 && p.status === "published" && (
              <div className="byline" style={{ marginTop: 24 }}><span className="grow small"><strong>Share this post</strong></span><BlogShare networks={nets} title={p.title} /></div>
            )}
            {rules.authorBox && a && (
              <div className="authorbox">
                <ZipAv name={a.full_name || "Member"} src={a.avatar_url} size="l" />
                <div className="stack grow" style={{ gap: 6 }}>
                  <span className="eyebrow">Written by</span>
                  <Link href={`/members/${a.id}`} className="namebtn">{a.full_name}</Link>
                  <span className="muted small">{[a.headline, a.location].filter(Boolean).join(" · ")}</span>
                  {a.bio && <span className="small">{a.bio.slice(0, 220)}</span>}
                  <div className="row"><Link className="btn sm ghost" href={`/members/${a.id}`}>View profile</Link></div>
                </div>
              </div>
            )}
            {p.status === "published" && (
              <div className="card" style={{ marginTop: 24 }}>
                <h2>Talk about this with other owners</h2>
                <p className="muted">Start a discussion in the Hub. The link to this post is added for you.</p>
                <Link className="btn" style={{ alignSelf: "flex-start" }} href="/feed?compose=question">Start a discussion</Link>
              </div>
            )}
          </article>
          <aside className="artside" aria-label="More">
            <div className="card">
              <h2>More from members</h2>
              <div>
                {rel.map((x) => (
                  <Link key={x.id} className="rel" href={`/member-blogs/${x.id}`}>
                    <span className="th"><img src={img(x)} alt="" /></span>
                    <span className="stack" style={{ gap: 2 }}><b>{x.title}</b><span className="ameta">{x.author?.full_name}</span></span>
                  </Link>
                ))}
                {rel.length === 0 && <p className="muted small">More posts will appear here.</p>}
              </div>
            </div>
            <div className="card"><h2>Have something to share?</h2><p className="muted small">Members can write their own posts.</p><Link className="btn sm" style={{ alignSelf: "flex-start" }} href="/write">Write a post</Link></div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export { STATUS_LABEL };
