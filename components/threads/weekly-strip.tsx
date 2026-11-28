import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { currentWeekly, people, threadStats } from "@/lib/threads";
import { THREAD_DAYS, torontoDow, type ThreadKey } from "@/lib/threads-shared";
import { ZipAv } from "@/components/zip/bits";

/** Update 42: "This week on SME Hub" under Start a post: Monday, Wednesday and Friday threads; today's is marked. */
export async function WeeklyStrip() {
  const { supabase } = await getViewer();
  const wk = await currentWeekly(supabase);
  if (!wk) return null;
  const keys = (["mon", "wed", "fri"] as ThreadKey[]).filter((k) => wk[k]);
  if (!keys.length) return null;
  const [stats, adv] = await Promise.all([
    threadStats(supabase, keys.map((k) => wk[k]!.id)),
    people(supabase, wk.wed?.advisors ?? []),
  ]);
  const dow = torontoDow();
  const today = (k: ThreadKey) => THREAD_DAYS[k].dow === dow && Date.now() - new Date(wk[k]!.opens_at).getTime() < 86_400_000;
  return (
    <section className="ccstrip" aria-label="This week on SME Hub">
      <div className="ccsh"><h2>This week on SME Hub</h2><span>New threads every Monday, Wednesday and Friday</span></div>
      <div className="ccwk">
        {keys.map((k) => {
          const t = wk[k]!;
          const st = stats.get(t.id) ?? { n: 0, faces: [] };
          const faces = k === "wed" && t.advisors.length ? t.advisors.map((a) => adv.get(a)).filter((x): x is NonNullable<typeof x> => !!x) : st.faces;
          const live = today(k);
          return (
            <Link key={k} className={`ccw${live ? " ccnow" : ""}`} href={`/thread/${k}`}>
              <span className="ccday">{live ? <><span className="ccdot" />Today</> : THREAD_DAYS[k].day}</span>
              <b>{t.title}</b>
              <span className="ccsub">{t.sub.split(". ")[0].replace(/\.$/, "")}.</span>
              <span className="ccmeta">
                {faces.length > 0 && <span className="ccfaces">{faces.slice(0, 4).map((f) => <ZipAv key={f.id} name={f.full_name || "M"} src={f.avatar_url} size="s" />)}</span>}
                <span>{st.n} {st.n === 1 ? "reply" : "replies"}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
