import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { GfNav, GfNote, GfTrust, GfWrap, GfTag } from "@/components/grants/bits";
import { FindFunding, GfProvider } from "@/components/grants/client";
import { getGrantMe, getGrants } from "@/lib/grants-server";
import { PROV_NAMES, matchesFor } from "@/lib/grants";
import { pageMeta } from "@/lib/seo";
import "@/styles/tools.css";
import "@/styles/grants.css";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({ title: "Grant Finder: funding for Canadian small businesses", description: "Grants, loans, tax credits and wage subsidies from federal, provincial and territorial programs, in one search. Free for every SME Hub member.", path: "/grants" });

/** Update 15: Find funding. Everyone can search; members also see their matches. */
export default async function Page() {
  const [all, me] = await Promise.all([getGrants(), getGrantMe()]);
  const M = me ? matchesFor(all, me.prov) : [];
  const based = me ? [me.industry, me.team && `${me.team} staff`, me.prov ? PROV_NAMES[me.prov] : "Add your city and province"].filter(Boolean).join(" · ") : "";
  return (
    <GfWrap>
      <GfProvider signedIn={!!me} saved={(me?.saves ?? []).map((s) => s.program_id)}>
        <div className="tlpage gfpage">
          <GfNav on="grants" />
          <FindFunding all={all} prov={me?.prov ?? null}>
            <GfNote />
            {me ? (
              <section className="card gfmatch">
                <div className="gfmh">
                  <div><h2><Ic n="spark" s={18} />Your matches</h2><p className="small muted">Based on your profile: {based} · <Link href="/profilesettings">Edit</Link></p></div>
                  <span className="gfcount">{M.length} programs</span>
                </div>
                <ol className="gfml">
                  {M.map((p, i) => <li key={p.id}><span className="gfn">{i + 1}</span><div><Link href={`/grants/${p.id}`}>{p.name}</Link><small>{p.fit || p.use_for}</small></div><GfTag p={p} /></li>)}
                </ol>
              </section>
            ) : (
              <section className="card gfmatch">
                <div className="gflock" style={{ marginTop: 0 }}><Ic n="spark" s={18} /><div><h3>See the programs that match your business</h3><p>Join SME Hub free to get your matches, save programs, track applications and get reminders before deadlines.</p></div><Link className="btn" href="/auth/sign-up?next=/grants">Join free</Link></div>
              </section>
            )}
          </FindFunding>
          <GfTrust />
        </div>
      </GfProvider>
    </GfWrap>
  );
}
