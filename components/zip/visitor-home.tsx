import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { ZipAv, ago, Join } from "@/components/zip/bits";
import { MemberOfTheDay } from "@/components/zip/motd";
import { BLOG } from "@/lib/content";
import type { Post } from "@/lib/hub";

const FACES = ["priya", "luc", "sara", "daniel", "mei", "arjun"];
const KIND_LABEL: Record<string, string> = { update: "Update", question: "Question", win: "Win", offer: "Offer", hiring: "Hiring", intro: "Intro" };

type Group = { slug: string; name: string };

function Hero() {
  return (
    <section className="hero" aria-label="Welcome">
      <div className="card lead">
        <p className="eyebrow red">Canada’s small business community</p>
        <h1>Get known. Get answers. Get customers.</h1>
        <p className="muted" style={{ fontSize: 15, maxWidth: 620 }}>
          A free community for Canadian small-business owners, from the team behind CanadianSME Small Business Magazine.
        </p>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Join>Join free</Join>
          <Link href="/membership-plans">See what members get</Link>
        </div>
        <div className="row" style={{ flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <div className="faces">
            {FACES.map((f) => (
              <ZipAv key={f} name={f} src={`/zip/img/p-${f}.jpg`} />
            ))}
          </div>
          <span className="muted small">Owners from Halifax to Vancouver are already talking.</span>
        </div>
      </div>
      <div className="card found">
        <span className="tag badge" style={{ alignSelf: "flex-start" }}>
          Founding Member
        </span>
        <h2 style={{ fontSize: 19, lineHeight: 1.25 }}>Be one of the first 500 members.</h2>
        <p>Join now and keep a permanent Founding Member badge on your profile.</p>
        <Join start className="btn light">Claim my badge</Join>
      </div>
    </section>
  );
}

function LeftRail() {
  return (
    <aside className="rail" aria-label="Welcome">
      <div className="card pcard">
        <div className="pban" />
        <div className="pbody" style={{ paddingTop: 14 }}>
          <div className="pname">Where Canadian business owners meet.</div>
          <p className="muted small">Ask questions, share what is working and find the people who can help you grow.</p>
          <Join>Join free</Join>
          <Link href="/auth/login" className="linkbtn" style={{ alignSelf: "center", color: "var(--link)", textDecoration: "none" }}>
            I already have an account
          </Link>
        </div>
      </div>
      <MemberOfTheDay />
      <div className="card">
        <div className="row">
          <h2 className="grow eyebrow" style={{ color: "var(--muted)", fontSize: 12 }}>
            Recent articles
          </h2>
          <span className="tag ca">CA Editorial</span>
        </div>
        <div>
          {BLOG.slice(0, 6).map((a) => (
            <Link key={a.slug} className="art" href={`/blog/${a.slug}`}>
              <span className="th" aria-hidden="true">
                {a.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
              </span>
              <span>
                <b>{a.title}</b>
                <span>CanadianSME Magazine</span>
              </span>
            </Link>
          ))}
        </div>
        <Link className="seeall" href="/blog">
          See all articles
          <Ic n="right" s={16} />
        </Link>
      </div>
    </aside>
  );
}

function RightRail({ posts, groups }: { posts: Post[]; groups: Group[] }) {
  const unanswered = posts.filter((p) => p.kind === "question" && p.comments === 0).slice(0, 3);
  const tags = new Map<string, number>();
  for (const p of posts) for (const t of new Set((p.body.match(/#[a-z0-9_]+/gi) ?? []).map((x) => x.slice(1).toLowerCase()))) tags.set(t, (tags.get(t) ?? 0) + 1);
  const trending = [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <aside className="rail" aria-label="This week">
      <div className="card" style={{ borderColor: "#FECACA" }}>
        <div className="row">
          <h2 className="grow">Made in Canada Pavilion</h2>
          <span className="claim">New</span>
        </div>
        <p className="muted small">Canadian manufacturers, owner-run services and AI tools built here.</p>
        <Link className="btn sm" href="/businesses" style={{ alignSelf: "flex-start" }}>
          Visit the pavilion
        </Link>
      </div>
      <div className="card">
        <h2>Can you help?</h2>
        {unanswered.length ? (
          <>
            <div className="list">
              {unanswered.map((p) => (
                <div key={p.id} className="stack">
                  <span className="small">{p.body.slice(0, 84)}…</span>
                  <span className="muted small">{p.author.full_name}</span>
                </div>
              ))}
            </div>
            <Join start className="btn sm ghost">See unanswered questions</Join>
          </>
        ) : (
          <p className="muted small">Every question has an answer right now.</p>
        )}
      </div>
      <div className="card">
        <p className="eyebrow">This week’s live session</p>
        <h2 style={{ fontSize: 15, lineHeight: 1.3 }}>Ask an expert: landing your first wholesale account</h2>
        <p className="muted small">Wed, Jan 13, 2027 · 12:00 pm ET</p>
        <Join start className="btn sm">Save my seat</Join>
      </div>
      {trending.length > 0 && (
        <div className="card">
          <div className="row">
            <h2 className="grow">Trending hashtags</h2>
            <Link className="small" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }} href="/search">
              See all
            </Link>
          </div>
          <div className="list">
            {trending.map(([t, n]) => (
              <div key={t} className="row">
                <Link className="hlink grow" href={`/search?q=%23${t}`} style={{ textAlign: "left", textDecoration: "none" }}>
                  #{t}
                </Link>
                <span className="muted small">
                  {n} post{n === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {groups.length > 0 && (
        <div className="card">
          <h2>Groups to explore</h2>
          <div className="list">
            {groups.slice(0, 4).map((g) => (
              <div key={g.slug} className="row">
                <Link className="namebtn grow" href={`/groups/${g.slug}`} style={{ textDecoration: "none" }}>
                  {g.name}
                </Link>
                <Join className="btn sm">Join</Join>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <h2>How the week runs</h2>
        <div className="list">
          <div className="stack">
            <strong>Monday</strong>
            <span className="muted small">Question of the week</span>
          </div>
          <div className="stack">
            <strong>Wednesday</strong>
            <span className="muted small">Live session with an expert</span>
          </div>
          <div className="stack">
            <strong>Friday</strong>
            <span className="muted small">Member wins (Member of the Day every day)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function VisitorPost({ p }: { p: Post }) {
  const total = Object.values(p.counts).reduce((a, b) => a + (b ?? 0), 0) || p.likes;
  return (
    <article className="card post">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <ZipAv name={p.author.full_name} src={p.author.avatar_url} />
        <div className="grow stack">
          <Link className="namebtn" href={`/members/${p.author.id}`} style={{ textDecoration: "none" }}>
            {p.author.full_name}
          </Link>
          {p.author.headline && <span className="muted small">{p.author.headline}</span>}
          <span className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            <span className="small muted">
              {ago(p.created_at)}
              {p.group ? ` · ${p.group.name}` : ""}
            </span>
            <span className={`tag ${p.kind}`}>{KIND_LABEL[p.kind] ?? "Update"}</span>
          </span>
        </div>
        <Join className="act blue">+ Connect</Join>
        <Join className="iconbtn" label="Bookmark post">
          <Ic n="mark" s={16} />
        </Join>
      </div>
      {p.title && <h3 className="ptitle">{p.title}</h3>}
      {p.body && <p className="body">{p.body}</p>}
      {(p.cover_url || p.image_url) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pic" src={(p.cover_url || p.image_url)!} alt={`Photo added by ${p.author.full_name}`} />
      )}
      {p.kind === "question" && p.comments === 0 && (
        <p className="small" style={{ fontWeight: 600, color: "var(--brand-ink)" }}>
          No answers yet. Can you help?
        </p>
      )}
      <div className="acts">
        <Join className="act rxbtn">
          <span aria-hidden="true">👍</span>React
        </Join>
        {total > 0 && (
          <span className="rxsum">
            <b>{total}</b>
          </span>
        )}
        <span className="spacer" />
        <Link className="act plain" href={`/posts/${p.id}`} aria-label={`Comments, ${p.comments}`}>
          <Ic n="msg" s={15} />
          {p.comments}
        </Link>
        <Join className="act plain" label={`Repost, ${p.reposts}`}>
          <Ic n="repost" s={15} />
          {p.reposts}
        </Join>
        <Join className="act plain" label="Send in a message">
          <Ic n="send" s={15} />
        </Join>
      </div>
    </article>
  );
}

/** The guide's visitor home: the welcome hero, then the feed with a join prompt where the composer would be. */
export function VisitorHome({ posts, groups }: { posts: Post[]; groups: Group[] }) {
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <Hero />
        <div className="cols">
          <LeftRail />
          <section className="mid" aria-label="Posts">
            <div className="card">
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div className="grow stack" style={{ flexBasis: 240 }}>
                  <strong>Have a question or a win to share?</strong>
                  <span className="muted small">Join free to post, reply and connect with other owners.</span>
                </div>
                <Join>Join free</Join>
              </div>
            </div>
            <div className="tools">
              <h2 style={{ font: "700 15px var(--display)" }}>Latest from the community</h2>
              <span className="grow" />
              <form action="/" method="get" style={{ display: "contents" }}>
                <label className="sr" htmlFor="sort">
                  Sort posts
                </label>
                <select id="sort" name="sort" className="field" style={{ flex: "0 0 150px", width: 150 }} defaultValue="top">
                  <option value="top">Most useful</option>
                  <option value="latest">Latest</option>
                </select>
              </form>
            </div>
            <article className="card post pinned">
              <p className="eyebrow">Pinned · Question of the week</p>
              <h2 style={{ fontSize: 17, lineHeight: 1.3 }}>What is one change you made this year that brought in more customers?</h2>
              <p className="muted">The most helpful answer is featured in Friday’s newsletter.</p>
              <Join start className="btn line sm">Add your answer</Join>
            </article>
            {posts.length === 0 && (
              <div className="card">
                <p>The feed is quiet. Join free to share the first update.</p>
              </div>
            )}
            {posts.map((p) => (
              <VisitorPost key={p.id} p={p} />
            ))}
          </section>
          <RightRail posts={posts} groups={groups} />
        </div>
      </div>
    </div>
  );
}
