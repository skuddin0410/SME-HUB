"use client";
import Link from "next/link";
import { useState } from "react";
import { Scene } from "@/components/zip/scene";
import { Chip, Radio, Sw, WordList, useSettings } from "@/components/zip/settings-ui";
import { Ic } from "@/components/zip/ic";
import { AUOPT, AUTPL, FEED_FILTERS, FTYPES, GCOVERS, NETS, STTYPES, VISL, WIN, flowFromTpl, type Field, type Flow } from "@/lib/zip/settings";

const Small = ({ children }: { children: React.ReactNode }) => <span className="small"><strong>{children}</strong></span>;
const Note = ({ children }: { children: React.ReactNode }) => <p className="muted small">{children}</p>;
const H2 = ({ children }: { children: React.ReactNode }) => <h2 style={{ marginTop: 8 }}>{children}</h2>;
const linkStyle = { color: "var(--link)", fontWeight: 600, textDecoration: "underline" } as const;

function Move({ list, i, label }: { list: string; i: number; label: string }) {
  const { get, edit } = useSettings();
  const n = (get(list) as unknown[]).length;
  const mv = (d: number) => edit((x) => { const a = list.split(".").reduce((o: any, k) => o[k], x); [a[i], a[i + d]] = [a[i + d], a[i]]; }); // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <span className="mvs">
      <button type="button" className="iconbtn" aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => mv(-1)}>↑</button>
      <button type="button" className="iconbtn" aria-label={`Move ${label} down`} disabled={i === n - 1} onClick={() => mv(1)}>↓</button>
    </span>
  );
}

