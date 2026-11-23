"use client";
import Link from "next/link";
import { useState } from "react";
import { Scene } from "@/components/zip/scene";
import { Chip, Radio, Sw, WordList, useSettings } from "@/components/zip/settings-ui";
import { FEED_FILTERS, FTYPES, GCOVERS, NETS, VISL, WIN, type Field } from "@/lib/zip/settings";

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
export function BlogsBody() {
  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}><div className="row"><h2 className="grow">Waiting for approval</h2><span className="pill on">0 waiting</span></div>
        <p className="muted">Nothing is waiting. New submissions appear here.</p></div>
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
