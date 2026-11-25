/* eslint-disable @next/next/no-img-element */
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AUTHOR_FIELDS, DEGREE_LABEL, fetchPosts, getDegrees, getLinks, getViewer, MEMBER_TYPES, PAGE_SIZE, type Author, type Profile } from "@/lib/hub";
import { absolute, jsonLd, pageMeta } from "@/lib/seo";
import { DEMO_IMAGES, demoAvatar } from "@/lib/demo";
import { Empty, Pager, PostCard } from "@/components/hub";
import { Cover } from "@/components/hub-client";
import { blockMember } from "@/app/(hub)/actions";
import { MyTagsCard } from "@/components/zip/hashtags";
import { IntroButton, RecActions, RecommendForm, RequestRecButton, type Candidate } from "@/components/profile-extras";
import { PROFILE_TYPES, RELATIONSHIPS } from "@/lib/profile-extra";
import { ConnectBtn, FollowBtn, MoreMenu } from "@/components/zip/member-actions";
import { Ic } from "@/components/zip/ic";
import { ProfileDetails, type DetailCell } from "@/components/zip/profile-details";
import type { Field } from "@/lib/zip/settings";
import { ZipAv } from "@/components/zip/bits";
import { TYPES } from "@/lib/zip/types";
import { getHubSettings } from "@/lib/zip/settings-load";
import { readMinutes, STATUS_LABEL, when as blogDate, type MemberBlog } from "@/lib/zip/member-blogs";
import { displayName, profileActions } from "@/lib/zip/profile-rules";
import { getMyReady, getSignals } from "@/lib/ready";
import { missLine } from "@/lib/ready-shared";
import { ReadyAv, } from "@/components/ready/provider";
import { ReadyCard, SpotlightBanner } from "@/components/ready/card";
import { AiProfileButton } from "@/components/ready/ai-button";
import { Suspense } from "react";
import { ProfileStoriesSection } from "@/components/stories/sections";
import { AdvisorSections } from "@/components/advisors/sections";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

type Details = { helps_with: string[]; needs: string[]; availability: string[]; social_links: Record<string, string>; custom_fields?: Record<string, string> };
type Rec = { id: string; author_id: string; relationship: keyof typeof RELATIONSHIPS; body: string; hidden: boolean; created_at: string; author: { id: string; full_name: string; headline: string } | null };

type Listing = { slug: string; name: string; category: string; logo_url: string | null };

const valid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

// one read shared by the page and its search-engine tags
const getMember = cache(async (id: string) => {
  const { supabase } = await getViewer();
  const { data } = await supabase.from("profiles").select("id, full_name, headline, bio, location, website, avatar_url, member_type, profile_type, role, status, created_at, founding_number, plan").eq("id", id).maybeSingle();
  return data as (Profile & { profile_type: keyof typeof PROFILE_TYPES; founding_number: number | null; plan?: string | null }) | null;
});

const photo = (m: Profile) => m.avatar_url ?? (DEMO_IMAGES ? demoAvatar(m.id) : null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = valid(id) ? await getMember(id) : null;
  if (!member) return { title: "Member not found" };
  const name = member.full_name || "Member";
  return pageMeta({
    title: member.headline ? `${name} - ${member.headline}` : name,
    description: member.bio || [member.headline, member.location, `${name} is on SME Hub, Canada's small business network.`].filter(Boolean).join(". "),
    path: `/members/${id}`,
    image: photo(member),
    type: "profile",
    index: member.status === "active",
  });
}

const TABS = [["about", "About"], ["posts", "Posts"], ["connections", "Connections"], ["groups", "Groups"], ["blog", "Blog"]] as const;
type Conn = { id: string; full_name: string; headline: string; location: string; avatar_url: string | null; profile_type: string };
type Grp = { id: string; slug: string; name: string; description: string; members: number };