/* ---------- Profiles and directory ---------- */
export function ProfilesBody({ groups, signedUp }: { groups: [string, string][]; signedUp: number }) {
  const { v, get, set, edit } = useSettings();
  const [fname, setFname] = useState(""); const [ftype, setFtype] = useState("Text"); const [fsec, setFsec] = useState("About");
  const [tname, setTname] = useState("");
  const AL: Record<string, string> = { connect: "Connect", follow: "Follow", message: "Send message" };
  const fields: Field[] = v.fields;
  const types: [string, string, string, string][] = v.types;
  const toggleAccess = (t: string, u: string) => edit((d) => {
    const a: string[] | null = d.access[t];
    if (u === "all") { d.access[t] = null; return; }
    const cur = a ?? [];
    d.access[t] = cur.includes(u) ? cur.filter((x) => x !== u) : [...cur, u];
    if (!d.access[t].length) d.access[t] = null;
  });
  const toggleAuto = (t: string, g: string) => edit((d) => { const a: string[] = d.auto[t] ?? []; d.auto[t] = a.includes(g) ? a.filter((x) => x !== g) : [...a, g]; });
  return (
    <div className="setgrid">
      <div className="card"><h2>Profile header</h2><Radio path="header" label="Profile header" opts={[["left", "Photo on the left"], ["center", "Centred"]]} />
        <H2>What the header shows</H2>
        {[["online", "Online now (green dot)"], ["type", "Profile type"], ["joined", "Joined date"], ["followers", "Followers"], ["last", "Last active"]].map(([k, l]) => <Sw key={k} path={`head.${k}`} label={l} />)}
        <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href="/members">See the directory</Link></div>
      <div className="card"><h2>Display name</h2><Radio path="dname" label="Display name" opts={[["full", "First and last name"], ["first", "First name only"], ["nick", "Nickname"]]} />
        <Note>This changes every name across the Hub.</Note>
        <H2>Profile link</H2><Radio path="link" label="Profile link" opts={[["name", "Uses the name"], ["id", "Uses a private number"]]} />
        <Note>A private number keeps names and email addresses out of web addresses.</Note></div>
      <div className="card"><h2>Profile tabs</h2><Note>Put the tabs in order, hide the ones you do not need and choose which opens first.</Note>
        <div className="ftable">{(v.tabs as [string, string, boolean][]).map((t, i) => (
          <div className="frow2" key={t[0]}><Move list="tabs" i={i} label={t[1]} />
            <strong className="grow">{t[1]}{!t[2] && <> <span className="pill">Hidden</span></>}</strong>
            <Chip on={v.defTab === t[0]} onClick={() => set("defTab", t[0])}>{v.defTab === t[0] ? "Opens first" : "Open first"}</Chip>
            {v.defTab !== t[0] && <button type="button" className="sw" role="switch" aria-checked={t[2]} onClick={() => set(`tabs.${i}.2`, !t[2])}><i aria-hidden="true" /><span className="sr">Show {t[1]}</span></button>}
          </div>))}</div></div>
      <div className="card"><h2>Buttons on profiles and cards</h2>
        <Sw path="connect" label="Members can connect with each other" /><Sw path="follow" label="Members can follow each other" />
        <Sw path="autoFollow" label="Connecting also follows (auto follow)" /><Sw path="gate" label="Only connections can message each other" />
        <H2>Button order</H2><Note>The first one is the main dark button.</Note>
        <div className="ftable">{(v.actions as [string, boolean][]).map((a, i) => (
          <div className="frow2" key={a[0]}><Move list="actions" i={i} label={AL[a[0]]} /><strong className="grow">{AL[a[0]]}</strong>
            <button type="button" className="sw" role="switch" aria-checked={a[1]} onClick={() => set(`actions.${i}.1`, !a[1])}><i aria-hidden="true" /><span className="sr">Show {AL[a[0]]}</span></button></div>))}</div></div>

      <div className="card" style={{ gridColumn: "1/-1" }}><h2>Profile fields</h2>
        <Note>Ask for exactly what the Hub needs. Set who sees each answer, whether the member may change that, and whether it becomes a search filter in the directory.</Note>
        <div className="ftable">{fields.map((f, i) => (
          <div className="frow2" key={f.k} style={{ flexWrap: "wrap" }}>
            <span className="stack" style={{ gap: 1, flex: "1 1 200px" }}><strong>{f.l}</strong><span className="muted small">{f.g} · {f.t}</span></span>
            <label className="sr" htmlFor={`pf-${i}`}>Who can see {f.l}</label>
            <select id={`pf-${i}`} className="field" style={{ width: "auto", minHeight: 38 }} value={f.vis} onChange={(e) => set(`fields.${i}.vis`, e.target.value)}>
              {Object.entries(VISL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <button type="button" className="sw" role="switch" aria-checked={!f.lock} onClick={() => set(`fields.${i}.lock`, !f.lock)}><i aria-hidden="true" /><span>Member can change</span></button>
            <button type="button" className="sw" role="switch" aria-checked={!!f.search} onClick={() => set(`fields.${i}.search`, !f.search)}><i aria-hidden="true" /><span>Search filter</span></button>
            {!f.core && <button type="button" className="xbtn" aria-label={`Remove ${f.l}`} onClick={() => edit((d) => { d.fields.splice(i, 1); })}>×</button>}
          </div>))}</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <label className="sr" htmlFor="pfl">New field name</label><input id="pfl" className="field" style={{ flex: "1 1 200px" }} placeholder="New field, such as Languages spoken" value={fname} onChange={(e) => setFname(e.target.value)} />
          <label className="sr" htmlFor="pft">Field type</label><select id="pft" className="field" style={{ flex: "0 1 170px" }} value={ftype} onChange={(e) => setFtype(e.target.value)}>{FTYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <label className="sr" htmlFor="pfg">Section</label><select id="pfg" className="field" style={{ flex: "0 1 170px" }} value={fsec} onChange={(e) => setFsec(e.target.value)}>{["About", "Business", "Contact", "Work history"].map((t) => <option key={t}>{t}</option>)}</select>
          <button type="button" className="btn sm ghost" onClick={() => { const l = fname.trim(); if (!l) return; edit((d) => { d.fields.push({ k: `x${Date.now().toString(36)}`, g: fsec, l, t: ftype, vis: "members", lock: false }); }); setFname(""); }}>Add field</button>
        </div></div>

      <div className="card"><h2>Social networks</h2><Note>Pick which of the 13 networks members can add. They show as small round buttons on the profile.</Note>
        <div className="chips">{NETS.map(([k, l]) => <Chip key={k} on={!!get(`nets.${k}`)} onClick={() => set(`nets.${k}`, !get(`nets.${k}`))}>{l}</Chip>)}</div></div>
      <div className="card"><h2>Member directory</h2><Radio path="dview" label="Directory layout" opts={[["grid", "Grid"], ["list", "List"]]} />
        <Sw path="dswitch" label="Let members switch between grid and list" />
        <H2>What each member card shows</H2>
        {[["online", "Online now (green dot)"], ["type", "Profile type"], ["followers", "Followers"], ["last", "Last active"], ["joined", "Joined date"]].map(([k, l]) => <Sw key={k} path={`dcard.${k}`} label={l} />)}
        <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href="/members">See the directory</Link></div>

      <div className="card" style={{ gridColumn: "1/-1" }}><h2>Profile types</h2>
        <Note>A type says what a member is. The plan (Free, Plus, Advisor) says what they pay. Each type gets its own rules. {signedUp} members have joined so far.</Note>
        <div className="ftable">{types.map((t) => {
          const a = v.access[t[0]] as string[] | null;
          return (
            <div className="frow2" key={t[0]} style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
              <span className="stack" style={{ gap: 4, flex: "0 0 150px" }}><span className="tag ptype" style={{ background: t[2], color: t[3], alignSelf: "flex-start" }}>{t[1]}</span></span>
              <span className="stack" style={{ gap: 6, flex: "1 1 300px" }}><Small>Can ask to connect with</Small>
                <span className="chips"><Chip on={!a} onClick={() => toggleAccess(t[0], "all")}>Everyone</Chip>{types.map((u) => <Chip key={u[0]} on={!!a && a.includes(u[0])} onClick={() => toggleAccess(t[0], u[0])}>{u[1]}</Chip>)}</span></span>
              <span className="stack" style={{ gap: 6, flex: "1 1 260px" }}><Small>Joins these groups on day one</Small>
                <span className="chips">{groups.map(([id, name]) => <Chip key={id} on={((v.auto[t[0]] as string[]) ?? []).includes(id)} onClick={() => toggleAuto(t[0], id)}>{name}</Chip>)}</span></span>
            </div>);
        })}</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <label className="sr" htmlFor="ptn">New profile type</label><input id="ptn" className="field" style={{ flex: "1 1 220px" }} placeholder="Add a type, such as Investor" value={tname} onChange={(e) => setTname(e.target.value)} />
          <button type="button" className="btn sm ghost" onClick={() => { const l = tname.trim(); if (!l) return; edit((d) => { d.types.push([`t${Date.now().toString(36)}`, l, "#F4F4F5", "#27272A"]); }); setTname(""); }}>Add type</button></div>
        <Note>Who can start a group is set by plan, in <Link href="/groupsettings" style={linkStyle}>Group settings</Link>.</Note></div>

      <div className="card" style={{ gridColumn: "1/-1" }}><h2>Who viewed my profile</h2>
        <div className="setgrid" style={{ gap: "14px 32px" }}>
          <div className="stack" style={{ gap: 10 }}>
            <Sw path="pv.on" label="Members can see who viewed their profile" /><Sw path="pv.strip" label="Show recent visitors on the member's own profile header" />
            <Sw path="pv.optout" label="Members can turn off recording of their own visits" /><Sw path="pv.guests" label="Also count visitors who are not signed in" /></div>
          <div className="stack" style={{ gap: 8 }}>
            <Small>Free members see</Small><Radio path="pv.free" label="Free members see" opts={[["0", "The number only"], ["2", "2 visitors"], ["5", "5 visitors"], ["all", "Everyone"]]} />
            <Note>Plus members and Advisors always see everyone.</Note>
            <Small>Tell members about new views</Small><Radio path="pv.notify" label="Tell members about new views" opts={[["off", "Never"], ["weekly", "Once a week"], ["each", "Each visitor, once a day"]]} />
            <Small>Chart</Small><Radio path="pv.chart" label="Chart" opts={[["bar", "Bars"], ["line", "Line"]]} /></div>
          <div className="stack" style={{ gap: 6 }}><Small>Most viewed members, last 30 days</Small><Note>Profile views are not recorded yet, so there is nothing to rank.</Note></div>
        </div></div>

      <div className="card"><div className="row"><h2 className="grow">Member invites</h2><span className="pill on">0 sent</span></div>
        <Sw path="invites" label="Show an Invite button in the directory" /><Note>Invitations you send will be listed here.</Note></div>
      <div className="card"><h2>Closing an account</h2><Radio path="del" label="Closing an account" opts={[["free", "Free members close their own"], ["all", "Every member closes their own"], ["team", "Only the Hub team"]]} />
        <Note>Paid members go through your team so billing stops properly.</Note><Sw path="exportData" label="Members can download their data" />
        <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href="/settings">See the member page</Link></div>
    </div>
  );
}

/* ---------- Feed ---------- */
export function FeedBody({ types }: { types: [string, string][] }) {
  const { v } = useSettings();
  const wins = WIN as [string, string][];
  return (
    <>
      <div className="card" style={{ marginBottom: 20, flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <div className="stack grow" style={{ flexBasis: 300, gap: 2 }}><strong>You are signed in as a Hub team member</strong>
          <span className="muted small">That already shows the team-only tools on the Home feed: Pin to feed, Schedule, and Turn off commenting on any post.</span></div>
        <Link className="btn sm ghost" href="/feed">Go to the feed</Link></div>
      <div className="setgrid">
        <div className="card"><h2>A feed for each member</h2><Sw path="relevant" label="Show members only posts that matter to them" />
          <Note>Their groups, connections, people they follow and posts that mention them. No hidden algorithm.</Note>
          <H2>Filters members can use</H2>{FEED_FILTERS.map(([k, l]) => <Sw key={k} path={`filters.${k}`} label={l} />)}</div>
        <div className="card"><h2>Topics and search</h2><Sw path="topics" label="Show a topic bar above the feed" />
          <Note>The topics are your post types: Question, Win, Offer, Hiring and Intro. Every post already has one, and Offers stay for paid members.</Note>
          <Note>Search covers post titles, posts and every comment.</Note>
          <H2>New posts and sharing</H2><Sw path="refresh" label="New posts arrive on their own" /><Sw path="share" label="Share button on every post" /><Sw path="shareOut" label="Allow sharing outside the Hub" /></div>
        <div className="card"><h2>Posting tools</h2><Sw path="polls" label="Polls" /><Small>Most options in a poll</Small>
          <Radio path="pollMax" label="Most options in a poll" opts={[["4", "4"], ["6", "6"], ["10", "10"]]} />
          <Sw path="cover" label="Cover image at the top of a post" /><Sw path="schedule" label="Team can schedule posts" /><Sw path="pin" label="Team can pin posts to the top" /><Sw path="closeC" label="Turn off commenting on a single post" /></div>
        <div className="card"><h2>Post title</h2><Radio path="title" label="Post title" opts={[["off", "No title"], ["optional", "Optional"], ["required", "Required"]]} />
          <Note>Titles are searchable, so the feed slowly becomes a library of answers.</Note>
          <H2>Members can edit their post for</H2><Radio path="edit" label="Edit a post for" opts={wins} />
          <H2>Members can edit their comment for</H2><Radio path="cedit" label="Edit a comment for" opts={wins} /></div>
        <div className="card"><h2>Comments</h2><Sw path="comments" label="Comments are on across the feed" />
          <Small>Replies</Small><Radio path="thread" label="Replies" opts={[["1", "One flat list"], ["2", "Nest under the comment they answer"]]} />
          <Small>Comments shown under a post at first</Small><Radio path="cshow" label="Comments shown at first" opts={[["2", "2"], ["4", "4"], ["99", "All"]]} />
          <Small>Load this many more each time</Small><Radio path="cload" label="Load more" opts={[["5", "5"], ["10", "10"], ["20", "20"]]} /></div>
        <div className="card"><h2>Who can post</h2><Radio path="access" label="Who can post" opts={[["all", "Every member"], ["paid", "Plus and Advisors only"], ["types", "Chosen profile types"]]} />
          {v.access === "types" && types.map(([k, l]) => <Sw key={k} path={`accessTypes.${k}`} label={l} />)}
          <Note>Everyone can still react, reply and vote. The Hub team can always post.</Note></div>
        <div className="card"><h2>Posts the Hub writes by itself</h2><Note>Small one-line updates that keep the feed from looking empty.</Note>
          {[["register", "A new member joins the Hub"], ["joinGroup", "A member joins a public group"], ["connect", "Two members become connected"], ["blog", "A new Hub blog post is published"]].map(([k, l]) => <Sw key={k} path={`auto.${k}`} label={l} />)}</div>
        <div className="card"><div className="row"><h2 className="grow">Scheduled posts</h2><span className="pill on">0 waiting</span></div><p className="muted">Nothing is scheduled.</p></div>
      </div>
    </>
  );
}

/* ---------- Groups ---------- */
export function GroupsBody() {
  const { v, get } = useSettings();
  const { set } = useSettings();
  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}><div className="row"><h2 className="grow">Requests for public groups</h2><span className="pill on">0 waiting</span></div>
        <p className="muted">Nothing is waiting.</p>
        <Note>Approving opens the group and makes the person who asked its host. Pick hosts for how helpful they are, not for their plan.</Note></div>
      <div className="setgrid">
        <div className="card"><h2>Who can create a private group</h2><Radio path="create" label="Who can create a private group" opts={[["paid", "Plus and Advisors"], ["advisor", "Advisors only"], ["all", "All members"]]} />
          <Note>Limits: Plus 1 group, Advisor 3 groups{v.create === "all" ? ", Free 1 group" : ""}. Public groups always go through your team.</Note>
          <H2>Joining a private group</H2><Radio path="privJoin" label="Joining a private group" opts={[["request", "Ask to join, host approves"], ["invite", "Invite only"]]} />
          <Note>This is the starting choice for new private groups. Hosts can change it. Public groups are open to all members.</Note></div>
        <div className="card"><h2>Group types</h2><WordList path="types" id="gsnew" placeholder="Add a type, such as Alumni" addLabel="New group type" remove={(w) => `Remove ${w}`} />
          <H2>Host tools</H2><Sw path="msgAll" label="Let hosts message every member at once" /><Sw path="archive" label="Archive groups with no posts for 60 days" /></div>
        <div className="card"><h2>Directory layout</h2><Radio path="layout" label="Directory layout" opts={[["grid", "Grid"], ["list", "List"]]} />
          <H2>What each directory card shows</H2>
          {[["cat", "Group type"], ["desc", "Description"], ["count", "Member photos and count"], ["act", "Posts this week"], ["host", "Host name"]].map(([k, l]) => <Sw key={k} path={`card.${k}`} label={l} />)}
          <div className="row" style={{ flexWrap: "wrap" }}><Link className="btn sm ghost" href="/groups">See the directory</Link><Link className="btn sm ghost" href="/admin/groups">Manage groups</Link></div></div>
        <div className="card"><h2>Group page header</h2><Radio path="header" label="Group page header" opts={[["side", "Picture beside the title"], ["wide", "Wide cover on top"], ["compact", "No picture"]]} />
          <H2>What the header shows</H2>
          {[["type", "Group type"], ["priv", "Public or private label"], ["desc", "Description"], ["faces", "Member photos and count"], ["act", "Posts this week"]].map(([k, l]) => <Sw key={k} path={`head.${k}`} label={l} />)}
          <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href="/groups">See a group page</Link></div>
        <div className="card"><h2>Default cover</h2><Note>Used when a host does not choose a picture, so no group launches bare.</Note>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group" aria-label="Default cover">
            {GCOVERS.map((c) => <button key={c} type="button" className="imgopt" aria-pressed={get("defCover") === c} aria-label={`Cover ${c}`} onClick={() => set("defCover", c)}><Scene n={c} h={300} /></button>)}</div></div>
      </div>
    </>
  );
}

/* ---------- Member blogs ---------- */
export function BlogsBody({ queue }: { queue?: React.ReactNode }) {
  return (
    <>
      {queue ?? <div className="card" style={{ marginBottom: 20 }}><div className="row"><h2 className="grow">Waiting for approval</h2><span className="pill on">0 waiting</span></div>
        <p className="muted">Nothing is waiting. New submissions appear here.</p></div>}
      <div className="setgrid">
        <div className="card"><h2>Who can write a post</h2><Radio path="who" label="Who can write a post" opts={[["all", "All members"], ["paid", "Plus and Advisors"], ["advisor", "Advisors only"]]} />
          <Note>Your team can always post, whatever the rule.</Note>
          <H2>Which posts need approval</H2><Radio path="approve" label="Which posts need approval" opts={[["free", "Free members only"], ["all", "Every post"], ["none", "None"]]} /></div>
        <div className="card"><h2>What every post must include</h2><Sw path="reqImg" label="Make the featured image required" /><Sw path="memberTags" label="Let members add their own tags" />
          <H2>Categories</H2><WordList path="cats" id="bsnew" placeholder="Add a category" addLabel="New category" remove={(w) => `Remove ${w}`} /></div>
        <div className="card"><h2>Directory layout</h2><Radio path="layout" label="Directory layout" opts={[["grid", "Grid"], ["list", "List"], ["compact", "Compact"]]} />
          <H2>Featured image on the post page</H2><Radio path="imgStyle" label="Featured image on the post page" opts={[["standard", "Below the title"], ["wide", "Wide, above the title"], ["overlay", "Title over the image"]]} /></div>
        <div className="card"><h2>Share buttons on posts</h2>
          {[["linkedin", "LinkedIn"], ["facebook", "Facebook"], ["x", "X"], ["email", "Email"], ["copy", "Copy link"]].map(([k, l]) => <Sw key={k} path={`share.${k}`} label={l} />)}
          <H2>End of post</H2><Sw path="authorBox" label="Show the author box under every post" /></div>
      </div>
      <div className="card" style={{ marginTop: 20 }}><h2>All member posts</h2><p className="muted">No member has written a post yet.</p></div>
    </>
  );
}

/* ---------- Hashtags ---------- */
export function HashtagsBody() {
  return (
    <>
      <div className="pvstats" style={{ marginBottom: 20 }}>
        <div><span className="n">0</span><span className="muted small">hashtags in use</span></div>
        <div><span className="n">0</span><span className="muted small">total uses</span></div>
        <div><span className="n">0</span><span className="muted small">followed by you</span></div>
      </div>
      <div className="setgrid">
        <div className="card"><h2>Where hashtags work</h2><Sw path="posts" label="Posts in the feed and in groups" /><Sw path="comments" label="Comments and replies" />
          <Sw path="auto" label="Suggest hashtags while a member types #" /><Sw path="trend" label="Trending hashtags card on Home" /></div>
        <div className="card"><h2>Following</h2><Sw path="follow" label="Members can follow hashtags" /><Sw path="profile" label="Show followed hashtags on the member's own profile" />
          <Small>Email about new posts in followed hashtags</Small><Radio path="notify" label="Email about followed hashtags" opts={[["off", "Never"], ["weekly", "Weekly summary"], ["each", "Each post"]]} /></div>
        <div className="card"><h2>Rules</h2><Small>Who can start a new hashtag</Small><Radio path="create" label="Who can start a new hashtag" opts={[["all", "Every member"], ["paid", "Plus and Advisors"], ["team", "Hub team only"]]} />
          <Note>Everyone can always use a hashtag that already exists.</Note>
          <Small>Most hashtags in one post</Small><Radio path="per" label="Most hashtags in one post" opts={[["3", "3"], ["5", "5"], ["10", "10"]]} />
          <Small>Shortest hashtag</Small><Radio path="min" label="Shortest hashtag" opts={[["2", "2 letters"], ["3", "3 letters"], ["4", "4 letters"]]} />
          <Small>Longest hashtag</Small><Radio path="max" label="Longest hashtag" opts={[["16", "16 letters"], ["24", "24 letters"], ["40", "40 letters"]]} /></div>
        <div className="card"><h2>Blocked words</h2><Note>A blocked word stays as plain text. It never becomes a link and cannot be followed.</Note>
          <WordList path="blocked" id="htb" prefix="#" placeholder="Word to block, such as crypto" addLabel="Word to block" remove={(w) => `Unblock ${w}`} /></div>
        <div className="card" style={{ gridColumn: "1/-1" }}><h2>All hashtags</h2><p className="muted">No hashtags have been used yet. They appear here once members start using them, and you can merge or remove them.</p></div>
      </div>
    </>
  );
}

/* ---------- Stories ---------- */
export function StoriesBody() {
  const { get, set } = useSettings();
  return (
    <>
      <div className="pvstats" style={{ marginBottom: 20 }}>
        <div><span className="n">0</span><span className="muted small">stories in the feed now</span></div>
        <div><span className="n">0</span><span className="muted small">waiting for approval</span></div>
        <div><span className="n">0</span><span className="muted small">expired items kept in highlights</span></div>
      </div>
      <div className="setgrid">
        <div className="card"><h2>Who can post</h2><Radio path="publish" label="Who can post" opts={[["all", "Every member"], ["paid", "Plus and Advisors"], ["team", "Hub team only"]]} />
          <H2>Approval</H2><Sw path="approval" label="New stories wait for a moderator" />
          <Note>When this is on, members see “Pending review” after posting, and nobody else can see the story until it is approved.</Note></div>
        <div className="card"><h2>Audiences members can choose</h2><Sw path="aud.public" label="Anyone, including visitors" /><Sw path="aud.members" label="All Hub members" /><Sw path="aud.conn" label="My connections only" />
          <Small>Selected by default</Small><Radio path="defAud" label="Selected by default" opts={[["members", "All members"], ["conn", "Connections"], ["public", "Anyone"]]} />
          <Note>Changing this only affects new stories. Existing stories and highlights keep their original audience.</Note></div>
        <div className="card"><h2>How long stories stay in the feed</h2><Radio path="dur" label="How long stories stay" opts={[["6", "6 hours"], ["12", "12 hours"], ["24", "24 hours"], ["48", "48 hours"], ["168", "7 days"]]} />
          <H2>After a story leaves the feed</H2><Sw path="cleanup" label="Permanently delete its photos and videos" />
          <Note>Off by default. Files saved in a highlight are always kept.</Note></div>
        <div className="card"><h2>Files</h2><Small>Allowed types</Small>
          <div className="chips">{STTYPES.map(([k, l]) => <Chip key={k} on={!!get(`types.${k}`)} onClick={() => set(`types.${k}`, !get(`types.${k}`))}>{l}</Chip>)}</div>
          <Small>Largest file</Small><Radio path="maxMB" label="Largest file" opts={[["10", "10 MB"], ["25", "25 MB"], ["50", "50 MB"], ["100", "100 MB"]]} />
          <Small>Longest video</Small><Radio path="maxVid" label="Longest video" opts={[["15", "15 sec"], ["30", "30 sec"], ["60", "60 sec"]]} /></div>
        <div className="card"><h2>Limits</h2><Small>Active stories per member</Small><Radio path="perMember" label="Active stories per member" opts={[["1", "1"], ["3", "3"], ["5", "5"], ["10", "10"]]} />
          <Small>Photos or videos in one story</Small><Radio path="perStory" label="Photos or videos in one story" opts={[["3", "3"], ["5", "5"], ["10", "10"]]} /></div>
        <div className="card"><h2>Views and likes</h2><Sw path="showViewers" label="Authors can see who viewed their story" /><Sw path="likes" label="Members can like stories" />
          <Note>Authors always see the view count. Each person counts once.</Note>
          <Link href="/moderation?tab=stories" style={linkStyle}>Review stories in Moderation</Link></div>
      </div>
    </>
  );
}

/* ---------- Automations ---------- */
const KIND: Record<string, [string, string, string]> = { action: ["Action", "Send email, notify, etc.", "mail"], refine: ["Refine audience", "Branch on member criteria", "filter"], delay: ["Delay", "Wait before the next step", "clock"] };
const doneFlow = (f: Flow) => f.steps.some((s) => s.t === "action") && f.steps[f.steps.length - 1]?.t === "action";

export function AutomationsBody({ publish }: { publish: (text: string) => Promise<{ error?: string; ok?: boolean }> }) {
  const { v, set, edit } = useSettings();
  const [tab, setTab] = useState("flows");
  const [sel, setSel] = useState(0);
  const [add, setAdd] = useState<number | null>(null);
  const [qtext, setQtext] = useState(""); const [qday, setQday] = useState("Mon, Jan 18"); const [qtime, setQtime] = useState("9:00 am ET");
  const [note, setNote] = useState("");
  const flows: Flow[] = v.flows;
  const queue: { day: string; time: string; text: string }[] = v.queue;
  const f = flows[sel] ?? flows[0];
  const i0 = flows[sel] ? sel : 0;
  const tabs: [string, string][] = [["flows", `Workflow builder (${flows.length})`], ["tpl", "Prebuilt workflows"], ["posts", `Scheduled posts (${queue.length})`]];
  const days = ["Mon, Jan 18", "Tue, Jan 19", "Wed, Jan 20", "Thu, Jan 21", "Fri, Jan 22", "Sat, Jan 23", "Sun, Jan 24"];
  const times = ["7:30 am ET", "9:00 am ET", "12:00 pm ET", "4:00 pm ET", "7:00 pm ET"];
  const Sel = ({ id, cur, opts, label, onChange }: { id: string; cur: string; opts: string[]; label: string; onChange: (x: string) => void }) => (
    <><label className="sr" htmlFor={id}>{label}</label><select id={id} value={cur} onChange={(e) => onChange(e.target.value)}>{opts.map((o) => <option key={o} value={o}>{o.split("|")[0]}</option>)}</select></>
  );
  const Plus = ({ i }: { i: number }) => (
    <>
      <span className="conn" /><button type="button" className="plus" aria-label="Add a step here" aria-expanded={add === i} onClick={() => setAdd(add === i ? null : i)}>+</button>
      {add === i && <><span className="conn" /><div className="picker">{(["action", "refine", "delay"] as const).map((k) => (
        <button key={k} type="button" onClick={() => { edit((d) => { d.flows[i0].steps.splice(i, 0, { t: k, v: AUOPT[k][0] }); }); setAdd(null); }}>
          <span className={`nico ${k}`}><Ic n={KIND[k][2]} s={15} /></span><span><b>{KIND[k][0]}</b><span>{KIND[k][1]}</span></span></button>))}</div></>}
      <span className="conn" />
    </>
  );
  return (
    <>
      <p className="muted small" style={{ marginBottom: 12 }}>Workflows and scheduled posts are saved here. Email sending is not connected yet, so a workflow does not send anything until it is.</p>
      <div className="autabs" role="tablist">{tabs.map(([k, l]) => <button key={k} type="button" role="tab" className="chip" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "flows" && (
        <div className="auwrap">
          <section className="stack" style={{ gap: 10 }}>
            {flows.map((x, i) => { const d = doneFlow(x); return (
              <button key={i} type="button" className="flowrow" aria-pressed={i === i0} onClick={() => setSel(i)}>
                <span className="stack grow" style={{ gap: 2 }}><strong style={{ fontSize: 13.5 }}>{x.name}</strong><span className="muted small">{x.trigger}{x.runs ? ` · ${x.runs} members so far` : ""}</span></span>
                <span className={`pill ${!d ? "warn" : x.on ? "on" : ""}`}>{!d ? "Incomplete" : x.on ? "On" : "Off"}</span></button>); })}
            <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={() => { edit((d) => { d.flows.push({ name: "New workflow", on: false, runs: 0, trigger: AUOPT.trigger[0], aud: AUOPT.aud[6], steps: [] }); }); setSel(flows.length); }}>+ New workflow</button>
          </section>
          {f ? (
            <section className="stack" style={{ gap: 12 }}>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <h2 className="grow" style={{ font: "700 18px var(--display)" }}>{f.name}</h2>
                <button type="button" className={`btn sm${f.on ? " ghost" : ""}`} aria-pressed={f.on} onClick={() => set(`flows.${i0}.on`, !f.on)}>{f.on ? "Turn off" : "Turn on"}</button>
                <button type="button" className="btn sm ghost" onClick={() => { edit((d) => { d.flows.splice(i0, 1); }); setSel(0); }}>Delete</button>
              </div>
              <div className="field-row"><label className="sr" htmlFor="wfn">Workflow name</label><input id="wfn" className="field" value={f.name} onChange={(e) => set(`flows.${i0}.name`, e.target.value)} /></div>
              <div className="canvas">
                <div className="node"><span className="nico trigger"><Ic n="cal" s={17} /></span><div className="stack grow" style={{ gap: 2 }}><span className="k">Trigger</span>
                  <Sel id="wf-trigger" cur={f.trigger} opts={AUOPT.trigger} label="Trigger" onChange={(x) => set(`flows.${i0}.trigger`, x)} />
                  {!doneFlow(f) && <span className="pill warn" style={{ alignSelf: "flex-start", marginTop: 4 }}>Incomplete: must end with an action</span>}</div></div>
                <span className="conn" /><span className="conn" />
                <div className="node"><span className="nico aud"><Ic n="users" s={17} /></span><div className="stack grow" style={{ gap: 2 }}><span className="k">Audience</span>
                  <Sel id="wf-aud" cur={f.aud} opts={AUOPT.aud} label="Audience" onChange={(x) => set(`flows.${i0}.aud`, x)} /><span className="k">{f.aud.split("|")[1]}</span></div></div>
                <Plus i={0} />
                {f.steps.map((s, i) => (
                  <div key={i} style={{ display: "contents" }}>
                    <div className={`node${s.t === "delay" ? " narrow" : ""}`}><span className={`nico ${s.t}`}><Ic n={KIND[s.t][2]} s={17} /></span><div className="stack grow" style={{ gap: 2 }}><span className="k">{KIND[s.t][0]}</span>
                      <Sel id={`wf-s${i}`} cur={s.v} opts={AUOPT[s.t]} label={KIND[s.t][0]} onChange={(x) => set(`flows.${i0}.steps.${i}.v`, x)} /></div>
                      <button type="button" className="xbtn" aria-label="Remove this step" onClick={() => edit((d) => { d.flows[i0].steps.splice(i, 1); })}>×</button></div>
                    <Plus i={i + 1} />
                  </div>))}
                <span className="muted small">End of workflow</span>
              </div>
            </section>
          ) : <section className="card"><p className="muted">No workflows yet. Start from a prebuilt one.</p></section>}
        </div>
      )}
      {tab === "tpl" && (
        <div className="tplgrid">{AUTPL.map((t, i) => { const used = flows.some((x) => x.name === t.name); return (
          <div className="card" key={t.name}><strong style={{ font: "700 15px var(--display)" }}>{t.name}</strong><p className="muted small">{t.why}</p>
            <div className="stack small" style={{ gap: 4 }}><span><b>When:</b> {AUOPT.trigger[t.trigger]}</span><span><b>Who:</b> {AUOPT.aud[t.aud].split("|")[0]}</span><span><b>Steps:</b> {t.steps.map(([k, j]) => AUOPT[k][j]).join(" → ")}</span></div>
            <button type="button" className={`btn sm${used ? " ghost" : ""}`} style={{ alignSelf: "flex-start", marginTop: "auto" }} onClick={() => {
              const at = flows.findIndex((x) => x.name === t.name);
              if (at < 0) edit((d) => { d.flows.push(flowFromTpl(t)); });
              setSel(at < 0 ? flows.length : at); setTab("flows");
            }}>{used ? "Open workflow" : "Use this workflow"}</button></div>); })}</div>
      )}
      {tab === "posts" && (
        <div className="auwrap" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(360px,100%),1fr))" }}>
          <section className="card"><h2>Queue a post</h2>
            <label className="sr" htmlFor="aq2">Post text</label><textarea className="field" id="aq2" placeholder="Write the post now, publish it at the right moment" value={qtext} onChange={(e) => setQtext(e.target.value)} />
            <div className="row" style={{ flexWrap: "wrap" }}>
              <label className="sr" htmlFor="aqd">Day</label><select id="aqd" className="field" style={{ flex: "1 1 140px", width: "auto" }} value={qday} onChange={(e) => setQday(e.target.value)}>{days.map((d) => <option key={d}>{d}</option>)}</select>
              <label className="sr" htmlFor="aqt">Time</label><select id="aqt" className="field" style={{ flex: "1 1 140px", width: "auto" }} value={qtime} onChange={(e) => setQtime(e.target.value)}>{times.map((d) => <option key={d}>{d}</option>)}</select></div>
            <div className="row"><button type="button" className="btn" onClick={() => { const t = qtext.trim(); if (!t) return; edit((d) => { d.queue.push({ day: qday, time: qtime, text: t }); }); setQtext(""); }}>Schedule post</button><span className="muted small">Posts from your account</span></div>
            <p className="muted small">Tip: members are most active on weekday mornings and at lunch. Posts go out only when you press Publish now.</p></section>
          <section className="card"><h2>Scheduled ({queue.length})</h2>
            {note && <p role="status" className="small">{note}</p>}
            {queue.length ? <div>{queue.map((q, i) => (
              <div className="qrow" key={i}><span className="qwhen">{q.day}<br /><span className="muted" style={{ fontWeight: 400 }}>{q.time}</span></span><span className="grow small">{q.text}</span>
                <span className="stack" style={{ gap: 4 }}>
                  <button type="button" className="btn sm ghost" onClick={async () => { const r = await publish(q.text); if (r.ok) { edit((d) => { d.queue.splice(i, 1); }); setNote("Posted to the feed. Press Save changes to update the queue."); } else setNote(r.error ?? "Could not post."); }}>Publish now</button>
                  <button type="button" className="linkbtn" onClick={() => edit((d) => { d.queue.splice(i, 1); })}>Remove</button></span></div>))}</div> : <p className="muted">Nothing scheduled.</p>}</section>
        </div>
      )}
    </>
  );
}

/* ---------- Business Profiles: settings and categories ---------- */
export function BizSettingsBody() {
  const { v } = useSettings();
  void v;
  return (
    <div className="setgrid">
      <div className="card"><h2>Who can add a business</h2><Radio path="create" label="Who can add a business" opts={[["all", "Every member"], ["paid", "Plus and Advisors"]]} />
        <Small>Pages one member can own</Small><Radio path="limit" label="Pages one member can own" opts={[["1", "1"], ["3", "3"], ["5", "5"], ["10", "10"]]} /></div>
      <div className="card"><h2>Approval</h2><Sw path="pubApproval" label="New business pages need approval" /><Sw path="revApproval" label="New reviews need approval" />
        <Note>Unapproved reviews never count toward the rating.</Note></div>
      <div className="card"><h2>Review criteria</h2><Note>Optional extra ratings members can give. Up to 6.</Note>
        <WordList path="criteria" id="ncrit" placeholder="For example: Timeliness" addLabel="New criterion" remove={(w) => `Remove ${w}`} /></div>
      <div className="card"><h2>Optional tabs</h2><Note>Turn a tab off here to hide it for every business.</Note>
        {[["photos", "Photos (Hub media)", "Connected"], ["events", "Events (Hub events)", "Connected"], ["jobs", "Jobs (Hub hiring posts)", "Connected"], ["shop", "Shop", "Checkout not connected"]].map(([k, l, st]) => (
          <div className="row" key={k}><Sw path={`tabs.${k}`} label={l} /><span className={`pill ${st === "Connected" ? "on" : "warn"}`}>{st}</span></div>))}</div>
    </div>
  );
}

export function BizCategoriesBody({ counts }: { counts: Record<string, number> }) {
  const { get, edit } = useSettings();
  const [t, setT] = useState("");
  const cats: string[] = get("cats") ?? [];
  return (
    <div className="card"><h2>Categories</h2>
      <div className="ftable">{cats.map((c, i) => { const n = counts[c] ?? 0; return (
        <div className="frow2" key={c}><span className="grow">{c}</span><span className="muted small">{n} business{n === 1 ? "" : "es"}</span>
          {!n && <button type="button" className="btn sm ghost" onClick={() => edit((d) => { d.cats.splice(i, 1); })}>Remove</button>}</div>); })}</div>
      <div className="row"><label className="sr" htmlFor="ncat">New category</label><input id="ncat" className="field grow" placeholder="New category" value={t} onChange={(e) => setT(e.target.value)} />
        <button type="button" className="btn sm" onClick={() => { const w = t.trim(); if (!w || cats.includes(w)) return; edit((d) => { d.cats.push(w); }); setT(""); }}>Add</button></div>
    </div>
  );
}
