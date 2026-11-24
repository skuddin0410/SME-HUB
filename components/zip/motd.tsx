import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { Cover } from "@/components/hub-client";
import { MotdConnect } from "@/components/zip/motd-connect";
import { getMemberOfTheDay } from "@/lib/motd";
import { getViewer } from "@/lib/hub";

/**
 * Member of the Day (Update 11), in the left panel under the menu and above Recent articles.
 * Everything in this card is left-aligned, as SK asked for this card only.
 */
export async function MemberOfTheDay() {
  const [today, { userId }] = await Promise.all([getMemberOfTheDay(), getViewer()]);
  if (!today) return null;
  const { m, link, me } = today;
  const date = new Date(`${m.day}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  return (
    <section className="card motd" aria-labelledby="motdh">
      <div className="motd-cov">
        <Cover seed={m.id} className="h-full w-full" />
        <span className="motd-badge"><Ic n="spark" s={13} />Member of the Day</span>
      </div>
      <div className="motd-b">
        <div className="motd-av"><ZipAv name={m.full_name || "Member"} src={m.avatar_url} size="l" /></div>
        <h2 id="motdh" className="motd-n"><Link className="namebtn" href={`/members/${m.id}`}>{m.full_name}</Link></h2>
        {m.headline && <span className="small muted">{m.headline}</span>}
        {m.location && <span className="small muted motd-city"><Ic n="pin" s={12} />{m.location}</span>}
        {m.about && <p className="motd-q">“{m.about}”</p>}
        <div className="motd-acts">
          <Link className="btn sm" href={`/members/${m.id}`}>View profile</Link>
          {!me && <MotdConnect id={m.id} initial={link} signedIn={!!userId} />}
        </div>
        <p className="small muted motd-foot">{date} · <Link href="/spotlight">Want to be featured?</Link></p>
      </div>
    </section>
  );
}
