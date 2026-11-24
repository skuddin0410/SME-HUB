import Link from "next/link";
import { notFound } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { GfBadge, GfNote, GfTag, GfTrust, GfWrap } from "@/components/grants/bits";
import { AskBox, GfProvider, ProgramButtons, ReadyCard } from "@/components/grants/client";
import { getGrant, getGrantMe } from "@/lib/grants-server";
import { PROV_NAMES } from "@/lib/grants";
import { pageMeta } from "@/lib/seo";
import "@/styles/tools.css";
import "@/styles/grants.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await getGrant((await params).id);
  return p ? pageMeta({ title: p.name, description: `${p.amount}. For ${p.use_for.toLowerCase()}. ${p.by_org}.`, path: `/grants/${p.id}` }) : { title: "Program not found" };
}

const KIND = {
  loan: <>This is a <b>loan</b>. You pay it back.</>,
  tax: <>This is a <b>tax credit</b>. You claim it on your tax return.</>,
  wage: <>This is a <b>wage subsidy</b>. It pays part of an employee’s wages.</>,
  grant: <>This is a <b>grant</b>. You don’t pay it back, but you must spend it as agreed and report on it.</>,
};

/** Update 15: a program page. Visitors and search engines can read it; members can save, track and ask. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, me] = await Promise.all([getGrant(id), getGrantMe()]);
  if (!p) notFound();
  const save = me?.saves.find((s) => s.program_id === p.id) ?? null;
  const kind = p.type === "loan" || p.type === "tax" || p.type === "wage" ? p.type : "grant";
  return (
    <GfWrap>
      <GfProvider signedIn={!!me} saved={(me?.saves ?? []).map((s) => s.program_id)}>
        <div className="gfpage">
          <nav className="crumbs small" aria-label="Breadcrumb"><Link href="/grants">Grant Finder</Link> › {p.name}</nav>
          <GfNote />
          <div className="gfgrid">
            <div className="stack" style={{ gap: 16 }}>
              <section className="card gfhead">
                <div className="gfct"><GfTag p={p} /><span className="gfwho">{PROV_NAMES[p.prov]}</span><GfBadge p={p} /></div>
                <h1>{p.name}</h1>
                <p className="gfby">{p.by_org}</p>
                <dl className="gfdl big"><div><dt>Amount</dt><dd>{p.amount}</dd></div><div><dt>For</dt><dd>{p.use_for}</dd></div><div><dt>Deadline</dt><dd>{p.deadline}</dd></div></dl>
                <ProgramButtons p={p} />
              </section>
              <section className="card"><h2>Who can apply</h2><ul className="gful">{p.who.map((t) => <li key={t}><Ic n="check" s={14} />{t}</li>)}</ul></section>
              <section className="card"><h2>How to apply</h2><ol className="gfol">{p.how.map((t) => <li key={t}>{t}</li>)}</ol></section>
              <AskBox p={p} ai={me?.ai ?? null} />
            </div>
            <aside className="stack" style={{ gap: 16 }}>
              <ReadyCard p={p} save={save} ai={me?.ai ?? null} />
              <div className="card gfside"><h3>Is this a grant or a loan?</h3><p className="small">{KIND[kind]}</p></div>
              <GfTrust />
            </aside>
          </div>
        </div>
      </GfProvider>
    </GfWrap>
  );
}
