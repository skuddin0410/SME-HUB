import { Suspense } from "react";
import { WelcomeWeekCard } from "@/components/safety/welcome-card";
import { TrendingTags } from "@/components/zip/hashtags";
import Link from "next/link";
import { FundingCard } from "@/components/grants/funding-card";
import { getViewer } from "@/lib/hub";
import { BLOG } from "@/lib/content";
import { getMyReady } from "@/lib/ready";
import { ReadyStrength } from "@/components/ready/card";
import { Ic } from "@/components/zip/ic";
import { Scene } from "@/components/zip/scene";
import { ZipAv } from "@/components/zip/bits";
import { JoinGroupButton } from "@/components/feed-client";
import { RsvpBtn } from "@/components/zip/rsvp-btn";
import { MemberOfTheDay } from "@/components/zip/motd";
import { DeadlineCard } from "@/components/tools/deadline-card";
import { GoodMorning } from "@/components/matches/good-morning";
import { leadsWaiting } from "@/lib/leads";
import { evWhen } from "@/lib/events";
import "@/styles/leads.css";

/** Pages that are built in a later phase: not prefetched, so the browser is not left waiting on them. */
const LATER: string[] = [];
const ART_SCENES = ["laptop", "nodes", "solar", "bars", "law", "ship"];

/** Left rail: the member's shortcuts, Member of the Day (Update 11), then the newest articles. */
export async function ZipLeftRail() {
  const { supabase, userId } = await getViewer();
  if (!userId) return <><MemberOfTheDay /><ZipArticles /></>;
  const [inbox, saved, waiting, owned, anyLead] = await Promise.all([
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null),
    supabase.from("saved_posts").select("post_id", { count: "exact", head: true }).eq("user_id", userId),
    leadsWaiting(supabase),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    supabase.from("leads").select("id", { count: "exact", head: true }),
  ]);
  // Update 30: the "My leads" shortcut, for members with a business or with leads (hidden until the leads table exists)
  const showLeads = waiting !== null && ((owned.count ?? 0) > 0 || (anyLead.count ?? 0) > 0);
  const unread = inbox.count ?? 0;
  const rows: [string, string, string, React.ReactNode][] = [
    ["/messages", "msg", "Messages", unread > 0 ? unread : <Ic n="right" s={16} />],
    ["/matches", "spark", "AI matchmaking", <Ic key="r" n="right" s={16} />],
    ["/groups", "users", "Groups", <Ic key="r" n="right" s={16} />],
    ["/write", "edit", "Write a blog post", <Ic key="r" n="right" s={16} />],
    ["/businesses/mine", "store", "My Businesses", <Ic key="r" n="right" s={16} />],
    ["/grants", "coin", "Grant Finder", <Ic key="r" n="right" s={16} />],
    ["/deadlines", "cal2", "My deadlines", <Ic key="r" n="right" s={16} />],
    ["/tools", "calc", "Business tools", <Ic key="r" n="right" s={16} />],
    ["/feed?saved=1", "bookmark", "Saved bookmarks", saved.count ?? 0],
  ];
  return (
    <>
      <div className="card mcard">
        {rows.map(([href, ic, label, end]) => (
          <Link key={href} className="mrow" href={href} prefetch={LATER.includes(href) ? false : undefined}>
            <Ic n={ic} s={18} />
            {label}
            <span className="end">{end}</span>
          </Link>
        ))}
      </div>
      <MemberOfTheDay />
      <ZipArticles />
      {showLeads && (
        <Link className="card ldcard" href="/leads">
          <span className="ldci"><Ic n="msg" s={18} /></span>
          <span><b>My leads</b><small>{waiting ? `${waiting} waiting for your reply` : "All caught up"}</small></span>
          {waiting ? <em aria-label={`${waiting} waiting`}>{waiting}</em> : null}
        </Link>
      )}
    </>
  );
}

