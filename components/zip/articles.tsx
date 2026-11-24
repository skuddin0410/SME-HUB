import Link from "next/link";
import { notFound } from "next/navigation";
import { SECTIONS, type SectionKey } from "@/lib/content";
import { getViewer } from "@/lib/hub";
import { KIND_LABEL, pieceMeta } from "@/lib/zip/articles";
import { ReactBtn, SaveBtn, ShareLink } from "@/components/zip/article-client";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

const TABS: [string, string, string][] = [["blog", "Articles", "/blog"], ["news", "News", "/news"], ["podcast", "Podcast", "/podcast"], ["memberblogs", "Member blogs", "/member-blogs"]];

export function Tabs({ k }: { k: string }) {
  return (
    <div className="arttabs" role="tablist" aria-label="Type">
      {TABS.map(([key, label, href]) => (
        <Link key={key} className="chip" role="tab" aria-selected={key === k} aria-current={key === k ? "true" : undefined} href={href}>{label}</Link>
      ))}
    </div>
  );
}

async function savedSet(section: SectionKey) {
  const { supabase, userId } = await getViewer();
  if (!userId) return { userId, saved: new Set<string>() };
  const { data } = await supabase.from("article_marks").select("item").eq("user_id", userId).eq("kind", "saved").like("item", `${section}/%`);
  return { userId, saved: new Set(((data ?? []) as { item: string }[]).map((r) => r.item)) };
}

