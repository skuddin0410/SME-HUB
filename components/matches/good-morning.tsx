import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";

/** "Good morning, Alex: 3 people are worth meeting today" (handoff: introCard), from the member's matchmaking answers. */
export async function GoodMorning() {
  const { supabase, userId, profile } = await getViewer();
  if (!userId || !profile) return null;
  const first = (profile.full_name ?? "").split(" ")[0] || "there";
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/Toronto", hour: "numeric", hour12: false }));
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const { data: prefs } = await supabase.from("match_prefs").select("user_id").eq("user_id", userId).maybeSingle();
  const { data } = prefs ? await supabase.rpc("match_candidates").order("score", { ascending: false }).limit(3) : { data: [] };
  const picks = (data ?? []) as { member_id: string; full_name: string; avatar_url: string | null; why: string[] }[];
  return (
    <div className="card">
      <div className="row"><h2 className="grow">{hello}, {first}</h2><span className="tag ai">AI</span></div>
      {picks.length ? (
        <>
          <p className="small">{picks.length} {picks.length === 1 ? "person is" : "people are"} worth meeting today.</p>
          <div className="list">
            {picks.map((m) => (
              <div key={m.member_id} className="stack" style={{ gap: 6 }}>
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <ZipAv name={m.full_name} src={m.avatar_url} size="s" />
                  <div className="stack grow" style={{ gap: 2 }}>
                    <Link className="namebtn" href={`/members/${m.member_id}`}>{m.full_name}</Link>
                    <span className="muted small"><strong>Why:</strong> {m.why.slice(0, 2).join(". ")}.</span>
                  </div>
                </div>
                <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href={`/messages?with=${m.member_id}&text=${encodeURIComponent(`Hi ${m.full_name.split(" ")[0]}, the Hub suggested we meet. ${m.why[0] ?? ""}. Do you have 20 minutes this week?`)}`}><Ic n="edit" s={13} />Draft a message</Link>
              </div>
            ))}
          </div>
          <Link className="btn sm" href="/matches" style={{ alignSelf: "flex-start" }}><Ic n="spark" s={14} />Open AI matchmaking</Link>
        </>
      ) : (
        <>
          <p className="muted small">Tell the Hub what you need and when you are free, and it picks people worth meeting every morning. Free on every plan.</p>
          <Link className="btn sm line" href="/matches" style={{ alignSelf: "flex-start" }}>Say who you want to meet</Link>
          <Link className="btn sm" href="/matches" style={{ alignSelf: "flex-start" }}><Ic n="spark" s={14} />Open AI matchmaking</Link>
        </>
      )}
    </div>
  );
}
