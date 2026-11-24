/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { GUIDES, RESOURCE_PAGES } from "@/lib/content";
import { findFull, type FullPage } from "@/lib/smehub";
import { GPROVS, RES, checklist } from "@/lib/zip/centres";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40, maxWidth: 980 }}>{children}</div></div>
);

function Faq({ items }: { items: [string, string][] }) {
  return <div>{items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>;
}

export function ZipGuidesIndex() {
  return (
    <Wrap>
      <div className="card doc">
        <p className="eyebrow">About SME Hub</p>
        <h1>Business guides</h1>
        <p className="lead">A guide to starting, running and growing a business in every province and territory.</p>
        <div className="feat">
          {GPROVS.map(([slug, name, desc]) => (
            <Link key={slug} href={`/guides/${slug}`} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 4, textDecoration: "none", color: "var(--ink)" }}>
              <strong>{name}</strong>
              <span className="muted small">{desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

export function ZipResourcesIndex() {
  return (
    <Wrap>
      <div className="card doc">
        <p className="eyebrow">SMB resources</p>
        <h1>Resources for founders</h1>
        <p className="lead">We support entrepreneurs from every background. Each resource centre brings together guides, mentorship, networking and funding information.</p>
        <div className="feat">
          {RESOURCE_PAGES.map((p) => {
            const z = RES[p.slug.split("-")[0]];
            const full = findFull(`/resources/${p.slug}`);
            return (
              <Link key={p.slug} href={`/resources/${p.slug}`} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6, textDecoration: "none", color: "var(--ink)" }}>
                {full && <img src={full.img} alt="" loading="lazy" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }} />}
                <strong>{z?.title ?? p.title}</strong>
                <span className="muted small">{p.intro}</span>
                <span className="small" style={{ color: "var(--link)", fontWeight: 600 }}>{full?.orgs.length ?? p.orgs.length} organisations</span>
              </Link>
            );
          })}
        </div>
      </div>
    </Wrap>
  );
}

function Orgs({ page }: { page: FullPage }) {
  return (
    <>
      <h2>Explore the best available resources for {page.band}</h2>
      <p className="muted small" style={{ marginTop: -8 }}>{page.orgs.length} organisations, programs and networks</p>
      <div className="stack" style={{ gap: 12 }}>
        {page.orgs.map((o) => (
          <article key={o.name + o.logo} className="card" style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <span style={{ flex: "0 0 140px", height: 90, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
              <img src={o.logo} alt={`${o.name} logo`} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 8 }} />
            </span>
            <div className="stack grow" style={{ flexBasis: 280, gap: 6 }}>
              <h3 style={{ fontSize: 15 }}>{o.name}</h3>
              <p className="muted small">{o.text}</p>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <a className="btn sm" href={o.website} target="_blank" rel="noreferrer">Visit website</a>
                {o.socials.map((s) => <a key={s.kind} className="btn sm ghost" href={s.url} target="_blank" rel="noreferrer" aria-label={`${o.name} on ${s.kind}`}>{s.kind}</a>)}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function ZipCentrePage({ page }: { page: FullPage }) {
  const z = RES[page.slug === "resources-for-lgbtq" ? "lgbtq" : page.slug.split("-")[0]];
  const title = z?.title ?? page.heads[0].replace(/:$/, "");
  return (
    <Wrap>
      <div className="card doc">
        <Link className="small" href="/resources" style={{ color: "var(--muted)", fontWeight: 600 }}>← All SMB resources</Link>
        <p className="eyebrow">SMB resources</p>
        <h1>{title}</h1>
        <p className="lead">{z?.lead ?? page.intro}</p>
        <h2>How the centre helps</h2>
        <div className="feat">{(z?.feat ?? []).map(([a, b]) => <div key={a}><strong>{a}</strong><span className="muted small">{b}</span></div>)}</div>
        <h2>Good to know</h2>
        <Faq items={[...page.left, ...page.right]} />
        <h2>Start here</h2>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link className="btn" href="/groups">Join a group</Link>
          <Link className="btn ghost" href="/smb-advisor">Find an advisor</Link>
          <Link className="btn ghost" href="/ask" prefetch={false}>Ask the Hub AI about funding</Link>
        </div>
        <Orgs page={page} />
      </div>
    </Wrap>
  );
}

export function ZipGuidePage({ page }: { page: FullPage }) {
  // Update 12: the name and short description come from the guide list (GPROVS), never from the business province codes
  const gp = GPROVS.find(([slug]) => page.path === `/guides/${slug}`);
  const n = gp?.[1] ?? GUIDES.find((x) => page.path === `/guides/${x.slug}`)?.name ?? page.heads[0].replace(/:$/, "").replace(/^The | Small Business Guide$/g, "");
  return (
    <Wrap>
      <div className="card doc">
        <Link className="small" href="/guides" style={{ color: "var(--muted)", fontWeight: 600 }}>← All province guides</Link>
        <p className="eyebrow">Province-wide resources</p>
        <h1>The {n} Small Business Guide</h1>
        {gp && <p className="lead">{gp[2]}</p>}
        <p>{page.intro}</p>
        <h2>Starting checklist</h2>
        <Faq items={checklist(n)} />
        <h2>What to know before you start</h2>
        <Faq items={[...page.left, ...page.right]} />
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link className="btn" href="/members">Find owners in {n}</Link>
          <Link className="btn ghost" href="/ask" prefetch={false}>Ask the Hub AI</Link>
        </div>
        <Orgs page={page} />
      </div>
    </Wrap>
  );
}