const when = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString("en-CA", opts);
function activeLabel(at: string | null) {
  if (!at) return null;
  const days = (Date.now() - new Date(at).getTime()) / 86_400_000;
  return { label: days < 1 ? "Active today" : days < 7 ? "Active this week" : days < 31 ? "Active this month" : "Active earlier", today: days < 1 };
}

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; tab?: string; range?: string }>;
}) {
  const { id } = await params;
  if (!valid(id)) notFound();
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  // the team chooses which tabs show, their order and the one that opens first
  const ps = await getHubSettings("profiles");
  const visibleTabs = (ps.tabs as [string, string, boolean][])
    .filter(([, , on]) => on)
    .map(([k, label]) => [k === "conn" ? "connections" : k, label] as (typeof TABS)[number] | [string, string])
    .filter(([k]) => TABS.some(([t]) => t === k)) as unknown as (typeof TABS)[number][];
  const tabList = visibleTabs.length ? visibleTabs : TABS;
  const defKey = String(ps.defTab) === "conn" ? "connections" : String(ps.defTab);
  const firstTab = (tabList.some(([k]) => k === defKey) ? defKey : tabList[0][0]) as (typeof TABS)[number][0];
  const tab0 = tabList.some(([k]) => k === sp.tab) ? (sp.tab as (typeof TABS)[number][0]) : firstTab;
  const viewer = await getViewer();
  const { supabase, userId } = viewer;

  const member = await getMember(id);
  if (!member) notFound();
  const isMe = id === userId;
  // Update 15 (profile as in the zip): "Profile views" is a tab of the member's own profile when the feature is on
  const pvOn = isMe && !!ps.pv.on;
  const tab: (typeof TABS)[number][0] | "views" = pvOn && sp.tab === "views" ? "views" : tab0;

  // Speed: every read below (and recording the visit) happens at the same time
  const [links, posts, listingRows, countRow, otherRows, mutualRow, detailRows, followerRow, followRow, recRows, askedRows, myRecRows, activeRow, sectionRow, candRow] = await Promise.all([
    getLinks(),
    tab === "posts" ? fetchPosts(supabase, userId, { authorId: id, page }) : Promise.resolve([]),
    supabase.from("companies").select("slug, name, category, logo_url").eq("owner_id", id).order("created_at").limit(4),
    supabase.rpc("connection_count", { member: id }),
    supabase.from("profiles").select(AUTHOR_FIELDS).neq("id", id).order("created_at", { ascending: false }).limit(8),
    userId && !isMe ? supabase.rpc("mutual_connections", { other: id }) : null,
    supabase.rpc("get_profile_details", { p_ids: [id] }),
    supabase.rpc("follower_count", { member: id }),
    userId && !isMe ? supabase.from("follows").select("followee_id").eq("follower_id", userId).eq("followee_id", id).maybeSingle() : null,
    supabase.from("recommendations").select("id, author_id, relationship, body, hidden, created_at, author:profiles!recommendations_author_id_fkey(id, full_name, headline)").eq("subject_id", id).order("created_at", { ascending: false }).limit(20),
    isMe && userId ? supabase.from("recommendation_requests").select("requester_id, requester:profiles!recommendation_requests_requester_id_fkey(full_name)").eq("asked_id", userId) : null,
    userId && !isMe ? supabase.from("recommendation_requests").select("requester_id").eq("requester_id", userId).eq("asked_id", id).maybeSingle() : null,
    supabase.rpc("profile_last_active", { p_id: id }),
    // the Details section: every profile field the team set up, with what this viewer may see (the database decides)
    tab === "about" ? supabase.rpc("profile_details_section", { p_member: id }) : null,
    userId && !isMe ? supabase.rpc("intro_candidates", { p_target: id }) : null,
    // visiting someone else's profile counts as a view (the database skips private browsers and blocked pairs)
    userId && !isMe && ps.pv.on ? supabase.rpc("record_profile_view", { p_id: id }) : null,
  ]);
  const cells = (sectionRow?.data ?? null) as Record<string, DetailCell> | null;
  const details = ((detailRows.data ?? [])[0] ?? null) as (Details & { user_id: string }) | null;
  const followers = typeof followerRow.data === "number" ? followerRow.data : null;
  const following = !!followRow?.data;
  const recs = ((recRows.data ?? []) as unknown as Rec[]).filter((r) => !r.hidden || isMe || r.author_id === userId);
  const shown = recs.filter((r) => !r.hidden);
  const alreadyAsked = !!myRecRows?.data;
  const requests = ((askedRows?.data ?? []) as unknown as { requester_id: string; requester: { full_name: string } | null }[]);
  const myRec = recs.find((r) => r.author_id === userId);
  const candidates: Candidate[] =
    ((candRow?.data ?? []) as Candidate[]);
  const link = links.get(id) ?? "none";
  const listings = (listingRows.data ?? []) as Listing[];
  const connections = typeof countRow.data === "number" ? countRow.data : null;
  const others = ((otherRows.data ?? []) as Author[]).filter((p) => p.id !== userId).slice(0, 5);
  const degrees = await getDegrees(supabase, userId, [id, ...others.map((p) => p.id)]);
  const degree = degrees.get(id);
  const mutual = typeof mutualRow?.data === "number" ? mutualRow.data : 0;
  const site = member.website && (member.website.startsWith("http") ? member.website : `https://${member.website}`);
  const first = member.full_name.split(" ")[0] || "this member";
  // SMB Advisors get "Book a free call" in the header (handoff: profile header)
  const isAdvisor = !isMe && !!(await supabase.from("advisor_profiles").select("user_id").eq("user_id", id).eq("active", true).maybeSingle()).data;
  const active = activeLabel((activeRow.data as string | null) ?? null);
  const type = TYPES[member.profile_type] ?? TYPES.owner;
  const planLabel = member.member_type === "owner" ? null : MEMBER_TYPES[member.member_type];

  // tab content that needs more reads
  let connList: Conn[] = [];
  if (tab === "connections" && userId) {
    if (isMe) {
      const rows = (await supabase.from("connections").select("requester_id, addressee_id").eq("status", "accepted")).data ?? [];
      const ids = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id) as string);
      connList = ids.length ? (((await supabase.from("profiles").select("id, full_name, headline, location, avatar_url, profile_type").in("id", ids).order("full_name")).data ?? []) as Conn[]) : [];
    } else {
      connList = ((await supabase.rpc("mutual_connection_list", { other: id })).data ?? []) as Conn[];
    }
  }
  const blogPosts = tab === "blog" ? (((await supabase.from("member_blogs").select("id, title, cat, image_url, blocks, status, published_at, created_at").eq("author_id", id).order("created_at", { ascending: false }).limit(30)).data ?? []) as unknown as Pick<MemberBlog, "id" | "title" | "cat" | "image_url" | "blocks" | "status" | "published_at" | "created_at">[]).filter((b) => b.status === "published" || isMe) : [];
  const groupList = tab === "groups" ? (((await supabase.rpc("profile_groups", { p_member: id })).data ?? []) as Grp[]) : [];
  const connLinks = connList.length ? links : links;
  const mine = isMe ? await getMyReady() : null;
  const applied = mine && mine.count === 5 && userId ? ((await supabase.from("spotlight_applications").select("id", { count: "exact", head: true }).eq("member_id", userId).in("status", ["received", "chosen"])).count ?? 0) > 0 : false;
  const miss = mine && mine.count < 5 ? missLine(mine.items, await getSignals(), { city: mine.city }) : null;
  // own profile views: the strip under the name and the "Profile views" tab
  const [pvRows, pvDays] = pvOn ? await Promise.all([supabase.rpc("my_profile_viewers"), supabase.rpc("my_profile_view_days")]) : [null, null];
  const pvList = ((pvRows?.data ?? []) as { viewer_id: string | null; last_at: string; shown: boolean }[]);
  const pvSeries = ((pvDays?.data ?? []) as { day: string; views: number }[]);
  const pvRange = ["today", "7", "30"].includes(String(sp.range)) ? String(sp.range) : "30";
  const pvDaysN = pvRange === "today" ? 1 : Number(pvRange);
  const pvTotal = pvSeries.slice(-pvDaysN).reduce((n, d) => n + d.views, 0);
  const pvIds = pvList.filter((v) => v.viewer_id).map((v) => v.viewer_id as string);
  const pvPeople = pvIds.length ? (((await supabase.from("profiles").select("id, full_name, headline, location, avatar_url, member_type, profile_type").in("id", pvIds)).data ?? []) as (Author & { location: string; profile_type: string })[]) : [];
  const pvBy = new Map(pvPeople.map((x) => [x.id, x]));
  const pvShown = pvList.filter((v) => v.viewer_id && pvBy.has(v.viewer_id) && Date.now() - new Date(v.last_at).getTime() < pvDaysN * 86_400_000);
  const pvHidden = pvList.filter((v) => !v.shown || !v.viewer_id).length;
  const plan = member.plan === "plus" ? "SMB Plus" : member.plan === "advisor" ? "SME Advisor" : "Free member";

  return (
    <div className="zip">
      {member.status === "active" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@type": "ProfilePage",
            dateCreated: member.created_at,
            mainEntity: {
              "@type": "Person",
              name: member.full_name,
              description: member.bio || member.headline || undefined,
              jobTitle: member.headline || undefined,
              image: photo(member) ?? undefined,
              url: absolute(`/members/${id}`),
              homeLocation: member.location ? { "@type": "Place", name: member.location } : undefined,
              sameAs: site ? [site] : undefined,
              worksFor: listings.length ? listings.map((c) => ({ "@type": "Organization", name: c.name, url: absolute(`/businesses/${c.slug}`) })) : undefined,
            },
          })}
        />
      )}
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="cols">
          <section className="mid" style={{ gap: 20 }} aria-label="Profile">
            {mine && miss && <ReadyCard where="profile" miss={miss} />}
            {mine && !miss && !applied && <SpotlightBanner />}
            <div className="card phero" data-head={String(ps.header)}>
              <div className="pcover"><Cover seed={member.id} className="h-full w-full" /></div>
              <div className="pinfo">
                <div className="pavrow">
                  <span className="avwrap">
                    {isMe && !member.avatar_url ? <ReadyAv me={{ name: member.full_name || "M", avatar: null }} size="hero" /> : <ZipAv name={member.full_name || "M"} src={photo(member)} size="hero" />}
                    {ps.head.online && active?.today && <i className="ondot" title="Active today" />}
                  </span>
                </div>
                <div className="pmain">
                  <div className="row prow" style={{ flexWrap: "wrap", gap: 8 }}>
                    <h1>{displayName(member.full_name, String(ps.dname))}</h1>
                    {degree && <span className="deg">· {DEGREE_LABEL[degree]}</span>}
                    {ps.head.type && <span className="tag ptype" style={{ background: type[1], color: type[2] }}>{type[0]}</span>}
                    {planLabel && planLabel !== type[0] ? <span className="tag">{planLabel}</span> : plan !== type[0] && <span className="tag">{plan}</span>}
                    {member.founding_number != null && <span className="tag badge">Founding Member</span>}
                    {member.status === "suspended" && <span className="tag" style={{ background: "#B91C1C", color: "#fff" }}>Suspended</span>}
                  </div>
                  {member.headline && <span style={{ fontSize: 15 }}>{member.headline}</span>}
                  <span className="muted">
                    {member.location}{member.location && " · "}
                    <details className="menuwrap" style={{ display: "inline-block" }}>
                      <summary style={{ cursor: "pointer", listStyle: "none", display: "inline", color: "var(--link)", fontWeight: 600 }}>Contact info</summary>
                      <div className="menu" style={{ padding: 14, minWidth: 260 }}>
                        <span className="small"><strong>Profile</strong><br /><Link href={`/members/${id}`} style={{ color: "var(--link)" }}>/members/{id.slice(0, 8)}</Link></span>
                        {site && <span className="small"><strong>Website</strong><br /><a href={site} target="_blank" rel="noreferrer nofollow" style={{ color: "var(--link)" }}>{member.website.replace(/^https?:\/\//, "")}</a></span>}
                        <span className="small"><strong>Joined</strong><br />{when(member.created_at, { year: "numeric", month: "long" })}</span>
                      </div>
                    </details>
                  </span>
                  {shown.length > 0 && <span className="recby"><Ic n="spark" s={13} />Recommended by {shown.length}</span>}
                  <span className="muted small">
                    {[ps.head.joined ? `Joined ${when(member.created_at, { year: "numeric", month: "short" })}` : null, ps.head.followers && followers !== null && followers > 0 ? `${followers} follower${followers === 1 ? "" : "s"}` : null, ps.head.last ? active?.label : null].filter(Boolean).join(" · ")}
                  </span>
                  {pvOn && ps.pv.strip !== false && (
                    <Link href={`/members/${id}?tab=views`} className="pvstrip">
                      <span className="sysav">{pvShown.slice(0, 5).map((v) => { const m = pvBy.get(v.viewer_id!)!; return <span key={m.id}><ZipAv name={m.full_name || "M"} src={m.avatar_url} size="s" /></span>; })}</span>
                      <span><strong>{pvSeries.reduce((n, d) => n + d.views, 0)} profile views</strong> in the last 30 days</span>
                      <span className="small" style={{ color: "var(--accent)", fontWeight: 600 }}>See who</span>
                    </Link>
                  )}
                  {connections !== null && <span className="muted">{connections >= 500 ? "500+" : connections} connection{connections === 1 ? "" : "s"}{mutual > 0 ? ` · ${mutual} mutual` : ""}</span>}
                  <div className="row prow" style={{ flexWrap: "wrap", marginTop: 8 }}>
                    {isMe ? (
                      <>
                        <Link href="/profile/edit" className="btn dark">Edit profile</Link>
                        <AiProfileButton rewrite={!!member.bio} />
                        <Link href="/settings" className="btn ghost"><Ic n="lock" s={14} />Privacy and account</Link>
                        <Link href="/deadlines" className="btn ghost"><Ic n="cal2" s={14} />My deadlines</Link>
                      </>
                    ) : (
                      <>
                        {isAdvisor && <a href={`/members/${id}#advbook`} className="btn"><Ic n="cal" s={14} />Book a free call</a>}
                        {profileActions(ps).map((a, i) =>
                          a === "connect" ? <ConnectBtn key={a} otherId={id} initial={link} signedIn={!!userId} primary={i === 0} />
                          : a === "message" ? link === "connected" && <Link key={a} href={`/messages?with=${id}`} className="btn ghost"><Ic n="msg" s={14} />Message</Link>
                          : <FollowBtn key={a} otherId={id} initial={following} signedIn={!!userId} />,
                        )}
                        {site && <a href={site} target="_blank" rel="noreferrer nofollow" className="btn line">Visit my website</a>}
                        {userId && <MoreMenu copyPath={`/members/${id}`} blockName={first} onBlock={blockMember.bind(null, id)} />}
                      </>
                    )}
                  </div>
                  {!isMe && userId && candidates.length > 0 && link !== "connected" && (
                    <div className="introbox">
                      <span className="grow small">You both know someone. A warm introduction gets answered far more often than a cold message.</span>
                      <IntroButton targetId={id} name={first} candidates={candidates} />
                    </div>
                  )}
                </div>
                {listings[0] && (
                  <Link href={`/businesses/${listings[0].slug}`} className="pside">
                    <span className="sq"><Ic n="building" s={18} /></span>{listings[0].name}
                  </Link>
                )}
              </div>
              <nav className="ptabs" aria-label="Profile sections">
                {tabList.map(([k, label]) => (
                  <Link key={k} href={k === firstTab ? `/members/${id}` : `/members/${id}?tab=${k}`} aria-current={tab === k ? "page" : undefined}>{label}</Link>
                ))}
                {pvOn && <Link href={`/members/${id}?tab=views`} aria-current={tab === "views" ? "page" : undefined}>Profile views</Link>}
              </nav>
            </div>
            <Suspense fallback={null}><ProfileStoriesSection memberId={member.id} name={member.full_name || "Member"} avatar={photo(member)} /></Suspense>

            {tab === "views" && (
              <>
                <div className="card psec">
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    <div className="stack grow" style={{ gap: 2, flexBasis: 240 }}><h2>Who viewed my profile</h2><span className="muted small" style={{ display: "flex", gap: 5, alignItems: "center" }}><Ic n="lock" s={12} />Only you can see this tab.</span></div>
                    <div className="chips" role="group" aria-label="Period">
                      {([["today", "Today"], ["7", "7 days"], ["30", "30 days"]] as const).map(([k, l]) => <Link key={k} className="chip" aria-pressed={pvRange === k} href={`/members/${id}?tab=views&range=${k}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{l}</Link>)}
                    </div>
                  </div>
                  <div className="pvstats">
                    <div><span className="n">{pvTotal}</span><span className="muted small">profile views</span></div>
                    <div><span className="n">{pvShown.length}</span><span className="muted small">different members</span></div>
                    <div><span className="n">{pvShown.filter((v) => pvBy.get(v.viewer_id!)?.profile_type === "advisor").length}</span><span className="muted small">were SME Advisors</span></div>
                  </div>
                </div>
                <div className="card psec">
                  <h2>Visitors</h2>
                  {pvShown.length ? (
                    <div className="list">
                      {pvShown.map((v) => { const m = pvBy.get(v.viewer_id!)!; return (
                        <div key={m.id} className="row" style={{ flexWrap: "wrap" }}>
                          <ZipAv name={m.full_name || "M"} src={m.avatar_url} />
                          <span className="stack grow" style={{ gap: 2, minWidth: 0, flexBasis: 200 }}>
                            <Link href={`/members/${m.id}`} className="namebtn">{m.full_name || "Member"}</Link>
                            <span className="muted small">{[m.headline, m.location].filter(Boolean).join(" · ")}</span>
                            <span className="muted small">Viewed {when(v.last_at, { month: "short", day: "numeric" })}</span>
                          </span>
                          <Link className="btn sm ghost" href={`/messages?with=${m.id}`}><Ic n="msg" s={14} />Message</Link>
                        </div>
                      ); })}
                    </div>
                  ) : <p className="muted">No one has viewed your profile in this period.</p>}
                  {pvHidden > 0 && <p className="small" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>Plus {pvHidden} more. Plus members see everyone who viewed them. <Link href="/membership-plans" style={{ color: "var(--accent)", fontWeight: 600 }}>See plans</Link></p>}
                </div>
              </>
            )}

            {tab === "about" && (
              <>
                <div className="card psec">
                  <h2>About</h2>
                  {member.bio ? <p className="about" style={{ whiteSpace: "pre-wrap" }}>{member.bio}</p> : <p className="muted">{isMe ? "You have not written an introduction yet." : "No introduction yet."}</p>}
                  {details && details.helps_with.length > 0 && (
                    <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Can help with</span><div className="chips">{details.helps_with.map((t) => <span key={t} className="tag offer">{t}</span>)}</div></div>
                  )}
                  {details && details.needs.length > 0 && (
                    <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Looking for</span><div className="chips">{details.needs.map((t) => <span key={t} className="tag question">{t}</span>)}</div></div>
                  )}
                  {details && details.availability.length > 0 && (
                    <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Free to chat</span><span>{details.availability.join(", ")}</span></div>
                  )}
                </div>

                {isMe && <MyTagsCard />}

                {(recs.length > 0 || (!isMe && link === "connected") || requests.length > 0) && (
                  <div className="card psec">
                    <div className="row" style={{ flexWrap: "wrap" }}>
                      <h2 className="grow">Recommendations</h2>
                      {shown.length > 0 && <span className="muted small">Recommended by {shown.length}</span>}
                    </div>
                    {isMe && requests.length > 0 && <p className="muted small">{requests.map((r) => r.requester?.full_name ?? "A member").join(", ")} asked you for a recommendation.</p>}
                    <div className="list">
                      {recs.map((r) => (
                        <div key={r.id} className="row" style={{ alignItems: "flex-start" }}>
                          <ZipAv name={r.author?.full_name || "M"} src={null} size="s" />
                          <div className="stack grow" style={{ gap: 3, minWidth: 0 }}>
                            <span>
                              <Link href={`/members/${r.author_id}`} className="namebtn">{r.author?.full_name || "Member"}</Link>{" "}
                              <span className="tag">{RELATIONSHIPS[r.relationship]}</span>
                              {r.hidden && <span className="tag" style={{ marginLeft: 6 }}>Hidden from your profile</span>}
                            </span>
                            <span className="muted small">{r.author?.headline ? `${r.author.headline} · ` : ""}{when(r.created_at, { year: "numeric", month: "short" })}</span>
                            <p className="rectext">“{r.body}”</p>
                          </div>
                          <RecActions id={r.id} subjectId={id} hidden={r.hidden} isSubject={isMe} isAuthor={r.author_id === userId} />
                        </div>
                      ))}
                    </div>
                    {recs.length === 0 && <p className="muted">{isMe ? "No recommendations yet. Ask clients and partners you have worked with." : "No recommendations yet."}</p>}
                    {!isMe && link === "connected" && (
                      <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
                        <RecommendForm subjectId={id} name={first} existing={myRec ? { relationship: myRec.relationship, body: myRec.body } : undefined} />
                        {!alreadyAsked && <RequestRecButton askedId={id} name={first} />}
                      </div>
                    )}
                  </div>
                )}

                {cells && <ProfileDetails fields={ps.fields as Field[]} cells={cells} me={isMe} path={`/members/${id}`} nets={ps.nets as Record<string, boolean>} />}
                <Suspense fallback={null}><AdvisorSections memberId={member.id} name={member.full_name || "Member"} /></Suspense>

                {listings.length > 0 && (
                  <div className="card psec">
                    <h2>Businesses</h2>
                    <div className="list">
                      {listings.map((c) => (
                        <Link key={c.slug} href={`/businesses/${c.slug}`} className="row">
                          {c.logo_url ? <img src={c.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} /> : <span className="sq"><Ic n="building" s={18} /></span>}
                          <span className="stack" style={{ gap: 2 }}><strong>{c.name}</strong>{c.category && <span className="muted small">{c.category}</span>}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === "posts" && (
              <>
                <div className="card psec" style={{ gap: 2 }}><h2>Posts</h2><span className="muted">{isMe ? "Your posts" : `Posts by ${first}`}</span></div>
                {posts.length === 0 && <Empty title={isMe ? "You have not posted yet" : "Nothing posted yet"}>{isMe ? "Head to the feed and share your first update." : "When this member posts, it will show up here."}</Empty>}
                {posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)}
                <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={`/members/${id}?tab=posts`} />
              </>
            )}

            {tab === "connections" && (
              <div className="card psec">
                <div className="row"><h2 className="grow">Connections</h2><span className="muted small">{isMe ? `${connList.length} in all` : `${connList.length} you both know`}</span></div>
                {!userId ? <p className="muted">Sign in to see the connections you share with {first}.</p> : connList.length === 0 ? (
                  <p className="muted">{isMe ? "No connections yet. Find owners in the " : `You and ${first} have no connections in common yet.`}{isMe && <Link href="/network" style={{ color: "var(--link)", fontWeight: 600 }}>member directory</Link>}{isMe && "."}</p>
                ) : (
                  <div className="list">
                    {connList.map((m) => {
                      const t = TYPES[m.profile_type] ?? TYPES.owner;
                      return (
                        <div key={m.id} className="row" style={{ flexWrap: "wrap" }}>
                          <ZipAv name={m.full_name || "M"} src={m.avatar_url} />
                          <span className="stack grow" style={{ gap: 2, minWidth: 0, flexBasis: 200 }}>
                            <span><Link href={`/members/${m.id}`} className="namebtn">{m.full_name}</Link> <span className="tag ptype" style={{ background: t[1], color: t[2] }}>{t[0]}</span></span>
                            <span className="muted small">{[m.headline, m.location].filter(Boolean).join(" · ")}</span>
                          </span>
                          <ConnectBtn otherId={m.id} initial={connLinks.get(m.id) ?? "none"} signedIn={!!userId} small />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "groups" && (
              <div className="card psec">
                <h2>Groups</h2>
                {groupList.length === 0 ? <p className="muted">{first} has not joined a public group yet.</p> : (
                  <div className="list">
                    {groupList.map((g) => (
                      <Link key={g.id} href={`/groups/${g.slug}`} className="row" style={{ alignItems: "flex-start" }}>
                        <span className="stack grow" style={{ gap: 2 }}><strong>{g.name}</strong>{g.description && <span className="muted small">{g.description}</span>}</span>
                        <span className="muted small">{g.members} member{g.members === 1 ? "" : "s"}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "blog" && (
              <div className="card psec">
                <h2>Blog</h2>
                {blogPosts.length === 0 ? <p className="muted">{isMe ? "You have" : `${first} has`} not published a blog post yet.</p> : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {blogPosts.map((b) => (
                      <div key={b.id} className="mbrow">
                        <span className="th"><img src={b.image_url || "/zip/img/community.jpg"} alt="" loading="lazy" /></span>
                        <div className="stack grow" style={{ gap: 5, minWidth: 0 }}>
                          <span className="acat">{b.cat}{b.status !== "published" ? ` · ${STATUS_LABEL[b.status]}` : ""}</span>
                          <Link className="atitle" style={{ font: "700 17px/1.3 var(--display)" }} href={`/member-blogs/${b.id}`}>{b.title}</Link>
                          <span className="ameta">{blogDate(b.published_at ?? b.created_at)} · {readMinutes(b.blocks)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isMe && <Link href="/write" className="btn sm" style={{ alignSelf: "flex-start" }}>Write a post</Link>}
              </div>
            )}
          </section>

          {others.length > 0 && (
            <aside className="rail" style={{ flex: "1 1 300px" }} aria-label="More profiles">
              <div className="card morep" style={{ gap: 0 }}>
                <h2 style={{ fontSize: 18, marginBottom: 6 }}>More profiles for you</h2>
                {others.map((p) => (
                  <div key={p.id}>
                    <Link href={`/members/${p.id}`} aria-hidden="true" tabIndex={-1}><ZipAv name={p.full_name || "M"} src={p.avatar_url} /></Link>
                    <span className="stack grow" style={{ gap: 4, minWidth: 0 }}>
                      <span><Link href={`/members/${p.id}`} className="namebtn">{p.full_name || "Member"}</Link>{degrees.get(p.id) && <span className="deg"> · {DEGREE_LABEL[degrees.get(p.id)!]}</span>}</span>
                      <span className="small">{p.headline || MEMBER_TYPES[p.member_type]}</span>
                      <span><ConnectBtn otherId={p.id} initial={links.get(p.id) ?? "none"} signedIn={!!userId} small /></span>
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
