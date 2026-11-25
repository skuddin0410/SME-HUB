"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { readVideo } from "@/lib/upload";
import { uploadStoryFile } from "@/lib/story-upload";
import {
  addToHighlight, createStory, deleteHighlight, deleteStory, moderateStory, myStoryData, reportStory, saveHighlight,
} from "@/app/(hub)/story-actions";
import { AUDL, AUDS, REPORT_REASONS, STTYPES, durLabel, mediaUrl, stAgo, storyExt, type Story, type StoryAudience, type StoryHighlight, type StoryRules } from "@/lib/stories-shared";
import { StoryViewer, type Step, type ViewMode } from "./viewer";

export type PostAs = { id: string; name: string; logo: string | null };

type Draft = { caption: string; aud: StoryAudience; as: string; items: DItem[] };
type DItem = { key: string; name: string; kind: "image" | "video"; ext: string; src: string; poster?: string; file: File; st: "check" | "up" | "done" | "error"; pct: number; err: string; fatal?: boolean; path?: string; posterPath?: string | null; seconds?: number | null };
type ViewState = { steps: Step[]; start: number; mode: ViewMode; label?: string; next?: (cur: Step[]) => Step[] | null; back?: Modal };
type Modal =
  | { type: "story" }
  | { type: "done"; id: string; pending: boolean; aud: StoryAudience }
  | { type: "report"; story: Story }
  | { type: "delete"; story: Story }
  | { type: "hladd"; story: Story }
  | { type: "hl"; id: string | null; name: string; items: string[]; cover: string | null }
  | { type: "limit"; n: number };

type Ctx = {
  meId: string | null;
  staff: boolean;
  rules: StoryRules;
  view: (v: ViewState) => void;
  newStory: () => void;
  newHighlight: (h?: StoryHighlight) => void;
};
const C = createContext<Ctx | null>(null);
export function useStories() {
  const c = useContext(C);
  if (!c) throw new Error("useStories outside StoryHost");
  return c;
}

/**
 * Everything around Community Stories that opens on top of the page: the viewer, the "New story" window and
 * the smaller windows (published, report, delete, highlights). The feed row and the profile card sit inside it.
 */
