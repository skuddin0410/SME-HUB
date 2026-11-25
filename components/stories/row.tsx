"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { deleteStory, moderateStory } from "@/app/(hub)/story-actions";
import { AUDS, durLabel, mediaUrl, stAgo, type Story, type StoryAuthor, type StoryHighlight } from "@/lib/stories-shared";
import { useStories } from "./host";
import { firstUnseen, stepsOf } from "./viewer";

const ring = (unseen: boolean) => (unseen ? "strg un" : "strg");

/** The feed's "Community Stories" row (handoff: storyRow): your story first, then unseen authors, then the rest. */
export function StoryRow({ me, authors, mine }: { me: { name: string; avatar: string | null }; authors: StoryAuthor[]; mine: Story[] }) {
  const { view, newStory, rules } = useStories();
  const [seenAuthors, setSeenAuthors] = useState<Record<string, boolean>>({});
  const pend = mine.some((s) => s.status === "pending");

  const openAuthor = (k: number) => {
    const a = authors[k];
    if (!a) return;
    const steps = stepsOf(a.stories);
    setSeenAuthors((x) => ({ ...x, [a.id]: true }));
    let at = k;
    view({
      steps, start: firstUnseen(steps), mode: "feed",
      next: () => {
        at += 1;
        const n = authors[at];
        if (!n) return null;
        setSeenAuthors((x) => ({ ...x, [n.id]: true }));
        return stepsOf(n.stories);
      },
    });
  };
  const openMine = () => view({ steps: stepsOf([...mine].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))), start: 0, mode: "own" });

  return (
    <section className="strow" aria-label="Community Stories">
      <div className="strail" id="strail">
        <div className="stb">
          <span className="stbw">
            {mine.length ? (
              <button type="button" className={`stav ${ring(true)}`} onClick={openMine} aria-label="View your story"><ZipAv name={me.name} src={me.avatar} size="l" /></button>
            ) : (
              <button type="button" className="stav strg none" onClick={newStory} aria-label="Add to your story"><ZipAv name={me.name} src={me.avatar} size="l" /></button>
            )}
            {rules.canPost && <button type="button" className="stplus" onClick={newStory} aria-label="Add to your story">+</button>}
          </span>
          <span className="stn">Your story</span>
          {pend && <span className="stpend">Pending review</span>}
        </div>
        {authors.map((a, k) => {
          const un = a.unseen && !seenAuthors[a.id];
          return (
            <div key={a.id} className="stb">
              <button type="button" className={`stav ${ring(un)}`} onClick={() => openAuthor(k)} aria-label={`${a.name}’s story${un ? ", not seen yet" : ", seen"}`}>
                <ZipAv name={a.name} src={a.avatar} size="l" />
              </button>
              <span className="stn">{a.name.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
      {!authors.length && !mine.length && (
        <div className="stempty">
          <strong>No stories yet today.</strong>
          <span className="muted small">Share the first one: a new product, a look behind the scenes, or a clip from an event.</span>
          {rules.canPost && <button type="button" className="btn sm" onClick={newStory}><Ic n="spark" s={14} />Share the first story</button>}
        </div>
      )}
    </section>
  );
}

/** A profile's "Stories and highlights" card (handoff: stProfile). */
export function ProfileStories({ person, owner, live, highlights, all, counts }: {
  person: { id: string; name: string; avatar: string | null }; owner: boolean; live: Story[]; highlights: StoryHighlight[]; all: Story[];
  counts: Record<string, { views: number; likes: number }>;
}) {
  const { view, newHighlight, rules } = useStories();
  const params = useSearchParams();
  const [manage, setManage] = useState(params.get("stories") === "manage");
  const [seen, setSeen] = useState(false);
  if (!live.length && !highlights.length && !owner) return null;
  const un = !seen && live.some((s) => s.items.some((it) => !s.seen.includes(it.id)));
  const byId = new Map(all.concat(live).map((s) => [s.id, s]));
  // highlight items need their stories; visitors get them from the live list and the highlight's own stories
  const openHL = (h: StoryHighlight) => {
    const steps = h.items.flatMap((x) => { const s = byId.get(x.storyId); return s ? [{ story: s, itemId: x.itemId }] : []; });
    if (!steps.length) return toast("Nothing to show");
    view({ steps, start: 0, mode: "hl", label: h.name });
  };
  const thumb = (itemId: string | null) => {
    if (!itemId) return "";
    for (const s of byId.values()) {
      const it = s.items.find((x) => x.id === itemId);
      if (it) return it.kind === "video" ? (it.poster ? mediaUrl(it.id, true) : "") : mediaUrl(it.id);
    }
    return "";
  };
  return (
    <div className="card psec sthl">
      <div className="row" style={{ flexWrap: "wrap" }}>
        <h2 className="grow">Stories and highlights</h2>
        {owner && <button type="button" className="btn sm ghost" onClick={() => setManage((m) => !m)}>{manage ? "Hide my stories" : "Manage my stories"}</button>}
      </div>
      <div className="strail">
        {live.length > 0 && (
          <div className="stb">
            <button type="button" className={`stav ${ring(un)}`} onClick={() => { setSeen(true); view({ steps: stepsOf(live), start: 0, mode: "profile" }); }} aria-label={`Today’s story from ${person.name}`}>
              <ZipAv name={person.name} src={person.avatar} size="l" />
            </button>
            <span className="stn">Today</span>
          </div>
        )}
        {highlights.map((h) => {
          const src = thumb(h.cover);
          return (
            <div key={h.id} className="stb">
              <button type="button" className="stav strg hl" onClick={() => openHL(h)} aria-label={`Highlight: ${h.name}`} disabled={!h.items.length}>
                <span className="hlimg" style={src ? { backgroundImage: `url('${src}')` } : undefined} />
              </button>
              <span className="stn">{h.name}</span>
              {owner && <button type="button" className="linkbtn small" onClick={() => newHighlight(h)}>Edit</button>}
            </div>
          );
        })}
        {owner && (
          <div className="stb">
            <button type="button" className="stav strg none hlnew" onClick={() => newHighlight()} aria-label="New highlight">+</button>
            <span className="stn">New</span>
          </div>
        )}
      </div>
      {owner && <p className="muted small">Stories leave the feed after {durLabel(rules.hours)}. Highlights stay on your profile after that, and each photo or video keeps the audience you first chose for it.</p>}
      {owner && manage && <ManageList all={all} counts={counts} />}
    </div>
  );
}

function ManageList({ all, counts }: { all: Story[]; counts: Record<string, { views: number; likes: number }> }) {
  const { view } = useStories();
  const router = useRouter();
  if (!all.length) return <div className="list"><p className="muted small">You have not posted a story yet.</p></div>;
  return (
    <div className="list">
      {all.map((s) => {
        const it = s.items[0];
        const th = it ? (it.kind === "video" ? (it.poster ? mediaUrl(it.id, true) : "") : mediaUrl(it.id)) : "";
        const pill = s.status === "pending" ? <span className="pill warn">Pending review</span>
          : s.status === "removed" ? <span className="pill">Removed by the Hub</span>
          : s.status === "rejected" ? <span className="pill">Not approved</span>
          : s.live ? <span className="pill on">In the feed</span> : <span className="pill">Left the feed</span>;
        return (
          <div key={s.id} className="row" style={{ flexWrap: "wrap" }}>
            <button type="button" className="stmini" style={{ backgroundImage: th ? `url('${th}')` : undefined, border: 0, cursor: "pointer" }} aria-label="View story"
              onClick={() => s.status === "published" || s.status === "pending" ? view({ steps: stepsOf([s]), start: 0, mode: "own" }) : undefined} />
            <span className="stack grow" style={{ gap: 2, minWidth: 0, flexBasis: 180 }}>
              <span className="small"><strong>{s.caption || "Story"}</strong></span>
              <span className="muted small">{stAgo(s.publishedAt)} · {s.items.length} item{s.items.length === 1 ? "" : "s"} · {AUDS[s.audience]} · {counts[s.id]?.views ?? 0} views</span>
            </span>
            {pill}
            <DeleteBtn id={s.id} onDone={() => router.refresh()} />
          </div>
        );
      })}
    </div>
  );
}

function DeleteBtn({ id, onDone }: { id: string; onDone: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className="btn sm ghost" onClick={() => setAsk(true)}>Delete</button>;
  return (
    <span className="row" style={{ gap: 6 }}>
      <button type="button" className="btn sm" style={{ background: "#B91C1C", borderColor: "#B91C1C" }} onClick={async () => { const r = await deleteStory(id); if (r.error) toast(r.error); else { toast("Story deleted"); onDone(); } }}>Delete story</button>
      <button type="button" className="btn sm ghost" onClick={() => setAsk(false)}>Cancel</button>
    </span>
  );
}

/** The Stories tab in Moderation (handoff: stModTab). */
export function ModStories({ pending, reported, removed, approval }: {
  pending: (Story & { reports: string[] })[]; reported: (Story & { reports: string[] })[]; removed: (Story & { reports: string[] })[]; approval: boolean;
}) {
  const { view } = useStories();
  const router = useRouter();
  const act = async (id: string, a: "approve" | "reject" | "remove" | "dismiss" | "restore", ok: string) => {
    const r = await moderateStory(id, a);
    toast(r.error ?? ok);
    router.refresh();
  };
  const row = (s: Story & { reports: string[] }, btns: React.ReactNode) => {
    const it = s.items[0];
    const th = it ? (it.kind === "video" ? (it.poster ? mediaUrl(it.id, true) : "") : mediaUrl(it.id)) : "";
    return (
      <div key={s.id} className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
        <button type="button" className="stmini big" style={{ backgroundImage: th ? `url('${th}')` : undefined }} onClick={() => view({ steps: stepsOf([s]), start: 0, mode: "mod" })} aria-label="View story" />
        <span className="stack grow" style={{ gap: 3, minWidth: 0, flexBasis: 220 }}>
          <span><a className="namebtn" href={`/members/${s.authorId}`}>{s.author.name}</a> <span className="muted small">· {stAgo(s.publishedAt)} · {AUDS[s.audience]} · {s.items.length} item{s.items.length === 1 ? "" : "s"}</span></span>
          <span className="small">{s.caption || "No caption"}</span>
          {s.reports.length > 0 && <span className="small sterr">{s.reports.length} report{s.reports.length === 1 ? "" : "s"}: {s.reports.join("; ")}</span>}
        </span>
        <span className="row" style={{ flexWrap: "wrap", gap: 6 }}>{btns}</span>
      </div>
    );
  };
  const viewBtn = (s: Story) => <button type="button" className="btn sm ghost" onClick={() => view({ steps: stepsOf([s]), start: 0, mode: "mod" })}>View</button>;
  return (
    <>
      <div className="card">
        <div className="row"><h2 className="grow">Waiting for approval</h2><span className={`pill ${pending.length ? "warn" : "on"}`}>{pending.length}</span></div>
        {!approval && <p className="muted small">Approval is off in Stories settings, so new stories publish straight away.</p>}
        {pending.length ? <div className="list">{pending.map((s) => row(s, <>{viewBtn(s)}<button type="button" className="btn sm" onClick={() => act(s.id, "approve", "Approved. It is in the feed now.")}>Approve</button><button type="button" className="btn sm ghost" onClick={() => act(s.id, "reject", "Not approved. Only the author and moderators can see it.")}>Reject</button></>))}</div> : <p className="muted">Nothing waiting.</p>}
      </div>
      <div className="card">
        <div className="row"><h2 className="grow">Reported stories</h2><span className={`pill ${reported.length ? "warn" : "on"}`}>{reported.length}</span></div>
        {reported.length ? <div className="list">{reported.map((s) => row(s, <>{viewBtn(s)}<button type="button" className="btn sm" style={{ background: "#B91C1C", borderColor: "#B91C1C" }} onClick={() => act(s.id, "remove", "Story removed. Its photos and videos are blocked for members.")}>Remove story</button><button type="button" className="btn sm ghost" onClick={() => act(s.id, "dismiss", "Reports dismissed. The story stays up.")}>Keep it</button></>))}</div> : <p className="muted">No reports.</p>}
      </div>
      {removed.length > 0 && (
        <div className="card">
          <h2>Removed or not approved</h2>
          <div className="list">{removed.map((s) => row(s, <button type="button" className="btn sm ghost" onClick={() => act(s.id, "restore", "Story restored")}>Restore</button>))}</div>
          <p className="muted small">Only moderators can see these. Their photos and videos are blocked for everyone else.</p>
        </div>
      )}
    </>
  );
}
