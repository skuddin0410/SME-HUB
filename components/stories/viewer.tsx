"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { likeStory, markStorySeen, storyCounts, storyViewers, type Viewers } from "@/app/(hub)/story-actions";
import { AUDS, mediaUrl, stAgo, type Story } from "@/lib/stories-shared";

/** One step of the viewer: an item of a story. Draft items carry their local preview address. */
export type Step = { story: Story; itemId: string; local?: { src: string; poster?: string } };
export type ViewMode = "feed" | "own" | "profile" | "hl" | "draft" | "mod";

export type ViewerProps = {
  steps: Step[];
  start: number;
  mode: ViewMode;
  label?: string;
  meId: string | null;
  staff: boolean;
  likes: boolean;
  /** feed mode: the next author's steps when this one ends */
  nextAuthor?: (current: Step[]) => Step[] | null;
  onClose: () => void;
  onMenu: (action: "highlight" | "delete" | "report" | "remove", story: Story) => void;
};

/**
 * The story viewer (handoff: stShow): progress bars, tap zones, pause, sound, likes, views and the "⋯" menu.
 * Photos show for 5 seconds; a video plays to its end. Keyboard: ←/→ to move, Space or K to pause, Esc to close.
 */
export function StoryViewer(p: ViewerProps) {
  const [steps, setSteps] = useState(p.steps);
  const [i, setI] = useState(p.start);
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState<"" | "menu" | "views">("");
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, { views: number; likes: number }>>({});
  const [viewers, setViewers] = useState<Viewers | null>(null);
  const [pct, setPct] = useState(0);
  const vid = useRef<HTMLVideoElement>(null);
  const el = useRef(0);
  const last = useRef(0);
  const seen = useRef(new Set<string>());
  const closeBtn = useRef<HTMLButtonElement>(null);

  const step = steps[i];
  const s = step?.story;
  const item = s?.items.find((x) => x.id === step.itemId);
  const own = !!s && (s.mine || (!!p.meId && s.authorId === p.meId));
  const isLiked = s ? liked[s.id] ?? s.liked : false;
  const hold = paused || !!panel;

  const close = p.onClose;
  const go = useCallback((d: number) => {
    setPanel("");
    const n = i + d;
    if (n < 0) return setI(0);
    if (n >= steps.length) {
      const next = p.mode === "feed" ? p.nextAuthor?.(steps) : null;
      if (next?.length) {
        setSteps(next);
        setI(0);
        return;
      }
      close();
      return;
    }
    setI(n);
  }, [i, steps, p, close]);

  // lock the page behind, and give focus back when closing
  useEffect(() => {
    const prev = document.body.style.overflow;
    const back = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      back?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    el.current = 0;
    last.current = 0;
    setPct(0);
    closeBtn.current?.focus({ preventScroll: true });
    if (!s || !item || p.mode === "draft" || p.mode === "mod" || own || !p.meId) return;
    if (!seen.current.has(item.id)) {
      seen.current.add(item.id);
      void markStorySeen([item.id]);
    }
  }, [i, steps, s, item, own, p.mode, p.meId]);

  // the author's counts
  useEffect(() => {
    if (!s || !own || p.mode === "draft" || counts[s.id]) return;
    storyCounts([s.id]).then((c) => setCounts((x) => ({ ...x, ...c }))).catch(() => {});
  }, [s, own, p.mode, counts]);

  // timing: 5 s per photo, a video's own length
  useEffect(() => {
    let raf = 0;
    const tick = (ts: number) => {
      const v = vid.current;
      if (v && item?.kind === "video") {
        if (hold && !v.paused) v.pause();
        else if (!hold && v.paused && !v.ended) v.play().catch(() => {});
        setPct(v.duration ? (v.currentTime / v.duration) * 100 : 0);
      } else {
        if (last.current && !hold) el.current += ts - last.current;
        last.current = ts;
        const dur = item ? 5000 : 2500;
        const x = el.current / dur;
        if (x >= 1) {
          go(1);
          return;
        }
        setPct(x * 100);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, steps, hold, item, go]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === " " || e.key === "k") {
        const t = e.target as HTMLElement | null;
        if (e.key === " " && t?.tagName === "BUTTON" && t.id !== "stpz" && t.id !== "stx") return;
        e.preventDefault();
        setPaused((x) => !x);
      }
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [go, close]);

  if (!s) return null;
  const local = step.local;
  const src = local ? local.src : item ? mediaUrl(item.id) : "";
  const poster = local ? local.poster : item?.poster ? mediaUrl(item.id, true) : undefined;
  const nv = counts[s.id]?.views ?? 0;
  const nl = counts[s.id]?.likes ?? 0;
  const name = s.company?.name ?? s.author.name;
  const badge = p.mode === "draft" ? "Preview" : s.status === "pending" ? "Pending review" : p.mode === "hl" ? p.label : "";

  const toggleLike = async () => {
    const on = !isLiked;
    setLiked((x) => ({ ...x, [s.id]: on }));
    const r = await likeStory(s.id, on);
    if (r.error) {
      setLiked((x) => ({ ...x, [s.id]: !on }));
      toast(r.error);
    }
  };
  const openViews = async () => {
    if (panel === "views") return setPanel("");
    setPanel("views");
    setViewers(await storyViewers(s.id).catch(() => ({ names: false, list: [] })));
  };

  return (
    <div id="stv" className="on">
      <div className="stov" onClick={close} aria-hidden="true" />
      <div className="stbox" role="dialog" aria-modal="true" aria-label={`Story from ${name}`}>
        <div className="stbars" aria-hidden="true">
          {steps.map((_, k) => <i key={k}><b style={{ width: `${k < i ? 100 : k === i ? Math.min(100, pct) : 0}%` }} /></i>)}
        </div>
        <div className="sthead">
          <ZipAv name={name} src={s.company ? s.company.logo : s.author.avatar} size="s" />
          <span className="stack grow" style={{ gap: 0, minWidth: 0 }}>
            <span className="sthn">{name}{badge ? <> <span className="stbadge">{badge}</span></> : null}</span>
            <span className="sths">
              {s.company ? <><Link href={`/businesses/${s.company.slug}`} className="stbadge" style={{ border: 0, color: "#fff" }} onClick={close}>View business</Link> </> : null}
              {s.author.biz ? `${s.author.biz} · ` : ""}{stAgo(s.publishedAt)}{own || p.staff ? ` · ${AUDS[s.audience]}` : ""}
            </span>
          </span>
          {item?.kind === "video" && (
            <button type="button" className="stic" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Turn sound on" : "Turn sound off"}>{muted ? "🔇" : "🔊"}</button>
          )}
          <button type="button" className="stic" id="stpz" onClick={() => setPaused((x) => !x)} aria-label={paused ? "Play" : "Pause"}>{paused ? "▶" : "❚❚"}</button>
          {p.mode !== "draft" && (
            <button type="button" className="stic" onClick={() => setPanel((x) => (x === "menu" ? "" : "menu"))} aria-label="More options" aria-expanded={panel === "menu"}>⋯</button>
          )}
          <button type="button" className="stic" id="stx" ref={closeBtn} onClick={close} aria-label="Close stories">×</button>
        </div>
        <div className="stmedia">
          {item ? (
            item.kind === "video" ? (
              <>
                <div className="stbg" style={{ backgroundImage: poster ? `url('${poster}')` : undefined }} />
                <video key={item.id} ref={vid} className="stfg" src={src} poster={poster} playsInline autoPlay muted={muted} onEnded={() => go(1)} />
              </>
            ) : (
              <>
                <div className="stbg" style={{ backgroundImage: `url('${src}')` }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={item.id} className="stfg" src={src} alt={s.caption || `Story from ${name}`} />
              </>
            )
          ) : (
            <div className="stno"><Ic n="lock" s={22} /><strong>This story is not available to you.</strong><span>It may be for connections only, or it was removed.</span></div>
          )}
          <button type="button" className="stzone l" onClick={() => go(-1)} aria-label="Previous" />
          <button type="button" className="stzone r" onClick={() => go(1)} aria-label="Next" />
        </div>
        {s.caption ? <div className="stcap">{s.caption}</div> : null}
        <div className="stfoot">
          {p.mode === "draft" ? (
            <><span className="small">This is how your story will look.</span><span className="grow" /><button type="button" className="btn sm" onClick={close}>Back to editing</button></>
          ) : own || p.staff ? (
            <>
              <button type="button" className="stpill" onClick={openViews}><Ic n="eye" s={14} />{nv} view{nv === 1 ? "" : "s"}</button>
              {p.likes && <span className="stpill">♥ {nl}</span>}
              <span className="grow" />
              {own && <button type="button" className="stpill" onClick={() => p.onMenu("highlight", s)}>+ Highlight</button>}
            </>
          ) : p.likes && p.meId ? (
            <><span className="grow" /><button type="button" className="stlike" aria-pressed={isLiked} onClick={toggleLike} aria-label={`${isLiked ? "Unlike" : "Like"} this story`}>{isLiked ? "♥" : "♡"}</button></>
          ) : (
            <span className="grow" />
          )}
        </div>
        {panel === "menu" && (
          <div className="stpanel" role="menu">
            {own && <button type="button" role="menuitem" onClick={() => p.onMenu("highlight", s)}>Save to a highlight</button>}
            {own && <button type="button" role="menuitem" onClick={() => p.onMenu("delete", s)}>Delete this story</button>}
            {!own && p.meId && !p.staff && <button type="button" role="menuitem" onClick={() => p.onMenu("report", s)}>Report story</button>}
            {p.staff && <button type="button" role="menuitem" onClick={() => p.onMenu("remove", s)}>Remove story (moderator)</button>}
            <button type="button" role="menuitem" onClick={() => setPanel("")}>Cancel</button>
          </div>
        )}
        {panel === "views" && (
          <div className="stpanel">
            <strong>{nv} {nv === 1 ? "person" : "people"} viewed this</strong>
            {!viewers ? (
              <span className="small">Loading…</span>
            ) : viewers.names ? (
              viewers.list.length ? (
                <div className="list">
                  {viewers.list.map((w) => <div key={w.id} className="row"><ZipAv name={w.name} src={w.avatar} size="s" /><span className="grow small">{w.name}</span>{w.liked ? <span>♥</span> : null}</div>)}
                </div>
              ) : <span className="small">No views yet.</span>
            ) : <span className="small">The Hub team has turned off viewer names. You can see the count only.</span>}
            <button type="button" className="btn sm ghost" onClick={() => setPanel("")}>Close</button>
          </div>
        )}
      </div>
      <button type="button" className="stnav p" onClick={() => go(-1)} aria-label="Previous story item">‹</button>
      <button type="button" className="stnav n" onClick={() => go(1)} aria-label="Next story item">›</button>
    </div>
  );
}

/** Every item of these stories, in order. */
export function stepsOf(list: Story[]): Step[] {
  return list.flatMap((story) => story.items.map((it) => ({ story, itemId: it.id })));
}

/** Where the feed starts: the first item not seen yet. */
export function firstUnseen(steps: Step[]) {
  const k = steps.findIndex((x) => !x.story.seen.includes(x.itemId));
  return k < 0 ? 0 : k;
}