export function StoryHost({ meId, me, staff, rules, postAs, active, children }: { meId: string | null; me?: { name: string; avatar: string | null }; staff: boolean; rules: StoryRules; postAs: PostAs[]; active: number; children: React.ReactNode }) {
  const router = useRouter();
  const [viewer, setViewer] = useState<ViewState | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mine, setMine] = useState<{ stories: Story[]; highlights: StoryHighlight[] } | null>(null);

  const newDraft = useCallback((): Draft => ({ caption: "", aud: rules.defAud, as: "", items: [] }), [rules.defAud]);
  const newStory = useCallback(() => {
    if (!meId) return router.push("/auth/sign-up");
    if (!rules.canPost) return toast(rules.publish === "team" ? "Only the Hub team can post stories right now" : "Stories are for SMB Plus members and Advisors right now");
    if (!staff && active >= rules.perMember) return setModal({ type: "limit", n: active });
    setDraft((d) => d ?? newDraft());
    setModal({ type: "story" });
  }, [meId, rules, staff, active, newDraft, router]);

  const loadMine = useCallback(async () => {
    const d = await myStoryData().catch(() => null);
    setMine(d);
    return d;
  }, []);
  const newHighlight = useCallback((h?: StoryHighlight) => {
    void loadMine();
    setModal(h ? { type: "hl", id: h.id, name: h.name, items: h.items.map((x) => x.itemId), cover: h.cover } : { type: "hl", id: null, name: "", items: [], cover: null });
  }, [loadMine]);

  const onMenu = (action: "highlight" | "delete" | "report" | "remove", story: Story) => {
    setViewer(null);
    if (action === "highlight") { void loadMine(); setModal({ type: "hladd", story }); }
    else if (action === "delete") setModal({ type: "delete", story });
    else if (action === "report") setModal({ type: "report", story });
    else void moderateStory(story.id, "remove").then((r) => { toast(r.error ?? "Story removed. Its photos and videos are blocked for members."); router.refresh(); });
  };

  const closeViewer = useCallback(() => {
    setViewer((v) => {
      if (v?.back) setModal(v.back);
      return null;
    });
  }, []);

  return (
    <C.Provider value={{ meId, staff, rules, view: setViewer, newStory, newHighlight }}>
      {children}
      {viewer && (
        <StoryViewer
          key={`${viewer.steps[0]?.story.id}-${viewer.start}-${viewer.mode}`}
          steps={viewer.steps} start={viewer.start} mode={viewer.mode} label={viewer.label}
          meId={meId} staff={staff && viewer.mode === "mod" ? true : staff} likes={rules.likes}
          nextAuthor={viewer.next} onClose={closeViewer} onMenu={onMenu}
        />
      )}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className={`modal${modal.type === "story" ? " stsheet" : ""}`} role="dialog" aria-modal="true" aria-labelledby="mt" onClick={(e) => e.stopPropagation()}>
            {modal.type === "story" && draft && (
              <Composer
                draft={draft} setDraft={setDraft} rules={rules} postAs={postAs} meId={meId!} me={me ?? { name: "You", avatar: null }} staff={staff}
                onClose={() => setModal(null)}
                onPreview={(steps) => { setModal(null); setViewer({ steps, start: 0, mode: "draft", back: { type: "story" } }); }}
                onDone={(id, pending, aud) => { setDraft(null); setModal({ type: "done", id, pending, aud }); router.refresh(); }}
              />
            )}
            {modal.type === "done" && (
              <div className="stdone">
                <span className={`stdi${modal.pending ? " p" : ""}`}>{modal.pending ? <Ic n="clock" s={26} /> : "✓"}</span>
                <h2 id="mt" style={{ fontSize: 20 }}>{modal.pending ? "Pending review" : "Published"}</h2>
                <p className="muted">{modal.pending ? "A moderator will look at your story soon. Until then only you can see it." : `Your story is in the feed for ${durLabel(rules.hours)}. ${modal.aud === "conn" ? "Only your connections can see it." : modal.aud === "public" ? "Anyone can see it." : "All Hub members can see it."}`}</p>
                <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                  <button type="button" className="btn" onClick={async () => {
                    const d = await loadMine();
                    const s = d?.stories.find((x) => x.id === modal.id);
                    setModal(null);
                    if (s) setViewer({ steps: s.items.map((it) => ({ story: s, itemId: it.id })), start: 0, mode: "own" });
                  }}>View my story</button>
                  <button type="button" className="btn ghost" onClick={() => setModal(null)}>Done</button>
                </div>
              </div>
            )}
            {modal.type === "limit" && (
              <>
                <h2 id="mt" style={{ fontSize: 18 }}>You have {modal.n} active stories</h2>
                <p className="muted">The limit is {rules.perMember} at a time. Remove one from your profile, or wait until one leaves the feed.</p>
                <div className="row">
                  <Link className="btn" href={`/members/${meId}?stories=manage`} onClick={() => setModal(null)}>Manage my stories</Link>
                  <button type="button" className="btn ghost" onClick={() => setModal(null)}>Close</button>
                </div>
              </>
            )}
            {modal.type === "report" && <ReportStory story={modal.story} onClose={() => setModal(null)} />}
            {modal.type === "delete" && (
              <DeleteStory story={modal.story} onClose={() => setModal(null)} onDone={() => { setModal(null); toast("Story deleted"); router.refresh(); }} />
            )}
            {modal.type === "hladd" && (
              <>
                <h2 id="mt" style={{ fontSize: 18 }}>Save to a highlight</h2>
                <p className="muted small">Highlights stay on your profile after the story leaves the feed. The story keeps its original audience.</p>
                {(mine?.highlights ?? []).length > 0 && (
                  <div className="stack" style={{ gap: 8 }}>
                    {mine!.highlights.map((h) => (
                      <button key={h.id} type="button" className="btn ghost" style={{ justifyContent: "flex-start" }} onClick={async () => {
                        const r = await addToHighlight(h.id, modal.story.id);
                        setModal(null);
                        toast(r.error ?? `Saved to “${h.name}”`);
                        router.refresh();
                      }}>{h.name} <span className="muted small">· {h.items.length} items</span></button>
                    ))}
                  </div>
                )}
                <div className="row">
                  <button type="button" className="btn" onClick={() => { const ks = modal.story.items.map((x) => x.id); setModal({ type: "hl", id: null, name: "", items: ks, cover: ks[0] ?? null }); }}>New highlight</button>
                  <button type="button" className="btn ghost" onClick={() => setModal(null)}>Cancel</button>
                </div>
              </>
            )}
            {modal.type === "hl" && (
              <HighlightEditor
                init={modal} mine={mine} onClose={() => setModal(null)}
                onSaved={() => { setModal(null); toast("Highlight saved to your profile"); router.refresh(); }}
                onDeleted={() => { setModal(null); toast("Highlight deleted. The stories themselves were not deleted."); router.refresh(); }}
              />
            )}
          </div>
        </div>
      )}
    </C.Provider>
  );
}

