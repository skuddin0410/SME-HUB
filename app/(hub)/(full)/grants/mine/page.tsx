import { GfNav, GfWrap } from "@/components/grants/bits";
import { GfCard, GfProvider, Tracker } from "@/components/grants/client";
import { getGrantMe, getGrants } from "@/lib/grants-server";
import { requireUser } from "@/lib/hub";
import Link from "next/link";
import "@/styles/tools.css";
import "@/styles/grants.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "My funding", robots: { index: false } };

/** Update 15: My funding. The member's saved programs and the tracker (free for every member, final plan). */
export default async function Page() {
  await requireUser();
  const [all, me] = await Promise.all([getGrants(), getGrantMe()]);
  const saves = me?.saves ?? [];
  const S = saves.map((s) => all.find((p) => p.id === s.program_id)).filter((p) => !!p);
  return (
    <GfWrap>
      <GfProvider signedIn saved={saves.map((s) => s.program_id)}>
        <div className="tlpage gfpage">
          <GfNav on="mine" />
          <section className="gfrh"><h1 style={{ font: "600 28px var(--display)", margin: 0 }}>My funding</h1><p className="small muted">Track every application from saved to approved.</p></section>
          {S.length ? (
            <>
              <Tracker all={all} saves={saves} />
              <h2 style={{ font: "600 18px var(--display)", margin: "8px 0 0" }}>Saved programs</h2>
              <ul className="gflist">{S.map((p) => <GfCard key={p!.id} p={p!} />)}</ul>
            </>
          ) : (
            <div className="card"><h2>Nothing saved yet</h2><p className="muted">Save programs from the Grant Finder to track them here, from saved to approved.</p><Link className="btn" href="/grants" style={{ alignSelf: "flex-start" }}>Find funding</Link></div>
          )}
        </div>
      </GfProvider>
    </GfWrap>
  );
}
