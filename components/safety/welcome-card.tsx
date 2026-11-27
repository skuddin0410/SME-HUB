import { getViewer } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import type { WelcomeWeek } from "@/app/(hub)/safety-actions";
import { WhyButton } from "./why-button";

/** Update 41: the Welcome week card at the top of the right column, with the days left and the two steps that shorten it. */
export async function WelcomeWeekCard() {
  const { supabase, userId } = await getViewer();
  if (!userId) return null;
  const { data } = await supabase.rpc("my_welcome_week");
  const w = data as WelcomeWeek;
  if (!w || w.limited || w.left <= 0) return null;
  const both = w.photo && w.conn;
  const target = both ? w.fast : w.days;
  const d = w.left;
  return (
    <div className="card sfwel">
      <div className="sfwh">
        <span className="sfwi"><Ic n="spark" s={16} /></span>
        <div><b>Welcome week</b><small>{d <= 1 ? "Everything unlocks tomorrow" : `${d} days until everything unlocks`}</small></div>
      </div>
      <span className="sfwbar"><i style={{ width: `${Math.min(100, Math.round((w.day / target) * 100))}%` }} /></span>
      <p>To keep SME Hub free of spam, new members can’t share links, start groups or post offers in their first week.</p>
      <ul>
        <li className={w.photo ? "ok" : ""}>{w.photo ? <Ic n="check" s={12} /> : <i />}Add a profile photo</li>
        <li className={w.conn ? "ok" : ""}>{w.conn ? <Ic n="check" s={12} /> : <i />}Make one connection</li>
      </ul>
      <p className="sfmut sm">{both ? `You’ve done both, so it ends after ${w.fast} days instead of ${w.days}.` : `Do both and it ends after ${w.fast} days instead of ${w.days}.`}</p>
      <WhyButton />
    </div>
  );
}
