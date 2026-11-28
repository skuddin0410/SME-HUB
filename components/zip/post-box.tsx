"use client";

import { toast } from "@/components/toast";
import { safetyPlain, showSafety } from "@/lib/safety/client";
import { provinceOf } from "@/lib/threads-shared";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { createPost, type FormState } from "@/app/(hub)/actions";
import { aiHashtags, improvePost } from "@/app/(hub)/post-actions";
import { POST_MEDIA, POST_PDF_MB, readVideo, uploadImage, uploadPdf, uploadVideo } from "@/lib/upload";
import { PdfCard, pdfShort } from "@/components/zip/post-pdf";
import { shortLink, suggestTags, URL_RX } from "@/lib/zip/post-text";
import { tagOk, type TagRules } from "@/lib/zip/hashtags";
import { FEED } from "@/lib/feed-rules";
import { KINDS, type Kind } from "@/lib/demo";
import type { ComposerRules } from "@/lib/zip/settings-load";

/** The post types in the window, in the design's order, with their icons. Update 10 adds Update, first and the default. */
const TYPES: Kind[] = ["update", "question", "win", "hiring", "intro", "offer"];
const TYPE_ICON: Record<string, string> = { update: "doc", question: "help", win: "trophy", offer: "tag", hiring: "brief", intro: "hand" };
const PROMPT: Record<string, string> = {
  update: "What do you want to share with the community?",
  question: "What do you want to ask the community?",
  win: "What went well? Share the result and what made the difference.",
  hiring: "What role are you hiring for?",
  intro: "Say hello. What does your business do?",
  offer: "What are you offering members?",
};
const VIS: [string, string][] = [["public", "Everyone"], ["members", "Members only"], ["connections", "My connections"], ["private", "Only me"]];

type Me = { id: string; full_name: string | null; avatar_url: string | null; location?: string | null };
type Photo = { key: string; preview: string; url: string; busy: boolean };
type Video = { preview: string; name: string; url: string; poster: string; busy: boolean; pct: number };
type Pdf = { name: string; size: number; path: string; busy: boolean };

function PostBtn({ disabled, sched, pending }: { disabled: boolean; sched: boolean; pending: boolean }) {
  return <button type="submit" className="btn" disabled={pending || disabled}>{pending ? "Posting…" : sched ? "Schedule" : "Post"}</button>;
}

/**
 * The post box in the feed and the post window (Updates 9 and 10). The box is a "Start a post" bar with shortcuts;
 * the window holds the post form. Closing the window keeps the draft. Update 10 adds up to 10 photos, 1 video,
 * short links, hashtag suggestions, the Update type and one line of labelled buttons at the bottom.
 */