export async function ZipStoryIndex({ section, q = "", cat = "" }: { section: SectionKey; q?: string; cat?: string }) {
  const s = SECTIONS[section];
  const L = KIND_LABEL[section];
  const { userId, saved } = await savedSet(section);
  const all = s.items.map((it, i) => ({ it, i, m: pieceMeta(section, i) }));
  const cats = [...new Set(all.map((a) => a.m.cat))];
  const category = cats.includes(cat) ? cat : "";
  const ql = q.toLowerCase();
  const idx = all.filter((a) => (!category || a.m.cat === category) && (!ql || a.it.title.toLowerCase().includes(ql)));
  const feat = !ql && !category ? idx[0] : null;
  const rest = idx.filter((a) => a !== feat);
  const href = (c: string) => `${s.path}${c || ql ? "?" : ""}${[c && `cat=${encodeURIComponent(c)}`, ql && `q=${encodeURIComponent(q)}`].filter(Boolean).join("&")}`;
  const itemKey = (slug: string) => `${section}/${slug}`;

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <Tabs k={section} />
        <div className="arthead">
          <div className="stack grow" style={{ flexBasis: 380, gap: 6 }}>
            <p className="eyebrow">From CanadianSME Small Business Magazine</p>
            <h1>{section === "blog" ? "Articles" : s.name}</h1>
            <p className="muted" style={{ fontSize: 15 }}>{s.intro}</p>
          </div>
          <form style={{ flex: "0 1 320px" }} role="search">
            <label className="sr" htmlFor="artq">Search</label>
            <input id="artq" name="q" className="field" type="search" style={{ borderRadius: 999 }} placeholder={`Search ${L.plural}`} defaultValue={q} />
            {category && <input type="hidden" name="cat" value={category} />}
          </form>
        </div>

        {feat && (
          <article className="card artfeat">
            <div className="ph"><img src={feat.m.img} alt="" /></div>
            <div className="tx">
              <span className="acat">Latest · {feat.m.cat}</span>
              <h2><Link className="atitle" href={`${s.path}/${feat.it.slug}`}>{feat.it.title}</Link></h2>
              <span className="ameta">{L.by} · {feat.m.date} · {feat.m.time}</span>
              <div className="row" style={{ flexWrap: "wrap", marginTop: 6 }}>
                <Link className="btn" href={`${s.path}/${feat.it.slug}`}>{L.read}</Link>
                <SaveBtn item={itemKey(feat.it.slug)} saved={saved.has(itemKey(feat.it.slug))} signedIn={!!userId} />
              </div>
            </div>
          </article>
        )}

        <div className="tools" style={{ marginBottom: 18 }}>
          <nav className="chips grow" aria-label="Topic">
            <Link className="chip" href={href("")} aria-current={!category ? "true" : undefined}>All topics</Link>
            {cats.map((c) => <Link key={c} className="chip" href={href(c)} aria-current={category === c ? "true" : undefined}>{c}</Link>)}
          </nav>
          <span className="muted small">{idx.length} {L.plural}</span>
        </div>

        {rest.length || feat ? (
          <div className="artgrid">
            {rest.map(({ it, m }) => (
              <article key={it.slug} className="acard">
                <div className="ph"><img src={m.img} alt="" loading="lazy" /></div>
                <div className="bd">
                  <span className="acat">{m.cat}</span>
                  <h3><Link className="atitle" href={`${s.path}/${it.slug}`}>{it.title}</Link></h3>
                  <span className="ameta" style={{ marginTop: "auto" }}>{m.date} · {m.time}</span>
                  <div className="row">
                    <Link className="btn sm ghost" href={`${s.path}/${it.slug}`}>{L.read}</Link>
                    <SaveBtn item={itemKey(it.slug)} saved={saved.has(itemKey(it.slug))} signedIn={!!userId} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card">
            <strong>Nothing matches.</strong>
            <p className="muted">Try another word or topic.</p>
            <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href={s.path}>Clear search</Link>
          </div>
        )}

        <div className="band" style={{ marginTop: 40 }}>
          <div className="stack grow" style={{ flexBasis: 380, gap: 6 }}>
            <h2 style={{ fontSize: 18 }}>Get every edition of CanadianSME Magazine</h2>
            <p>A new issue each month, free to read online.</p>
          </div>
          <Link className="btn light" href="/magazine">Subscribe now</Link>
        </div>
      </div>
    </div>
  );
}

export async function ZipStoryPage({ section, slug }: { section: SectionKey; slug: string }) {
  const s = SECTIONS[section];
  const i = s.items.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  const L = KIND_LABEL[section];
  const pod = section === "podcast";
  const item = s.items[i];
  const m = pieceMeta(section, i);
  const key = `${section}/${slug}`;
  const { supabase, userId } = await getViewer();
  const [{ saved }, counts, mine] = await Promise.all([
    savedSet(section),
    supabase.rpc("article_mark_counts", { p_item: key }),
    userId ? supabase.from("article_marks").select("kind").eq("user_id", userId).eq("item", key) : Promise.resolve({ data: [] as { kind: string }[] }),
  ]);
  const n = (k: string) => Number(((counts.data ?? []) as { kind: string; n: number }[]).find((c) => c.kind === k)?.n ?? 0);
  const mark = new Set(((mine.data ?? []) as { kind: string }[]).map((r) => r.kind));
  const secs = pod ? ["About this episode", "What you will hear", "Guest and links"] : ["The background", "What changed", "What it means for your business"];
  const others = s.items.map((x, n2) => ({ x, n2 })).filter((r) => r.n2 !== i);
  const sameCat = others.filter((r) => pieceMeta(section, r.n2).cat === m.cat);
  const rel = [...sameCat, ...others.filter((r) => !sameCat.includes(r))].slice(0, 3);

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="artwrap">
          <article className="article">
            <Link className="small" href={s.path} style={{ color: "var(--muted)", fontWeight: 600 }}>← All {pod ? "episodes" : section === "news" ? "news" : "articles"}</Link>
            <div style={{ marginTop: 18 }}><span className="acat">{m.cat}</span></div>
            <h1>{item.title}</h1>
            <div className="byline">
              <span className="lg" aria-hidden="true">SME</span>
              <span className="stack grow" style={{ gap: 1 }}>
                <strong>{L.by}</strong>
                <span className="ameta">{m.date} · {m.time}</span>
              </span>
              <SaveBtn item={key} saved={saved.has(key)} signedIn={!!userId} />
              <ShareLink />
            </div>
            <div className="heroimg"><img src={m.img} alt="" /></div>
            {pod && (
              <div className="player">
                <span className="pb" aria-hidden="true">▶</span>
                <span className="stack grow" style={{ gap: 8 }}><strong style={{ fontSize: 14 }}>Play episode</strong><span className="bar"><i /></span></span>
                <span className="small" style={{ opacity: 0.7 }}>{18 + (item.title.length % 25)}:00</span>
              </div>
            )}
            <div className="takeaways">
              <div className="row"><strong className="grow" style={{ font: "700 15px var(--display)" }}>Key takeaways</strong><span className="tag ai">AI summary</span></div>
              <ul>
                <li>The main point of the {L.one}, in one sentence.</li>
                <li>The most useful fact or number for an owner.</li>
                <li>One thing a reader can do this week.</li>
              </ul>
              <span className="muted small">Sample text. On the live site the Hub AI writes these three points from the real {L.one}.</span>
            </div>
            <div className="prose">
              <p className="ph">Sample layout. The full {pod ? "show notes" : "article"} from CanadianSME appears here on the live site. This preview shows how the page reads: a wide column, large text and clear headings.</p>
              {secs.map((t, k) => (
                <div key={t}>
                  <h2 id={`asec${k}`}>{t}</h2>
                  <p className="ph">Body text for this section goes here. Paragraphs are kept short so they are easy to read on a phone, with one idea in each.</p>
                  {k === 1 && <blockquote>A pull quote from the {pod ? "guest" : "article"} sits here, in large type, to break up the page.</blockquote>}
                  <p className="ph">A second paragraph follows, with room for links, lists and pictures where the story needs them.</p>
                </div>
              ))}
            </div>
            <div className="byline" style={{ marginTop: 36 }}>
              <span className="grow small"><strong>Was this useful?</strong></span>
              <ReactBtn item={key} kind="helpful" mine={mark.has("helpful")} count={n("helpful")} signedIn={!!userId} />
              <ReactBtn item={key} kind="insightful" mine={mark.has("insightful")} count={n("insightful")} signedIn={!!userId} />
            </div>
            <div className="card" style={{ marginTop: 8 }}>
              <h2>Talk about this with other owners</h2>
              <p className="muted">Start a discussion in the Hub. The link to this {L.one} is added for you.</p>
              <Link className="btn" style={{ alignSelf: "flex-start" }} href="/feed?compose=question">Start a discussion</Link>
            </div>
          </article>
          <aside className="artside" aria-label="More">
            <div className="card">
              <h2>In this {L.one}</h2>
              <div className="toc">{secs.map((t, k) => <a key={t} href={`#asec${k}`}>{t}</a>)}</div>
            </div>
            <div className="card">
              <h2>Related</h2>
              <div>
                {rel.map(({ x, n2 }) => {
                  const rm = pieceMeta(section, n2);
                  return (
                    <Link key={x.slug} className="rel" href={`${s.path}/${x.slug}`}>
                      <span className="th"><img src={rm.img} alt="" /></span>
                      <span className="stack" style={{ gap: 2 }}><b>{x.title}</b><span className="ameta">{rm.cat}</span></span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="card">
              <h2>Want advice on this?</h2>
              <p className="muted small">Ask an SME Advisor a question, or book a free 15-minute call.</p>
              <Link className="btn sm" style={{ alignSelf: "flex-start" }} href="/smb-advisor">Find an advisor</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
