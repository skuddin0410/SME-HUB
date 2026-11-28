import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/hub";
import { findThread, people, threadReplies } from "@/lib/threads";
import { THREAD_DAYS } from "@/lib/threads-shared";
import { ThreadView } from "@/components/threads/thread-view";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getViewer();
  const found = await findThread(supabase, id).catch(() => null);
  return { title: found ? found.thread.title : "Thread", robots: { index: false } };
}

/** Update 42: a weekly thread (Monday, Wednesday, Friday) or a group's weekly check-in. */
export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, profile, isStaff } = await getViewer();
  const found = await findThread(supabase, decodeURIComponent(id)).catch(() => null);
  if (!found) notFound();
  const { thread: t, group } = found;
  const [replies, who] = await Promise.all([threadReplies(supabase, t.id, userId), people(supabase, [...t.advisors, ...(t.host_id ? [t.host_id] : [])])]);
  const advisors = t.advisors.map((a) => who.get(a)).filter((x): x is NonNullable<typeof x> => !!x);
  const host = t.host_id ? who.get(t.host_id) : null;
  const open = new Date(t.closes_at).getTime() > Date.now();
  const p = profile as { plan?: string; member_type?: string } | null;
  const advisor = p?.plan === "advisor" || p?.member_type === "advisor";
  const canAnswer = !!userId && (isStaff || (t.kind === "wed" && advisor) || (t.kind === "group" && userId === t.host_id));
  const promoted = !!userId && t.kind === "fri" && replies.some((r) => r.author?.id === userId);
  const day = t.kind === "group" ? "Monday" : THREAD_DAYS[t.kind].day;

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="ccpage">
          <Link className="ccback" href={group ? `/groups/${group.slug}` : "/feed"}>← {group ? group.name : "Home"}</Link>
          <article className={`cchead${t.kind === "fri" ? " promo" : ""}`}>
            <p className="cceye"><Ic n="cal2" s={13} />{group ? `Weekly check-in · hosted by ${host?.full_name ?? "the group host"}` : `Weekly thread · every ${day}`}{!open ? " · archived" : ""}</p>
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
            {t.kind === "wed" && advisors.length > 0 && (
              <div className="ccadv">
                <span className="ccfaces">{advisors.slice(0, 4).map((a) => <ZipAv key={a.id} name={a.full_name || "A"} src={a.avatar_url} size="s" />)}</span>
                <span><b>Answering today:</b> {advisors.map((a) => (a.full_name ?? "").split(" ")[0]).join(", ")}</span>
              </div>
            )}
            <ul className="ccrules">{t.rules.map((r) => <li key={r}><Ic n="check" s={13} />{r}</li>)}</ul>
          </article>
          <ThreadView
            threadId={t.id}
            kind={t.kind}
            replies={replies}
            me={userId && profile ? { id: userId, full_name: profile.full_name, avatar_url: profile.avatar_url } : null}
            open={open}
            promoted={promoted}
            canAnswer={canAnswer}
            nextDay={day}
          />
        </div>
      </div>
    </div>
  );
}
