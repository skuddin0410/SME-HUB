"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { createPost, type FormState } from "@/app/(hub)/actions";
import { improvePost } from "@/app/(hub)/post-actions";
import { useImageUpload } from "@/lib/upload";
import { FEED } from "@/lib/feed-rules";
import { KINDS, type Kind } from "@/lib/demo";
import type { ComposerRules } from "@/lib/zip/settings-load";

/** The post types in the window, in the design's order, with their icons (Update 9). */
const TYPES: Kind[] = ["question", "win", "hiring", "intro", "offer"];
const TYPE_ICON: Record<string, string> = { question: "help", win: "trophy", offer: "tag", hiring: "brief", intro: "hand" };
const PROMPT: Record<string, string> = {
  question: "What do you want to ask the community?",
  win: "What went well? Share the result and what made the difference.",
  hiring: "What role are you hiring for?",
  intro: "Say hello. What does your business do?",
  offer: "What are you offering members?",
};
const VIS: [string, string][] = [["public", "Everyone"], ["members", "Members only"], ["connections", "My connections"], ["private", "Only me"]];

type Me = { id: string; full_name: string | null; avatar_url: string | null };

function PostBtn({ disabled, sched }: { disabled: boolean; sched: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn" disabled={pending || disabled}>{pending ? "Posting…" : sched ? "Schedule" : "Post"}</button>;
}

/**
 * The post box in the feed and the post window (Update 9). The box is a "Start a post" bar with shortcuts;
 * the window holds the same form as before. Closing the window keeps the draft.
 */
export function PostBox({
  me, groupId, groups = [], businesses = [], rules, tagHints, initialKind, initialText, free, staff,
}: {
  me: Me;
  groupId?: string;
  /** groups the member belongs to, for "Post to" */
  groups?: { id: string; name: string }[];
  businesses?: { id: string; name: string }[];
  rules?: ComposerRules;
  tagHints?: { tag: string; uses: number }[];
  initialKind?: Kind;
  initialText?: string;
  /** Free members see Offer locked */
  free: boolean;
  /** the Hub team can schedule posts */
  staff: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState<FormState, FormData>(createPost, {});
  const [open, setOpen] = useState(!!initialKind || !!initialText);
  const [lock, setLock] = useState(false);
  const [kind, setKind] = useState<Kind>(initialKind ?? "update");
  const [body, setBody] = useState(initialText ?? "");
  const [title, setTitle] = useState("");
  const [to, setTo] = useState("public");
  const [poll, setPoll] = useState<string[] | null>(null);
  const [pdays, setPdays] = useState("3");
  const [sched, setSched] = useState(false);
  const [cover, setCover] = useState(false);
  const [closeC, setCloseC] = useState(false);
  const [note, setNote] = useState("");
  const [sug, setSug] = useState<{ q: string; list: { tag: string; uses: number }[] } | null>(null);
  const [improving, startImprove] = useTransition();
  const photo = useImageUpload("post");
  const clearPhoto = photo.clear;
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pollMax = Math.min(FEED.pollMax, Math.max(FEED.pollMin, rules?.pollMax ?? FEED.pollMax));
  const toGroup = to.startsWith("g:") ? to.slice(2) : "";

  const focusText = () => setTimeout(() => {
    const t = textRef.current;
    if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
  }, 40);
  const show = (k?: Kind, pick = false) => {
    opener.current = document.activeElement as HTMLElement | null;
    if (k) setKind(k);
    setLock(false);
    setOpen(true);
    if (pick) setTimeout(() => fileRef.current?.click(), 60);
    else focusText();
  };
  const close = () => {
    setOpen(false);
    setLock(false);
    setSug(null);
    setTimeout(() => opener.current?.focus(), 0);
  };

  useEffect(() => { if (open && !lock) focusText(); }, [open, lock]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  // the header's command palette and the left rail's "+ New" open the window
  useEffect(() => {
    const on = (e: Event) => {
      const k = (e as CustomEvent<string>).detail;
      show(k && k in KINDS ? (k as Kind) : undefined);
    };
    window.addEventListener("smbhub:compose", on);
    return () => window.removeEventListener("smbhub:compose", on);
  }, []);
  // after a successful post: window closes, the box goes back to "Start a post", the new post shows at the top
  useEffect(() => {
    if (!state.ok) return;
    setBody(""); setTitle(""); setKind("update"); setPoll(null); setSched(false); setCover(false); setCloseC(false); setNote("");
    clearPhoto();
    if (fileRef.current) fileRef.current.value = "";
    setOpen(false);
    router.refresh();
  }, [state.ok, clearPhoto, router]);

  const suggest = (el: HTMLTextAreaElement) => {
    const m = tagHints ? /#([A-Za-z0-9_À-ſ]*)$/.exec(el.value.slice(0, el.selectionStart ?? el.value.length)) : null;
    if (!m || !tagHints) { setSug(null); return; }
    const q = m[1].toLowerCase();
    setSug({ q, list: tagHints.filter((x) => x.tag.startsWith(q)).slice(0, 6) });
  };
  const pickTag = (tag: string) => {
    const el = textRef.current;
    if (!el) return;
    const at = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, at).replace(/#[A-Za-z0-9_À-ſ]*$/, `#${tag} `);
    setBody(before + el.value.slice(at));
    setSug(null);
    setTimeout(() => { el.focus(); el.setSelectionRange(before.length, before.length); }, 0);
  };
  const improve = () => {
    if (!body.trim()) { setNote("Write a few words first"); return; }
    startImprove(async () => {
      const r = await improvePost(body, kind);
      if (r.text) { setBody(r.text); setNote(r.ai ? "Improved with AI. Check it before you post." : "Tidied and structured. Check it before you post."); }
      else setNote(r.error ?? "Could not improve the post. Try again.");
    });
  };

  const has = body.trim() || photo.preview;
  const draftLine = body.trim() ? body.trim().slice(0, 60) + (body.trim().length > 60 ? "…" : "") : "Photo";
  const shortcuts: [string, string, string, () => void][] = [
    ["img", "Photo", "#378FE9", () => show(undefined, true)],
    ["help", "Question", "#1D4ED8", () => show("question")],
    ["brief", "Hiring", "#7C3AED", () => show("hiring")],
  ];

  return (
    <>
      <div className="card cpbox" id="composer">
        <div className="cptop">
          <ZipAv name={me.full_name || "Member"} src={me.avatar_url} />
          <button type="button" className="cpbar" aria-haspopup="dialog" onClick={() => show()}>
            {has ? <><span className="cpdraft">Continue your draft:</span> {draftLine}</> : "Start a post"}
          </button>
        </div>
        <div className="cprow">
          {shortcuts.map(([i, l, c, f]) => (
            <button key={l} type="button" className="cpb" onClick={f}><span style={{ color: c }}><Ic n={i} s={20} /></span>{l}</button>
          ))}
          <Link className="cpb" href="/events"><span style={{ color: "#C37D16" }}><Ic n="cal" s={20} /></span>Event</Link>
        </div>
      </div>

      <div className="overlay" style={open ? undefined : { display: "none" }} onClick={close}>
        <div className="modal cpm" role="dialog" aria-modal="true" aria-labelledby={lock ? "cplock" : "mt"} onClick={(e) => e.stopPropagation()}>
          {lock && (
            <div className="stack" style={{ gap: 12, padding: 22 }}>
              <h2 id="cplock" style={{ fontSize: 20 }}>Offers are for Plus members and Advisors</h2>
              <p className="muted">To keep the feed useful, only paid members can post offers. Everyone can still ask questions, share wins, post jobs and introduce themselves for free.</p>
              <div className="pbbox">
                <strong>With Plus you can:</strong>
                <span className="small">✓ Post up to 2 offers a month to all members</span>
                <span className="small">✓ Get a featured company listing</span>
                <span className="small">✓ Publish blog posts without waiting for approval</span>
              </div>
              <p className="muted small">Your business is still visible for free: on your profile, in the business directory and in the Made in Canada Pavilion.</p>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <Link className="btn" href="/membership-plans">See membership plans</Link>
                <button type="button" className="btn ghost" onClick={() => setLock(false)}>Not now</button>
              </div>
            </div>
          )}
          <form action={action} style={lock ? { display: "none" } : { display: "flex", flexDirection: "column" }}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="image_url" value={photo.url} />
            {cover && photo.url && <input type="hidden" name="cover_url" value={photo.url} />}
            {groupId && <input type="hidden" name="group_id" value={groupId} />}
            {!groupId && toGroup && <input type="hidden" name="group_id" value={toGroup} />}
            {!groupId && <input type="hidden" name="visibility" value={toGroup ? "public" : to} />}
            {closeC && <input type="hidden" name="comments_closed" value="1" />}
            {sched && <input type="hidden" name="tz_offset" value={new Date().getTimezoneOffset()} />}

            <div className="cph">
              <ZipAv name={me.full_name || "Member"} src={me.avatar_url} />
              <div className="stack" style={{ gap: 1, minWidth: 0 }}>
                <b id="mt">{me.full_name || "Member"}</b>
                {!groupId && (
                  <>
                    <label className="sr" htmlFor="dg">Post to</label>
                    <select id="dg" className="cpaud" value={to} onChange={(e) => setTo(e.target.value)}>
                      {VIS.map(([v, l]) => <option key={v} value={v}>Post to: {l}</option>)}
                      {groups.map((g) => <option key={g.id} value={`g:${g.id}`}>Post to: {g.name}</option>)}
                    </select>
                    {businesses.length > 0 && (
                      <>
                        <label className="sr" htmlFor="dbiz">Post as</label>
                        <select id="dbiz" name="business_id" className="cpaud" defaultValue="">
                          <option value="">Post as: me</option>
                          {businesses.map((b) => <option key={b.id} value={b.id}>Post as: {b.name}</option>)}
                        </select>
                      </>
                    )}
                  </>
                )}
              </div>
              <button type="button" className="cpx" aria-label="Close" onClick={close}><Ic n="x" s={18} /></button>
            </div>

            <div className="cptypes" role="group" aria-label="Post type">
              {TYPES.map((k) => {
                const locked = k === "offer" && free;
                return (
                  <button key={k} type="button" className="cpt" aria-pressed={kind === k}
                    aria-label={locked ? "Offer, for Plus members and Advisors" : undefined}
                    onClick={() => (locked ? setLock(true) : setKind(kind === k ? "update" : k))}>
                    <Ic n={TYPE_ICON[k]} s={15} />{KINDS[k].label}{locked && <> <Ic n="crown" s={13} /></>}
                  </button>
                );
              })}
            </div>

            {rules?.title !== "off" && (
              <>
                <label className="sr" htmlFor="dtitle">Post title</label>
                <input className="cptitle" id="dtitle" name="title" maxLength={FEED.titleMax} value={title} onChange={(e) => setTitle(e.target.value)}
                  required={rules?.title === "required"} placeholder={rules?.title === "required" ? "Title" : "Title (optional)"} />
              </>
            )}
            <label className="sr" htmlFor="draft">Write a post</label>
            <textarea className="cpta" id="draft" ref={textRef} name="body" maxLength={5000} value={body}
              placeholder={PROMPT[kind] ?? "What do you want to talk about?"}
              onChange={(e) => { setBody(e.target.value); suggest(e.target); }}
              onKeyUp={(e) => suggest(e.currentTarget)} />
            <div className="hsug" aria-live="polite">
              {sug && (sug.list.length ? (
                <>
                  <span className="muted small">Hashtags:</span>
                  {sug.list.map((x) => <button key={x.tag} type="button" className="chip" onClick={() => pickTag(x.tag)}>#{x.tag} <span className="muted">{x.uses}</span></button>)}
                </>
              ) : sug.q.length >= 2 ? <span className="muted small">New hashtag: #{sug.q}</span> : null)}
            </div>

            {photo.preview && (
              <div className="cpimg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="pic" src={photo.preview} alt="Photo to post" style={photo.busy ? { opacity: 0.6 } : undefined} />
                <button type="button" className="cpx cprm" aria-label="Remove photo" onClick={() => { photo.clear(); setCover(false); if (fileRef.current) fileRef.current.value = ""; }}><Ic n="x" s={16} /></button>
              </div>
            )}

            <div className="cpextra">
              {photo.error && <p className="small" style={{ color: "var(--err, #B91C1C)" }}>{photo.error}</p>}
              {photo.preview && rules?.cover !== false && (
                <button type="button" className="sw" role="switch" aria-checked={cover} onClick={() => setCover(!cover)}>
                  <i aria-hidden="true" /><span>Use this photo as a cover image at the top of the post</span>
                </button>
              )}
              {rules?.closeC !== false && (
                <button type="button" className="sw" role="switch" aria-checked={closeC} onClick={() => setCloseC(!closeC)}>
                  <i aria-hidden="true" /><span>Turn off commenting</span>
                </button>
              )}
              {poll && (
                <div className="pollbox">
                  <div className="row"><strong className="grow">Poll</strong><button type="button" className="linkbtn" onClick={() => setPoll(null)}>Remove poll</button></div>
                  {poll.map((o, i) => (
                    <input key={i} className="field" name="poll_option" aria-label={`Poll option ${i + 1}`} placeholder={`Option ${i + 1}`} maxLength={FEED.pollOptionMax}
                      value={o} onChange={(e) => setPoll(poll.map((x, j) => (j === i ? e.target.value : x)))} />
                  ))}
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    {poll.length < pollMax ? <button type="button" className="btn sm ghost" onClick={() => setPoll([...poll, ""])}>Add another option</button> : <span className="muted small">{pollMax} options is the most allowed.</span>}
                    <span className="grow" />
                    <label className="small row" style={{ gap: 8, fontWeight: 600 }}>Closes in
                      <select className="field" style={{ width: "auto", minHeight: 38 }} name="poll_days" value={pdays} onChange={(e) => setPdays(e.target.value)}>
                        {[["1", "1 day"], ["3", "3 days"], ["7", "1 week"], ["14", "2 weeks"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              )}
              {sched && (
                <div className="pollbox">
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    <label htmlFor="dwhen" style={{ fontWeight: 600 }}>Publish on</label>
                    <input id="dwhen" type="datetime-local" className="field" style={{ width: "auto", flex: "0 1 240px" }} name="scheduled_local" required />
                    <button type="button" className="linkbtn" onClick={() => setSched(false)}>Post now instead</button>
                    <Link className="linkbtn small" href="/scheduled">Scheduled posts</Link>
                  </div>
                </div>
              )}
              {(state.error || note) && <p className="small" role={state.error ? "alert" : "status"} style={state.error ? { color: "var(--err, #B91C1C)" } : undefined}>{state.error || note}</p>}
            </div>

            <div className="cpf">
              <input ref={fileRef} className="sr" type="file" id="photo" accept="image/*" onChange={(e) => photo.pick(e.target.files?.[0])} />
              <label htmlFor="photo" className="cpi" title="Add photo" aria-label="Add photo" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}><Ic n="img" s={20} /></label>
              {rules?.polls !== false && !poll && <button type="button" className="cpi" title="Add poll" aria-label="Add poll" onClick={() => setPoll(["", ""])}><Ic n="poll" s={20} /></button>}
              <button type="button" className="cpi" title="Improve with AI" aria-label="Improve with AI" disabled={improving} onClick={improve}><Ic n="spark" s={20} /></button>
              {staff && rules?.schedule !== false && !sched && <button type="button" className="cpi" title="Schedule" aria-label="Schedule" onClick={() => setSched(true)}><Ic n="clock" s={20} /></button>}
              <span className="grow" />
              <PostBtn disabled={photo.busy || improving} sched={sched} />
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