/* ---------- New story ---------- */
function Composer({ draft, setDraft, rules, postAs, meId, me, staff, onClose, onPreview, onDone }: {
  me: { name: string; avatar: string | null }; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft | null>>; rules: StoryRules; postAs: PostAs[]; meId: string; staff: boolean;
  onClose: () => void; onPreview: (steps: Step[]) => void; onDone: (id: string, pending: boolean, aud: StoryAudience) => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const D = draft;
  const upd = (f: (d: Draft) => Draft) => setDraft((d) => (d ? f(d) : d));
  const setItem = useCallback((key: string, patch: Partial<DItem>) => setDraft((d) => (d ? { ...d, items: d.items.map((x) => (x.key === key ? { ...x, ...patch } : x)) } : d)), [setDraft]);
  const typesLine = rules.types.map((k) => STTYPES[k][1]).join(", ");
  const accept = rules.types.map((k) => STTYPES[k][0]).join(",");
  const pending = rules.approval && !staff;
  const ready = D.items.filter((x) => x.st === "done").length;
  const working = D.items.some((x) => x.st === "up" || x.st === "check");
  const bad = D.items.some((x) => x.st === "error");
  const cur = postAs.find((b) => b.id === D.as);

  const upload = useCallback(async (it: DItem) => {
    setItem(it.key, { st: "up", pct: 0, err: "" });
    try {
      const path = await uploadStoryFile(it.file, it.ext, (pct) => setItem(it.key, { pct }));
      let posterPath: string | null = null;
      if (it.kind === "video" && it.poster) {
        const blob = await fetch(it.poster).then((r) => r.blob());
        posterPath = await uploadStoryFile(blob, "jpg").catch(() => null);
      }
      setItem(it.key, { st: "done", pct: 100, path, posterPath });
    } catch (e) {
      setItem(it.key, { st: "error", err: e instanceof Error ? e.message : "Upload failed. Check your connection and try again. Your caption is saved." });
    }
  }, [setItem]);

  const add = (files: FileList | null) => {
    if (!files) return;
    const room = rules.perStory - D.items.length;
    const list = Array.from(files);
    if (list.length > room) toast(`You can add up to ${rules.perStory} photos or videos to one story`);
    const fresh: DItem[] = list.slice(0, Math.max(0, room)).map((f) => {
      const ext = storyExt(f) ?? "";
      const kind: "image" | "video" = f.type.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext) ? "video" : "image";
      const it: DItem = { key: crypto.randomUUID(), name: f.name, kind, ext, src: "", file: f, st: "check", pct: 0, err: "" };
      if (!ext || !rules.types.includes(ext)) return { ...it, st: "error", err: `This file type is not allowed. Use ${typesLine}.`, fatal: true };
      if (f.size > rules.maxMB * 1048576) return { ...it, st: "error", err: `This file is ${(f.size / 1048576).toFixed(1)} MB. The limit is ${rules.maxMB} MB.`, fatal: true };
      return { ...it, src: URL.createObjectURL(f) };
    });
    upd((d) => ({ ...d, items: [...d.items, ...fresh] }));
    for (const it of fresh) {
      if (it.st !== "check") continue;
      if (it.kind === "video") {
        void readVideo(it.file).then(({ seconds, poster }) => {
          const posterUrl = poster ? URL.createObjectURL(poster) : undefined;
          if (Number.isFinite(seconds) && seconds > rules.maxVid + 0.5) {
            setItem(it.key, { st: "error", err: `This video is ${Math.round(seconds)} seconds. The limit is ${rules.maxVid} seconds.`, fatal: true, poster: posterUrl });
            return;
          }
          const next = { ...it, seconds: Number.isFinite(seconds) ? seconds : null, poster: posterUrl };
          setItem(it.key, { seconds: next.seconds, poster: posterUrl });
          void upload(next);
        });
      } else void upload(it);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = (key: string, d: number) => upd((x) => {
    const i = x.items.findIndex((y) => y.key === key);
    const j = i + d;
    if (i < 0 || j < 0 || j >= x.items.length) return x;
    const items = [...x.items];
    [items[i], items[j]] = [items[j], items[i]];
    return { ...x, items };
  });

  const previewSteps = (): Step[] => {
    const done = D.items.filter((x) => x.st === "done");
    const story: Story = {
      id: "draft", authorId: meId, author: { name: cur?.name ?? me.name, avatar: cur ? cur.logo : me.avatar, biz: "" }, company: null, caption: D.caption.trim(), audience: D.aud,
      status: "published", publishedAt: new Date().toISOString(), items: done.map((x) => ({ id: x.key, kind: x.kind, poster: !!x.poster })), liked: false, seen: [], mine: true, live: true,
    };
    return done.map((x) => ({ story, itemId: x.key, local: { src: x.src, poster: x.poster } }));
  };

  const submit = async () => {
    const items = D.items.filter((x) => x.st === "done" && x.path).map((x) => ({ path: x.path!, kind: x.kind, poster: x.posterPath ?? null, seconds: x.seconds ?? null }));
    if (!items.length) return;
    setBusy(true);
    const r = await createStory({ caption: D.caption, audience: D.aud, company: D.as || null, items });
    setBusy(false);
    if (r.error || !r.id) return toast(r.error ?? "Your story could not be published.");
    onDone(r.id, pending, D.aud);
  };

  return (
    <>
      <div className="row" style={{ alignItems: "center" }}><h2 id="mt" className="grow" style={{ fontSize: 18 }}>New story</h2><button type="button" className="xbtn" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="row small" style={{ gap: 8, flexWrap: "wrap" }}>
        <ZipAv name={cur?.name ?? me.name} src={cur ? cur.logo : me.avatar} size="s" />
        <span className="grow">Posting as <strong>{cur ? cur.name : me.name}</strong>{cur ? ` · by ${me.name}` : ""}</span>
        {postAs.length > 0 && (
          <>
            <label className="sr" htmlFor="stas2">Post as</label>
            <select id="stas2" className="field" style={{ width: "auto", minHeight: 34 }} value={D.as} onChange={(e) => upd((d) => ({ ...d, as: e.target.value }))}>
              <option value="">Myself</option>
              {postAs.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </>
        )}
      </div>
      <label className="stdrop" htmlFor="stfile">
        <Ic n="up" s={20} />
        <strong>Add photos or videos</strong>
        <span className="muted small">Up to {rules.perStory} per story · {typesLine} · up to {rules.maxMB} MB · videos up to {rules.maxVid} seconds</span>
        <input id="stfile" ref={fileRef} type="file" accept={accept} multiple className="sr" onChange={(e) => add(e.target.files)} />
      </label>
      {D.items.length > 0 && (
        <ol className="stitems" aria-label="Story items in order">
          {D.items.map((it, i) => (
            <li key={it.key} className={`stit ${it.st}`}>
              <span className="stnum">{i + 1}</span>
              <span className="stth">
                {it.src ? (it.kind === "video" ? <video src={it.src} muted playsInline preload="metadata" /> : <Thumb src={it.src} />) : <span className="stthx"><Ic n="flag" s={16} /></span>}
                {it.kind === "video" && <span className="stvb">Video</span>}
              </span>
              <span className="stack grow" style={{ gap: 4, minWidth: 0 }}>
                <span className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name || `Item ${i + 1}`}</span>
                {it.st === "up" || it.st === "check" ? (
                  <><span className="stbar"><i style={{ width: `${it.pct}%` }} /></span><span className="muted small">{it.st === "check" ? "Checking file" : `Uploading ${it.pct}%`}</span></>
                ) : it.st === "done" ? (
                  <span className="small" style={{ color: "#15803D", fontWeight: 600 }}>✓ Uploaded</span>
                ) : (
                  <>
                    <span className="small sterr">{it.err}</span>
                    {!it.fatal && <button type="button" className="linkbtn small" style={{ alignSelf: "flex-start", color: "var(--accent)", fontWeight: 600 }} onClick={() => void upload(it)}>Try again</button>}
                  </>
                )}
              </span>
              <span className="stmv">
                <button type="button" className="iconbtn" aria-label="Move earlier" disabled={i === 0} onClick={() => move(it.key, -1)}>↑</button>
                <button type="button" className="iconbtn" aria-label="Move later" disabled={i === D.items.length - 1} onClick={() => move(it.key, 1)}>↓</button>
                <button type="button" className="iconbtn" aria-label={`Remove ${it.name || "item"}`} onClick={() => upd((d) => ({ ...d, items: d.items.filter((x) => x.key !== it.key) }))}>×</button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <label htmlFor="stcap">Caption <span className="muted small">(optional)</span>
        <textarea className="field" id="stcap" rows={2} maxLength={220} style={{ borderRadius: 14, padding: "10px 16px", minHeight: 64 }} placeholder="What are you sharing?" value={D.caption} onChange={(e) => upd((d) => ({ ...d, caption: e.target.value }))} />
      </label>
      <label htmlFor="staud">Who can see this
        <select className="field" id="staud" value={D.aud} onChange={(e) => upd((d) => ({ ...d, aud: e.target.value as StoryAudience }))}>
          {rules.audiences.map((a) => <option key={a} value={a}>{AUDL[a]}</option>)}
        </select>
      </label>
      <p className="muted small">{pending ? "The Hub team reviews stories before they appear. " : ""}Stories leave the feed after {durLabel(rules.hours)}. You can save them to a highlight on your profile.</p>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn ghost" disabled={!ready || working} aria-disabled={!ready || working} onClick={() => onPreview(previewSteps())}><Ic n="eye" s={15} />Preview</button>
        <span className="grow" />
        <button type="button" className="btn" disabled={!ready || working || bad || busy} aria-disabled={!ready || working || bad || busy} onClick={submit}>{pending ? "Submit for review" : "Publish story"}</button>
      </div>
      {bad && <p className="small sterr">Remove or retry the items marked in red before you publish.</p>}
    </>
  );
}

/* ---------- Report, delete ---------- */
function ReportStory({ story, onClose }: { story: Story; onClose: () => void }) {
  const [why, setWhy] = useState("");
  return (
    <>
      <h2 id="mt" style={{ fontSize: 18 }}>Report this story</h2>
      <p className="muted small">Tell the Hub team what is wrong. The member is not told who reported it. Read our <Link href="/policies/community-guidelines" onClick={onClose} style={{ color: "var(--accent)", fontWeight: 600 }}>community guidelines</Link>.</p>
      <div className="stack" style={{ gap: 8 }} role="radiogroup" aria-label="Reason">
        {/* the handoff styles the chosen chip by aria-pressed, so it stays alongside aria-checked */}
        {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
        {REPORT_REASONS.map((r) => <button key={r} type="button" className="chip" role="radio" style={{ justifyContent: "flex-start" }} aria-checked={why === r} aria-pressed={why === r} onClick={() => setWhy(r)}>{r}</button>)}
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={async () => {
          if (!why) return toast("Choose a reason");
          const res = await reportStory(story.id, why);
          onClose();
          toast(res.error ?? "Thanks. The Hub team will review this story.");
        }}>Send report</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

function DeleteStory({ story, onClose, onDone }: { story: Story; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h2 id="mt" style={{ fontSize: 18 }}>Delete this story?</h2>
      <p className="muted">It leaves the feed and your profile right away, and it is also taken out of your highlights. This cannot be undone.</p>
      <div className="row">
        <button type="button" className="btn" style={{ background: "#B91C1C", borderColor: "#B91C1C" }} disabled={busy} onClick={async () => {
          setBusy(true);
          const r = await deleteStory(story.id);
          setBusy(false);
          if (r.error) return toast(r.error);
          onDone();
        }}>Delete story</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

/* ---------- Highlight editor ---------- */
function HighlightEditor({ init, mine, onClose, onSaved, onDeleted }: {
  init: { id: string | null; name: string; items: string[]; cover: string | null }; mine: { stories: Story[] } | null;
  onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const [name, setName] = useState(init.name);
  const [items, setItems] = useState(init.items);
  const [cover, setCover] = useState(init.cover);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (cover && !items.includes(cover)) setCover(items[0] ?? null); }, [items, cover]);
  const opts = (mine?.stories ?? []).slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).flatMap((s) => s.items.map((it) => ({ k: it.id, s, it })));
  const save = async () => {
    if (!name.trim()) return toast("Give the highlight a name");
    if (!items.length) return toast("Choose at least one story");
    setBusy(true);
    const r = await saveHighlight({ id: init.id, name, items, cover });
    setBusy(false);
    if (r.error) return toast(r.error);
    onSaved();
  };
  return (
    <>
      <h2 id="mt" style={{ fontSize: 18 }}>{init.id ? "Edit highlight" : "New highlight"}</h2>
      <p className="muted small">Highlights stay on your profile after a story leaves the feed. Each photo or video keeps the audience you chose when you posted it.</p>
      <label htmlFor="hln">Name<input className="field" id="hln" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Our Products" /></label>
      <div className="chips">{["Our Products", "Behind the Scenes", "Event Recaps"].map((n) => <button key={n} type="button" className="chip" onClick={() => setName(n)}>{n}</button>)}</div>
      <span className="small"><strong>Choose stories</strong> · then tap “Cover” on the one to show on your profile.</span>
      {!mine ? (
        <p className="muted small">Loading your stories…</p>
      ) : opts.length ? (
        <div className="hlgrid">
          {opts.map((o) => {
            const on = items.includes(o.k);
            const th = o.it.kind === "video" ? (o.it.poster ? mediaUrl(o.it.id, true) : "") : mediaUrl(o.it.id);
            return (
              <div key={o.k} className={`hlopt${on ? " on" : ""}`}>
                <button type="button" className="hlpick" aria-pressed={on} style={{ backgroundImage: th ? `url('${th}')` : undefined }} aria-label={`${on ? "Remove" : "Add"} story from ${stAgo(o.s.publishedAt)}`}
                  onClick={() => setItems((x) => (on ? x.filter((k) => k !== o.k) : [...x, o.k]))}>
                  <span className="hlck">{on ? "✓" : ""}</span>
                </button>
                <span className="muted small">{stAgo(o.s.publishedAt)} · {AUDS[o.s.audience]}</span>
                {on && <button type="button" className="chip" aria-pressed={cover === o.k} onClick={() => setCover(o.k)}>{cover === o.k ? "Cover ✓" : "Cover"}</button>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">Post a story first, then save it here.</p>
      )}
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={busy} onClick={save}>Save highlight</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        {init.id && (
          <>
            <span className="grow" />
            <button type="button" className="btn ghost" onClick={async () => { const r = await deleteHighlight(init.id!); if (r.error) return toast(r.error); onDeleted(); }}>Delete highlight</button>
          </>
        )}
      </div>
    </>
  );
}

// a local preview of a chosen file (a blob address, so next/image does not apply)
// eslint-disable-next-line @next/next/no-img-element
const Thumb = ({ src }: { src: string }) => <img src={src} alt="" />;