function ZipArticles() {
  return (
    <div className="card">
      <div className="row">
        <h2 className="grow eyebrow" style={{ color: "var(--muted)", fontSize: 12 }}>Recent articles</h2>
        <span className="tag ca">CA Editorial</span>
      </div>
      <div>
        {BLOG.slice(0, 6).map((a, n) => (
          <Link key={a.slug} className="art" href={`/blog/${a.slug}`}>
            <span className="th" aria-hidden="true"><Scene n={ART_SCENES[n % ART_SCENES.length]} h={600} /></span>
            <span>
              <b>{a.title}</b>
              <span>CanadianSME Magazine</span>
            </span>
          </Link>
        ))}
      </div>
      <Link className="seeall" href="/blog">See all articles<Ic n="right" s={16} /></Link>
    </div>
  );
}

/** Right rail: the member's card, Ask the Hub, the pavilion, this week's session and groups to explore. */
export async function ZipRightRail() {
  const { supabase, userId, profile } = await getViewer();
  if (!userId || !profile) return <ZipJoinCard />;
  const [connections, ev, groups, mine, rsv, quest, ready] = await Promise.all([
    supabase.rpc("connection_count", { member: userId }),
    supabase.from("hub_events").select("*").eq("status", "published").order("position").limit(2),
    supabase.from("groups").select("id, slug, name, is_private, group_members(count)").eq("status", "active").order("created_at", { ascending: false }).limit(4),
    supabase.from("group_members").select("group_id").eq("user_id", userId),
    supabase.from("event_rsvps").select("event_id").eq("user_id", userId),
    supabase.from("posts").select("id, body, kind, author:profiles!posts_author_id_fkey(full_name)").eq("kind", "question").order("created_at", { ascending: false }).limit(12),
    getMyReady(),
  ]);
  const nConn = (connections.data as number | null) ?? 0;
  const event = (ev.data ?? [])[1] ?? (ev.data ?? [])[0];
  const rsvped = ((rsv.data ?? []) as { event_id: string }[]).some((r) => r.event_id === event?.id);
  const joined = new Set(((mine.data ?? []) as { group_id: string }[]).map((m) => m.group_id));
  const gs = (groups.data ?? []) as unknown as { id: string; slug: string; name: string; is_private: boolean; group_members: { count: number }[] }[];
  const questions = ((quest.data ?? []) as unknown as { id: string; body: string; author: { full_name: string | null } | null }[]).slice(0, 3);
  return (
    <>
      <Suspense fallback={null}><WelcomeWeekCard /></Suspense>
      <Suspense fallback={null}><DeadlineCard where="top" /></Suspense>
      <div className="card pcard">
        <div className="pban" />
        <div className="pbody">
          <div className="ptop">
            <div className="pfwrap">
              <ZipAv name={profile.full_name ?? "Member"} src={profile.avatar_url} size="pf" />
              <span className="on" role="img" aria-label="Online" />
            </div>
            <Link className="btn sm ghost" style={{ marginTop: 10, background: "var(--surface-2)", borderColor: "transparent" }} href="/profile/edit">Edit</Link>
          </div>
          <div className="stack">
            <Link className="namebtn pname" href={`/members/${userId}`}>{profile.full_name}</Link>
            {profile.headline ? <span className="muted small">{profile.headline}</span> : <Link className="linkbtn" href="/profile/edit">+ Add a headline</Link>}
          </div>
          {ready && <ReadyStrength items={ready.items} />}
          <Link className="linkbtn pbcta" href="/profile/edit"><Ic n="spark" s={14} />Build my profile with AI</Link>
          <div className="pstats">
            <div>
              <span className="muted small">Connections</span>
              <span className="r"><span className="n" style={{ color: "var(--link)" }}>{nConn}</span><Link className="small" href="/members" style={{ color: "#A1A1AA", textDecoration: "none" }}>Grow</Link></span>
            </div>
            <div>
              <span className="muted small">Potential customers</span>
              <span className="r" style={{ paddingRight: 0 }}><span className="n">–</span><Link className="small" href="/profile/edit" style={{ color: "#A1A1AA", textDecoration: "none" }}>Set up</Link></span>
            </div>
          </div>
          <Link className="pvrow" href="/profile/views"><Ic n="eye" s={15} /><span className="grow">Who viewed my profile</span><Ic n="right" s={14} /></Link>
        </div>
      </div>

      <div className="card">
        <div className="row"><h2 className="grow">Ask the Hub</h2><span className="tag ai">AI</span></div>
        <p className="muted small">Get an answer from members, advisors and CanadianSME articles.</p>
        <Link className="btn" href="/ask" prefetch={false} style={{ alignSelf: "flex-start" }}><Ic n="spark" s={14} />Ask a question</Link>
      </div>
      <Suspense fallback={null}><GoodMorning /></Suspense>

      <div className="card" style={{ borderColor: "#FECACA" }}>
        <div className="row"><h2 className="grow">Made in Canada Pavilion</h2><span className="claim">New</span></div>
        <p className="muted small">Canadian manufacturers, owner-run services and AI tools built here.</p>
        <Link className="btn sm" href="/pavilion" prefetch={false} style={{ alignSelf: "flex-start" }}>Visit the pavilion</Link>
      </div>

      <div className="card">
        <h2>Can you help?</h2>
        {questions.length ? (
          <>
            <div className="list">
              {questions.map((q) => (
                <div key={q.id} className="stack">
                  <span className="small">{q.body.slice(0, 84)}…</span>
                  <span className="muted small">{q.author?.full_name ?? "A member"}</span>
                </div>
              ))}
            </div>
            <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href="/feed?kind=question">See questions</Link>
          </>
        ) : (
          <p className="muted small">Every question has an answer right now.</p>
        )}
      </div>

      <Suspense fallback={null}><TrendingTags /></Suspense>

      {event && (
        <div className="card">
          <p className="eyebrow">This week’s live session</p>
          <h2 style={{ fontSize: 15, lineHeight: 1.3 }}>{event.title}</h2>
          <p className="muted small">{event.when_label || evWhen(event as unknown as { starts_at: string | null; ends_at: string | null; tz: string })}</p>
          <RsvpBtn eventId={event.id} saved={rsvped} signedIn />
        </div>
      )}

      {gs.length > 0 && (
        <div className="card">
          <h2>Groups to explore</h2>
          <div className="list">
            {gs.map((g) => (
              <div key={g.id} className="row">
                <Link className="namebtn grow" data-act="openGroup" href={`/groups/${g.slug}`}>{g.name}</Link>
                {g.is_private ? <Link className="btn sm" href={`/groups/${g.slug}`}>View</Link> : <JoinGroupButton groupId={g.id} initial={joined.has(g.id)} signedIn />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>How the week runs</h2>
        <div className="list">
          <div className="stack"><strong>Monday</strong><span className="muted small">Question of the week</span></div>
          <div className="stack"><strong>Wednesday</strong><span className="muted small">Live session with an expert</span></div>
          <div className="stack"><strong>Friday</strong><span className="muted small">Member wins (Member of the Day every day)</span></div>
        </div>
      </div>
      <Suspense fallback={null}><DeadlineCard where="bottom" /></Suspense>
      <Suspense fallback={null}><FundingCard /></Suspense>
    </>
  );
}

function ZipJoinCard() {
  return (
    <div className="card pcard">
      <div className="pban" />
      <div className="pbody" style={{ paddingTop: 14 }}>
        <div className="pname">Where Canadian business owners meet.</div>
        <p className="muted small">Ask questions, share what is working and find the people who can help you grow.</p>
        <Link className="btn" href="/auth/sign-up">Join free</Link>
        <Link className="linkbtn" style={{ alignSelf: "center", color: "var(--link)" }} href="/auth/login">I already have an account</Link>
      </div>
    </div>
  );
}