export function PostBox({
  me, groupId, groups = [], businesses = [], rules, tagHints, tagRules, initialKind, initialText, free, staff, initialBiz,
}: {
  me: Me;
  groupId?: string;
  /** groups the member belongs to, for "Post to" */
  groups?: { id: string; name: string }[];
  businesses?: { id: string; name: string }[];
  /** Update 40: "Post an update" from My businesses opens the box posting as that business. */
  initialBiz?: string;
  rules?: ComposerRules;
  tagHints?: { tag: string; uses: number }[];
  /** the team's hashtag rules, when hashtags are on in posts; suggestions follow them */
  tagRules?: TagRules | null;
  initialKind?: Kind;
  initialText?: string;
  /** Free members see Offer locked */
  free: boolean;
  /** the Hub team can schedule posts */
  staff: boolean;
}) {
  const router = useRouter();
  // Posting calls the server directly rather than through a form transition, so the window closes as soon as the post
  // is saved, even when Next.js is slow to show the refreshed page (vercel/next.js#83386).
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const r = await createPost({}, new FormData(e.currentTarget));
      // Update 41: a welcome-week limit opens its window and keeps the post; other safety words read plainly
      if (r.error && showSafety(r.error)) setState({});
      else setState(r.error ? { ...r, error: safetyPlain(r.error) ?? r.error } : r);
    } catch {
      setState({ error: "Your post was not saved. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  };
  const [open, setOpen] = useState(!!initialKind || !!initialText);
  const [lock, setLock] = useState(false);
  const [kind, setKind] = useState<Kind>(initialKind ?? "update");
  const [body, setBody] = useState(initialText ?? "");
  const [title, setTitle] = useState("");
  // Update 42: a question can be asked anonymously
  const [anon, setAnon] = useState(false);
  const [to, setTo] = useState("public");
  const [poll, setPoll] = useState<string[] | null>(null);
  const [pdays, setPdays] = useState("3");
  const [sched, setSched] = useState(false);
  const [cover, setCover] = useState(false);
  const [closeC, setCloseC] = useState(false);
  const [note, setNote] = useState("");
  const [sug, setSug] = useState<{ q: string; list: { tag: string; uses: number }[] } | null>(null);
  const [aiTags, setAiTags] = useState<{ for: string; tags: string[] } | null>(null);
  const [improving, startImprove] = useTransition();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [video, setVideo] = useState<Video | null>(null);
  const [pdf, setPdf] = useState<Pdf | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pollMax = Math.min(FEED.pollMax, Math.max(FEED.pollMin, rules?.pollMax ?? FEED.pollMax));
  const toGroup = to.startsWith("g:") ? to.slice(2) : "";
  const busy = photos.some((p) => p.busy) || !!video?.busy || !!pdf?.busy;
  const firstPhoto = photos.find((p) => p.url)?.url ?? "";

  const focusText = () => setTimeout(() => {
    const t = textRef.current;
    if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
  }, 40);
  const show = (k?: Kind, pick?: "photo" | "video") => {
    opener.current = document.activeElement as HTMLElement | null;
    if (k) setKind(k);
    setLock(false);
    setOpen(true);
    if (pick) setTimeout(() => (pick === "photo" ? photoRef : videoRef).current?.click(), 60);
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
  // after a successful post: the window closes, the box goes back to "Start a post", the type goes back to Update
  useEffect(() => {
    if (!state.ok) return;
    setBody(""); setTitle(""); setKind("update"); setAnon(false); setPoll(null); setSched(false); setCover(false); setCloseC(false); setNote("");
    setPhotos([]); setVideo(null); setPdf(null); setAiTags(null);
    setOpen(false);
    if (state.held) toast("Thanks. Your post is being checked by the Hub team and will appear once it’s approved.");
    else if (state.anon) toast("Posted anonymously. Only the SME Hub team can see it’s you.");
    router.refresh();
  }, [state.ok, state.held, state.anon, router]);
  // better hashtag suggestions from AI, when the server has it, after a pause in typing
  useEffect(() => {
    if (!open || !tagRules || body.replace(/#\w+/g, "").trim().length < 40) return;
    const t = setTimeout(() => { aiHashtags(body).then((tags) => setAiTags({ for: body, tags })).catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, [body, open, tagRules]);

  const addPhotos = (files: FileList | null) => {
    const all = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!all.length) return;
    const room = POST_MEDIA.photos - photos.length;
    const tooBig = all.filter((f) => f.size > POST_MEDIA.photoMB * 1024 * 1024);
    const ok = all.filter((f) => f.size <= POST_MEDIA.photoMB * 1024 * 1024);
    const take = ok.slice(0, Math.max(0, room));
    const msgs: string[] = [];
    if (ok.length > room) msgs.push(`You can add up to ${POST_MEDIA.photos} photos. We added the first ${Math.max(0, room)}.`);
    if (tooBig.length) msgs.push(`Photos can be up to ${POST_MEDIA.photoMB} MB each.`);
    setNote(msgs.join(" "));
    const added = take.map((f) => ({ key: crypto.randomUUID(), preview: URL.createObjectURL(f), url: "", busy: true, file: f }));
    setPhotos((cur) => [...cur, ...added.map(({ key, preview, url, busy: b }) => ({ key, preview, url, busy: b }))]);
    for (const a of added) {
      uploadImage(a.file, "post")
        .then((url) => setPhotos((cur) => cur.map((p) => (p.key === a.key ? { ...p, url, busy: false } : p))))
        .catch((e) => {
          setPhotos((cur) => cur.filter((p) => p.key !== a.key));
          setNote(e instanceof Error ? e.message : "A photo did not upload. Try again.");
        });
    }
  };
  const addVideo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) { setNote("That file isn’t a video"); return; }
    if (file.size > POST_MEDIA.videoMB * 1024 * 1024) { setNote(`Videos can be up to ${POST_MEDIA.videoMB} MB and ${POST_MEDIA.videoMinutes} minutes long`); return; }
    const meta = await readVideo(file);
    if (meta.seconds > POST_MEDIA.videoMinutes * 60) { setNote(`Videos can be up to ${POST_MEDIA.videoMB} MB and ${POST_MEDIA.videoMinutes} minutes long`); return; }
    setNote("");
    const preview = URL.createObjectURL(file);
    setVideo({ preview, name: file.name, url: "", poster: "", busy: true, pct: 0 });
    try {
      const [url, poster] = await Promise.all([
        uploadVideo(file, (pct) => setVideo((v) => (v && v.preview === preview ? { ...v, pct } : v))),
        meta.poster ? uploadImage(new File([meta.poster], "poster.jpg", { type: "image/jpeg" }), "post").catch(() => "") : Promise.resolve(""),
      ]);
      setVideo((v) => (v && v.preview === preview ? { ...v, url, poster, busy: false, pct: 100 } : v));
    } catch (e) {
      setVideo((v) => (v && v.preview === preview ? null : v));
      setNote(e instanceof Error ? e.message : "The video did not upload. Try again.");
    }
  };

  // Update 26: one PDF per post, up to 25 MB; a wrong file or a big one gets a clear message and nothing is attached
  const addPdf = async (file: File | undefined) => {
    if (!file) return;
    setNote("");
    const before = pdf;
    setPdf({ name: file.name, size: file.size, path: "", busy: true });
    try {
      const up = await uploadPdf(file);
      setPdf({ ...up, busy: false });
    } catch (e) {
      setPdf(before);
      setNote(e instanceof Error ? e.message : "The PDF did not upload. Try again.");
    }
  };

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
  /** A suggested hashtag goes at the end of the post. */
  const addTag = (tag: string) => {
    const x = body.replace(/\s+$/, "");
    setBody(`${x}${x ? (/#\w+$/.test(x) ? " " : "\n\n") : ""}#${tag} `);
    focusText();
  };
  const improve = () => {
    if (!body.trim()) { setNote("Write a few words first"); return; }
    startImprove(async () => {
      const r = await improvePost(body, kind);
      if (r.text) { setBody(r.text); setNote(r.ai ? "Improved with AI. Check it before you post." : "Tidied and structured. Check it before you post."); }
      else setNote(r.error ?? "Could not improve the post. Try again.");
    });
  };

  const known = (tagHints ?? []).map((t) => t.tag);
  const ok = (t: string) => (tagRules ? tagOk(t, tagRules) : true);
  const have = new Set((body.toLowerCase().match(/#(\w+)/g) ?? []).map((x) => x.slice(1)));
  const tags = !tagRules ? [] : aiTags?.for === body && aiTags.tags.length ? aiTags.tags.filter((t) => !have.has(t)) : suggestTags(body, known, ok);
  const urls = body.match(URL_RX) ?? [];
  const askHint = kind === "update" && /\?\s*$/.test(body.trim());

  const has = body.trim() || photos.length || video || pdf;
  const draftLine = body.trim() ? body.trim().slice(0, 60) + (body.trim().length > 60 ? "…" : "") : video ? "Video" : photos.length ? "Photos" : pdf ? pdfShort(pdf.name) : "";
  const shortcuts: [string, string, string, () => void][] = [
    ["img", "Photo", "#378FE9", () => show(undefined, "photo")],
    ["video", "Video", "#16A34A", () => show(undefined, "video")],
    ["help", "Question", "#1D4ED8", () => show("question")],
    ["brief", "Hiring", "#7C3AED", () => show("hiring")],
  ];
  const keyClick = (ref: React.RefObject<HTMLInputElement | null>) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); }
  };

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
          <form onSubmit={submit} style={lock ? { display: "none" } : { display: "flex", flexDirection: "column" }}>
            <input type="hidden" name="kind" value={kind} />
            {photos.filter((p) => p.url).map((p) => <input key={p.key} type="hidden" name="images" value={p.url} />)}
            {video?.url && <input type="hidden" name="video_url" value={video.url} />}
            {video?.poster && <input type="hidden" name="video_poster" value={video.poster} />}
            {pdf?.path && <input type="hidden" name="pdf_path" value={pdf.path} />}
            {pdf?.path && <input type="hidden" name="pdf_name" value={pdf.name} />}
            {cover && firstPhoto && <input type="hidden" name="cover_url" value={firstPhoto} />}
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
                        <select id="dbiz" name="business_id" className="cpaud" defaultValue={initialBiz ?? ""}>
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
                    onClick={() => (locked ? setLock(true) : setKind(k))}>
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
            {kind === "question" && (
              <div className={`ccanon${anon ? " on" : ""}`}>
                <button type="button" className="ccsw" role="switch" aria-checked={anon} aria-label="Ask anonymously" onClick={() => setAnon((v) => !v)}><i /></button>
                <span>
                  <b>Ask anonymously</b>
                  <small>{anon ? `Shown as “A business owner in ${provinceOf(me.location)}”. Only the SME Hub team can see it’s you.` : "Good for money trouble, legal worries or anything personal."}</small>
                </span>
                {anon && <span className="ccav" style={{ width: 28, height: 28 }} aria-hidden="true"><Ic n="lock" s={14} /></span>}
              </div>
            )}
            {kind === "question" && anon && <input type="hidden" name="anonymous" value="1" />}
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

            <div className="cpsug">
              {askHint && (
                <div className="cphint">
                  <Ic n="help" s={15} />
                  <span>Asking for help? Mark it as a <b>Question</b> so members who can help see it.</span>
                  <button type="button" className="btn sm ghost" onClick={() => setKind("question")}>Make it a question</button>
                </div>
              )}
              {tags.length > 0 && (
                <div className="cptags">
                  <span className="small muted">Suggested hashtags:</span>
                  {tags.map((x) => <button key={x} type="button" className="cptag" onClick={() => addTag(x)}>#{x}</button>)}
                </div>
              )}
              {urls.length > 0 && (
                <div className="cplinks small muted">
                  <Ic n="ext" s={13} /> Links will show short: {urls.slice(0, 3).map((u, i) => <span key={i}>{i > 0 && ", "}<b>{shortLink(u)}</b></span>)}
                </div>
              )}
            </div>

            {(photos.length > 0 || video) && (
              <div className="cpmedia">
                {photos.length > 0 && (
                  <>
                    <div className="cpthumbs">
                      {photos.map((p, i) => (
                        <div key={p.key} className="cpth">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.preview} alt={`Photo ${i + 1}`} style={p.busy ? { opacity: 0.6 } : undefined} />
                          <button type="button" className="cpthx" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((cur) => cur.filter((x) => x.key !== p.key))}><Ic n="x" s={14} /></button>
                        </div>
                      ))}
                      {photos.length < POST_MEDIA.photos && (
                        <label htmlFor="cpphotos" className="cpth cpadd" tabIndex={0} onKeyDown={keyClick(photoRef)}>
                          <Ic n="plus" s={18} /><span className="small">Add</span>
                        </label>
                      )}
                    </div>
                    <p className="small muted cpnote">{photos.length} of {POST_MEDIA.photos} photos{busy && photos.some((p) => p.busy) ? " · uploading…" : ""}</p>
                  </>
                )}
                {video && (
                  <div className="cpvid">
                    <video src={video.preview} controls playsInline preload="metadata" aria-label="Video to post" />
                    <button type="button" className="cpx cprm" aria-label="Remove video" onClick={() => setVideo(null)}><Ic n="x" s={16} /></button>
                    <span className="small muted">{video.name}{video.busy ? ` · uploading ${video.pct}%` : ""}</span>
                  </div>
                )}
              </div>
            )}

            {pdf && (
              <div className="cpmedia">
                <PdfCard pdf={pdf}>
                  {pdf.busy ? <span className="small muted">Uploading…</span> : (
                    <>
                      <label htmlFor="cppdf" className="btn sm ghost" tabIndex={0} onKeyDown={keyClick(pdfRef)}>Replace</label>
                      <button type="button" className="cpx" aria-label="Remove PDF" onClick={() => setPdf(null)}><Ic n="x" s={16} /></button>
                    </>
                  )}
                </PdfCard>
              </div>
            )}

            <div className="cpextra">
              {firstPhoto && rules?.cover !== false && (
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
              <input ref={photoRef} className="sr" type="file" id="cpphotos" accept="image/*" multiple tabIndex={-1} aria-hidden="true"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              <label htmlFor="cpphotos" className="cpi" title={`Add photos (up to ${POST_MEDIA.photos})`} aria-label={`Add photos, up to ${POST_MEDIA.photos}`} tabIndex={0} onKeyDown={keyClick(photoRef)}>
                <Ic n="img" s={18} /><span>Photo</span>
              </label>
              <input ref={videoRef} className="sr" type="file" id="cpvideo" accept="video/mp4,video/quicktime,.mp4,.mov" tabIndex={-1} aria-hidden="true"
                onChange={(e) => { void addVideo(e.target.files?.[0]); e.target.value = ""; }} />
              {!video && (
                <label htmlFor="cpvideo" className="cpi" title="Add a video" aria-label="Add a video" tabIndex={0} onKeyDown={keyClick(videoRef)}>
                  <Ic n="video" s={18} /><span>Video</span>
                </label>
              )}
              <input ref={pdfRef} className="sr" type="file" id="cppdf" accept="application/pdf,.pdf" tabIndex={-1} aria-hidden="true"
                onChange={(e) => { void addPdf(e.target.files?.[0]); e.target.value = ""; }} />
              <label htmlFor="cppdf" className="cpi" title={`Add a PDF (up to ${POST_PDF_MB} MB)`} aria-label={`Add a PDF document, up to ${POST_PDF_MB} MB`} tabIndex={0} onKeyDown={keyClick(pdfRef)}>
                <Ic n="pdf" s={18} /><span>PDF</span>
              </label>
              {rules?.polls !== false && !poll && <button type="button" className="cpi" title="Add a poll" aria-label="Add a poll" onClick={() => setPoll(["", ""])}><Ic n="poll" s={18} /><span>Poll</span></button>}
              <button type="button" className="cpi" title="Improve with AI" aria-label="Improve with AI" disabled={improving} onClick={improve}><Ic n="spark" s={18} /><span>Improve with AI</span></button>
              {staff && rules?.schedule !== false && !sched && <button type="button" className="cpi" title="Schedule" aria-label="Schedule" onClick={() => setSched(true)}><Ic n="clock" s={18} /><span>Schedule</span></button>}
              <span className="grow" />
              <PostBtn disabled={busy || improving} sched={sched} pending={pending} />
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
