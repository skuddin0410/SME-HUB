import { Crumbs } from "@/components/zip/crumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/hub";
import { FollowTag, MyTagChip } from "@/components/zip/hashtag-bits";
import { Ic } from "@/components/zip/ic";
import { fetchPosts, getViewer } from "@/lib/hub";
import { canon, extractTags } from "@/lib/zip/hashtags";
import { aliasesOf, getMyTags, getTagIndex, getTagRules, type TagRow } from "@/lib/zip/hashtags-server";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

const n = (x: number, w: string) => `${x} ${w}${x === 1 ? "" : "s"}`;

export async function TrendingTags({ tags }: { tags?: TagRow[] }) {
  const r = await getTagRules();
  if (!r.on || !r.trend) return null;
  const { supabase } = await getViewer();
  const list = (tags ?? (await getTagIndex(supabase))).slice(0, 6);
  if (!list.length) return null;
  return (
    <div className="card">
      <div className="row"><h2 className="grow">Trending hashtags</h2><Link className="small" style={{ color: "var(--link)", fontWeight: 600 }} href="/hashtags">See all</Link></div>
      <div className="list">
        {list.map((x) => (
          <div className="row" key={x.tag}><Link className="hlink grow" style={{ textAlign: "left" }} href={`/hashtags/${x.tag}`}>#{x.tag}</Link><span className="muted small">{n(x.uses, "post")}</span></div>
        ))}
      </div>
    </div>
  );
}

/** "Hashtags I follow", shown on a member's own profile. */
export async function MyTagsCard() {
  const r = await getTagRules();
  if (!r.on || !r.follow || !r.profile) return null;
  const { supabase, userId } = await getViewer();
  if (!userId) return null;
  const mine = await getMyTags(supabase, userId);
  return (
    <div className="card psec">
      <div className="row"><h2 className="grow" style={{ fontSize: 16 }}>Hashtags I follow</h2><Link className="btn sm ghost" href="/hashtags">Find more</Link></div>
      {mine.length ? <div className="chips">{mine.map((t) => <MyTagChip key={t} tag={t} />)}</div> : <p className="muted small">You do not follow any hashtags yet.</p>}
    </div>
  );
}

export async function HashtagsDirectory({ q = "" }: { q?: string }) {
  const r = await getTagRules();
  if (!r.on) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="card" style={{ maxWidth: 560, margin: "40px auto" }}><h1 style={{ font: "800 20px var(--display)" }}>Hashtags are turned off</h1><p className="muted">The Hub team has switched hashtags off.</p></div>
      </div></div>
    );
  }
  const { supabase, userId } = await getViewer();
  const [all, mine] = await Promise.all([getTagIndex(supabase), getMyTags(supabase, userId)]);
  const term = q.toLowerCase().replace(/^#/, "").replace(/[^a-zà-ſ0-9_]/g, "").slice(0, 40);
  const list = term ? all.filter((x) => x.tag.includes(term)) : all;
  const followed = all.filter((x) => mine.includes(x.tag));
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead">
          <Crumbs items={[["Hashtags"]]} />
          <h1>Hashtags</h1>
          <p className="muted">Tap a hashtag to see every post that uses it.{r.follow ? " Follow the ones you care about and they get their own filter on your Home feed." : ""}</p>
        </div>
        <form role="search" className="tools" style={{ marginBottom: 18 }}>
          <label className="sr" htmlFor="htq">Search hashtags</label>
          <input id="htq" name="q" className="field" type="search" style={{ flex: "1 1 260px" }} placeholder="Search hashtags, such as grants" defaultValue={q} />
        </form>
        {r.follow && userId && followed.length > 0 && !term && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h2>Hashtags I follow</h2>
            <div className="chips">{followed.map((x) => <Link key={x.tag} className="chip" href={`/hashtags/${x.tag}`}>#{x.tag} · {x.uses}</Link>)}</div>
          </div>
        )}
        {list.length ? (
          <div className="htgrid">
            {list.map((x, i) => (
              <div className="card htcard" key={x.tag}>
                <div className="row"><Link className="hlink grow" style={{ textAlign: "left", font: "700 17px var(--display)" }} href={`/hashtags/${x.tag}`}>#{x.tag}</Link>{i < 3 && !term && x.fresh > 0 && <span className="pill warn">Trending</span>}</div>
                <span className="muted small">{n(x.uses, "post")}{r.follow ? ` · ${n(x.followers, "follower")}` : ""}</span>
                <div className="row">
                  {r.follow && <FollowTag tag={x.tag} following={mine.includes(x.tag)} signedIn={!!userId} />}
                  <Link className="btn sm ghost" href={`/hashtags/${x.tag}`}>See posts</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><p className="muted">{term ? "No hashtag matches that search." : "No hashtags have been used yet. Add one to a post, such as #grants."}</p></div>
        )}
      </div>
    </div>
  );
}

export async function TagPage({ tag }: { tag: string }) {
  const r = await getTagRules();
  if (!r.on) notFound();
  const t = canon(tag.replace(/^#/, ""), r.merge);
  if (!/^[a-zà-ſ][a-z0-9_à-ſ]*$/.test(t) || r.removed[t] || r.blocked.includes(t)) notFound();
  const viewer = await getViewer();
  const { supabase, userId } = viewer;
  const [all, mine, raw] = await Promise.all([
    getTagIndex(supabase), getMyTags(supabase, userId),
    fetchPosts(supabase, userId, { tags: aliasesOf(t, r.merge), limit: 40 }),
  ]);
  const posts = raw.filter((p) => extractTags(p.body, r).includes(t));
  const row = all.find((x) => x.tag === t);
  const rel = new Map<string, number>();
  for (const p of posts) for (const u of extractTags(p.body, r)) if (u !== t) rel.set(u, (rel.get(u) ?? 0) + 1);
  const together = [...rel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="cols">
          <section className="mid" style={{ gap: 20 }}>
            <div className="card hthero">
              <Link className="small backlink" href="/hashtags">← All hashtags</Link>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <span className="htbig" aria-hidden="true">#</span>
                <div className="stack grow" style={{ gap: 2, flexBasis: 220 }}>
                  <h1>#{t}</h1>
                  <span className="muted">{n(row?.uses ?? posts.length, "post")}{r.follow ? ` · ${n(row?.followers ?? 0, "follower")}` : ""}</span>
                </div>
                {r.follow && <FollowTag tag={t} following={mine.includes(t)} signedIn={!!userId} cls="btn" />}
                {userId && <Link className="btn ghost" href={`/feed?compose=update&tag=${t}`}><Ic n="edit" s={15} />Post with this hashtag</Link>}
              </div>
            </div>
            {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} viewer={viewer} />) : <div className="card"><p className="muted">No posts use this hashtag yet. Be the first.</p></div>}
          </section>
          <aside className="rail" style={{ flex: "1 1 300px" }}>
            {together.length > 0 && (
              <div className="card"><h2>Often used together</h2><div className="chips">{together.map((u) => <Link key={u} className="chip" href={`/hashtags/${u}`}>#{u}</Link>)}</div></div>
            )}
            <TrendingTags tags={all} />
          </aside>
        </div>
      </div>
    </div>
  );
}
