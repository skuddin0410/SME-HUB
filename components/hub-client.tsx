"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleHelp, ImagePlus, Loader2, Megaphone, Trophy, X, Banknote, Bot, Factory, Ship, ShieldCheck, Store, UsersRound, MapPin, House } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useImageUpload } from "@/lib/upload";
import {
  createPost,
  deletePost,
  loadComments,
  reportPost,
  setReaction,
  toggleRepost,
  updateProfile,
  type FormState,
} from "@/app/(hub)/actions";
import type { CommentRow, Profile } from "@/lib/hub";
import { REACTION_LABEL, type ReactionKind } from "@/lib/reactions";
import { splitTags, type TagRules } from "@/lib/zip/hashtags";
import { splitLinks } from "@/lib/zip/post-text";
import { ShortLink } from "@/components/zip/short-link";
import { RxGlyph, RxIcon } from "@/components/zip/rx-icon";
import { CommentThread } from "@/components/comment-thread";
import { ComposerOptions } from "@/components/composer-options";
import { DEMO_IMAGES, demoAvatar, demoCover, KINDS, type Kind } from "@/lib/demo";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function AvatarImg({
  person,
  size = 40,
}: {
  person: { id?: string; full_name: string; avatar_url: string | null };
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const src = person.avatar_url ?? (DEMO_IMAGES && person.id ? demoAvatar(person.id) : null);
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, [src]);
  const style = { width: size, height: size };
  return src && !failed ? (
    <img
      ref={img}
      src={src}
      alt=""
      loading="lazy"
      style={style}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-muted object-cover ring-1 ring-black/5"
    />
  ) : (
    <span
      style={{ ...style, fontSize: size * 0.4 }}
      className="cover flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    >
      {(person.full_name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

/** Banner strip: a photo when one is available, otherwise the blue brand gradient. */
export function Cover({ seed, className }: { seed: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, []);
  return (
    <div className={cx("banner relative w-full overflow-hidden", className)}>
      {DEMO_IMAGES && !failed && (
        <img
          ref={img}
          src={demoCover(seed)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--ink)/0.45)] to-transparent" />
    </div>
  );
}

const GROUP_ICONS: { match: RegExp; icon: typeof Bot; tone: string }[] = [
  { match: /\bai\b|artificial|automation|tech/i, icon: Bot, tone: "bg-violet-100 text-violet-700" },
  { match: /import|export|logistic|freight|shipping|trade/i, icon: Ship, tone: "bg-sky-100 text-sky-700" },
  { match: /retail|shop|store|boutique|ecommerce/i, icon: Store, tone: "bg-amber-100 text-amber-700" },
  { match: /fund|grant|financ|invest|loan|money/i, icon: Banknote, tone: "bg-emerald-100 text-emerald-700" },
  { match: /market|social media|brand|sales/i, icon: Megaphone, tone: "bg-rose-100 text-rose-700" },
  { match: /manufactur|industr|factory/i, icon: Factory, tone: "bg-slate-200 text-slate-700" },
  { match: /security|cyber|legal|law|compliance/i, icon: ShieldCheck, tone: "bg-teal-100 text-teal-700" },
  { match: /home-based|home based/i, icon: House, tone: "bg-orange-100 text-orange-700" },
  { match: /toronto|vancouver|montreal|calgary|ottawa|halifax|city|local/i, icon: MapPin, tone: "bg-indigo-100 text-indigo-700" },
];

/** A group's picture. Without one, an icon chosen from the group's topic, each topic in its own colour. */
export function GroupLogo({ seed, name, size = 40, className }: { seed: string; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, []);
  const style = { width: size, height: size };
  if (DEMO_IMAGES && !failed) {
    return (
      <img
        ref={img}
        src={`https://picsum.photos/seed/group-${encodeURIComponent(seed)}/160/160`}
        alt=""
        loading="lazy"
        style={style}
        onError={() => setFailed(true)}
        className={cx("shrink-0 rounded-lg bg-muted object-cover ring-1 ring-black/5", className)}
      />
    );
  }
  const pick = GROUP_ICONS.find((g) => g.match.test(name)) ?? { icon: UsersRound, tone: "bg-blue-100 text-blue-700" };
  const Icon = pick.icon;
  return (
    <span style={style} className={cx("flex shrink-0 items-center justify-center rounded-lg", pick.tone, className)}>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}

/** Long posts start folded so the feed stays scannable. */
export function PostBody({ text, tags }: { text: string; tags?: TagRules | null }) {
  const long = text.length > 420 || text.split("\n").length > 7;
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className={cx("text-[0.9062rem] text-zinc-900 leading-[1.6] whitespace-pre-line break-words", long && !open && "line-clamp-5")}>
        {splitLinks(text).map((seg, j) =>
          seg.href ? <ShortLink key={j} piece={seg} /> : tags ? splitTags(seg.text, tags).map((x, i) => (x.tag ? <Link key={`${j}-${i}`} href={`/hashtags/${x.tag}`} className="hlink">{x.text}</Link> : x.text)) : seg.text,
        )}
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
          {open ? "Show less" : "See more"}
        </button>
      )}
    </div>
  );
}

export function NavLink({
  href,
  label,
  badge = 0,
  children,
  variant = "top",
}: {
  href: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
  variant?: "top" | "bottom" | "side";
}) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const styles = {
    top: cx(
      "relative flex h-14 min-w-[4.25rem] flex-col items-center justify-center gap-0.5 border-b-2 px-2 text-[0.75rem] font-medium transition-colors",
      active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
    ),
    bottom: cx(
      "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.75rem] font-medium",
      active ? "text-primary" : "text-muted-foreground",
    ),
    side: cx(
      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
      active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
    ),
  }[variant];
  return (
    <Link href={href} className={styles} aria-current={active ? "page" : undefined}>
      <span className="relative">
        {children}
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 min-w-[1rem] rounded-full bg-rose-600 px-1 text-center text-[0.6562rem] font-semibold leading-4 text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}

export function SignOutButton({ className, to = "/auth/login" }: { className?: string; to?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await createClient().auth.signOut();
        router.push(to);
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

/** Submit button that shows a spinner while its form is being sent. */
export function SubmitButton({
  children,
  className,
  tone = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "primary" | "outline" | "ghost" | "danger" | "dark";
  /** for example while a picture is still uploading */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const tones = {
    primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
    dark: "bg-zinc-900 text-white hover:bg-zinc-800",
    outline: "border border-[#E5E5E8] bg-white text-zinc-800 hover:bg-[#F5F5F6]",
    ghost: "text-zinc-600 hover:bg-[#F5F5F6] hover:text-zinc-900",
    danger: "border border-rose-200 text-rose-600 hover:bg-rose-50",
  }[tone];
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cx(
        "press inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-60",
        tones,
        className,
      )}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ---------- composer (design: docs/design/feed.html) ----------
const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "update", label: "📝 Share an update" },
  { value: "win", label: "🏆 Share a Win" },
  { value: "question", label: "❓ Ask a Question" },
  { value: "offer", label: "📣 Post an Offer" },
  { value: "hiring", label: "💼 Hiring / Talent" },
  { value: "intro", label: "👋 Introduce yourself" },
];
const QUICK = "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-[#F5F5F6] transition-colors";
const SMALL_SELECT = "px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F5F5F6] border border-[#E5E5E8] text-zinc-900 focus:outline-none focus:border-blue-600";

export function Composer({
  me,
  groupId,
  placeholder,
  initialKind,
  businesses = [],
  alwaysOpen = false,
  rules,
  tagHints,
  initialText,
}: {
  /** hashtags to suggest while typing #, when the team has that switched on */
  tagHints?: { tag: string; uses: number }[];
  /** text the box starts with, such as a hashtag from a tag page */
  initialText?: string;
  /** what the team's feed settings allow in a post */
  rules?: import("@/lib/zip/settings-load").ComposerRules;
  me: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  /** published business pages this member may post as */
  businesses?: { id: string; name: string }[];
  groupId?: string;
  placeholder?: string;
  /** open on this post type straight away (for example from ?compose=win) */
  initialKind?: Kind;
  /** the feed's composer: always open, as in the design guide */
  alwaysOpen?: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(createPost, {});
  const [open, setOpen] = useState(alwaysOpen || !!initialKind);
  const photo = useImageUpload("post");
  const clearPhoto = photo.clear;
  const [count, setCount] = useState(0);
  const [optionsBusy, setOptionsBusy] = useState(false);
  const [kind, setKind] = useState<Kind>(initialKind ?? "update");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [sug, setSug] = useState<{ q: string; list: { tag: string; uses: number }[] } | null>(null);
  const suggest = (el: HTMLTextAreaElement) => {
    const m = tagHints ? /#([A-Za-z0-9_À-ſ]*)$/.exec(el.value.slice(0, el.selectionStart ?? el.value.length)) : null;
    if (!m || !tagHints) { setSug(null); return; }
    const q = m[1].toLowerCase();
    setSug({ q, list: tagHints.filter((x) => x.tag.startsWith(q)).slice(0, 6) });
  };
  const pick = (tag: string) => {
    const el = textRef.current;
    if (!el) return;
    const at = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, at).replace(/#[A-Za-z0-9_À-ſ]*$/, `#${tag} `);
    el.value = before + el.value.slice(at);
    el.setSelectionRange(before.length, before.length);
    setCount(el.value.length);
    setSug(null);
    el.focus();
  };

  const expand = (k?: Kind, pickPhoto = false) => {
    if (k) setKind(k);
    setOpen(true);
    setTimeout(() => (pickPhoto ? fileRef.current?.click() : textRef.current?.focus()), 30);
  };
  const collapse = () => {
    setOpen(alwaysOpen);
  };

  useEffect(() => {
    if (initialKind) setTimeout(() => textRef.current?.focus(), 60);
  }, [initialKind]);

  // the header's command palette and the left rail's "+ New" open the composer
  useEffect(() => {
    const on = (e: Event) => {
      const k = (e as CustomEvent<string>).detail;
      expand(k && k in KINDS ? (k as Kind) : undefined);
    };
    window.addEventListener("smbhub:compose", on);
    return () => window.removeEventListener("smbhub:compose", on);
  }, []);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      clearPhoto();
      setCount(0);
      setKind("update");
      setOpen(alwaysOpen);
    }
  }, [state.ok, clearPhoto, alwaysOpen]);

  if (!me) {
    return (
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold text-sm text-zinc-900">Have something to share?</p>
          <p className="text-xs text-zinc-500">Join to post, comment and connect with other owners.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/auth/sign-up" className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all">
            Join free
          </Link>
          <Link href="/auth/login" className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-800 border border-[#E5E5E8] hover:bg-[#F5F5F6] transition-all">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (alwaysOpen) {
    const chips = (["question", "win", "offer", "hiring", "intro"] as Kind[]).map((k) => ({ value: k, label: KINDS[k].label }));
    return (
      <form ref={formRef} action={action} className="card" id="composer">
        {groupId && <input type="hidden" name="group_id" value={groupId} />}
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="image_url" value={photo.url} />
        <input ref={fileRef} type="file" accept="image/*" className="sr" aria-label="Photo" onChange={(e) => photo.pick(e.target.files?.[0])} />
        <div className="row" style={{ alignItems: "flex-start" }}>
          <ZipAv name={me.full_name || "Member"} src={me.avatar_url} />
          <div className="grow stack" style={{ gap: 10 }}>
            <label className="sr" htmlFor="post-title">Post title</label>
            {rules?.title !== "off" && <input id="post-title" className="field" name="title" maxLength={120} required={rules?.title === "required"} placeholder={rules?.title === "required" ? "Title" : "Title (optional)"} />}
            <label className="sr" htmlFor="post-body">Write a post</label>
            <textarea
              id="post-body"
              ref={textRef}
              className="field"
              name="body"
              required
              maxLength={5000}
              defaultValue={initialText}
              onChange={(e) => { setCount(e.target.value.length); suggest(e.target); }}
              onKeyUp={(e) => suggest(e.currentTarget)}
              placeholder={kind === "update" ? "Ask a question, share a win, or introduce yourself" : KINDS[kind].prompt}
            />
            {sug && (
              <div className="chips" aria-label="Hashtag suggestions">
                {sug.list.length ? (
                  <>
                    <span className="muted small">Hashtags:</span>
                    {sug.list.map((x) => <button key={x.tag} type="button" className="chip" onClick={() => pick(x.tag)}>#{x.tag} <span className="muted">{x.uses}</span></button>)}
                  </>
                ) : sug.q.length >= 2 ? <span className="muted small">New hashtag: #{sug.q}</span> : null}
              </div>
            )}
            {photo.error && <p className="small" style={{ color: "var(--err, #B91C1C)" }}>{photo.error}</p>}
            {photo.preview && (
              <div className="stack" style={{ gap: 6 }}>
                <img className="pic" src={photo.preview} alt="Selected image" style={photo.busy ? { opacity: 0.6 } : undefined} />
                <button
                  type="button"
                  className="btn sm ghost"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    photo.clear();
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove photo
                </button>
              </div>
            )}
            <ComposerOptions key={state.ok ?? 0} onBusy={setOptionsBusy} rules={rules} />
            <div className="chips" role="group" aria-label="Post type">
              {chips.map((o) => (
                <button key={o.value} type="button" className="chip" aria-pressed={kind === o.value} onClick={() => setKind(kind === o.value ? "update" : o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
            {state.error && <p className="small" role="alert" style={{ color: "var(--err, #B91C1C)" }}>{state.error}</p>}
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button type="button" className="btn sm ghost" onClick={() => fileRef.current?.click()}>
                {photo.busy ? "Uploading…" : photo.preview ? "Change photo" : "Add photo"}
              </button>
              {businesses.length > 0 && !groupId && (
                <select name="business_id" defaultValue="" aria-label="Post as" className="field" style={{ flex: "0 1 190px", width: "auto" }}>
                  <option value="">Post as me</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>Post as {b.name}</option>
                  ))}
                </select>
              )}
              {!groupId && (
                <select name="visibility" defaultValue="public" aria-label="Who can see this post" className="field" style={{ flex: "0 1 210px", width: "auto" }}>
                  <option value="public">Post to everyone</option>
                  <option value="members">Members only</option>
                  <option value="connections">My connections</option>
                  <option value="private">Only me</option>
                </select>
              )}
              <span className="muted small" style={{ marginLeft: "auto" }}>{count}/5000</span>
              <ZipPublish disabled={photo.busy || optionsBusy} />
            </div>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form ref={formRef} action={action} className="panel p-4" id="composer">
      {groupId && <input type="hidden" name="group_id" value={groupId} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="image_url" value={photo.url} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => photo.pick(e.target.files?.[0])} />
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 [&_img]:ring-zinc-200">
          <AvatarImg person={me} size={36} />
        </span>
        <div className="flex-1 min-w-0">
          {!open ? (
            <button
              type="button"
              onClick={() => expand()}
              className="w-full text-left px-4 py-2.5 rounded-xl bg-[#F5F5F6]/80 hover:bg-[#ECE9E2] border border-[#E5E5E8] text-xs sm:text-[0.875rem] text-zinc-500 transition-colors"
            >
              {placeholder ?? "Start a post, ask a question, or share a win..."}
            </button>
          ) : (
            <div className="space-y-3 fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.75rem] font-medium text-zinc-500">Post tag:</span>
                  <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} aria-label="Post tag" className={SMALL_SELECT}>
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {businesses.length > 0 && !groupId && (
                    <select name="business_id" defaultValue="" aria-label="Post as" className={SMALL_SELECT}>
                      <option value="">Post as me</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          Post as {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {!groupId && (
                    <select name="visibility" defaultValue="public" aria-label="Who can see this post" className={SMALL_SELECT}>
                      <option value="public">🌐 Anyone</option>
                      <option value="members">👥 Members only</option>
                      <option value="connections">🤝 My connections</option>
                      <option value="private">🔒 Only me</option>
                    </select>
                  )}
                </div>
                <button type="button" onClick={collapse} aria-label="Close" className="text-xs text-zinc-400 hover:text-zinc-800 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                name="title"
                maxLength={120}
                placeholder="Title (optional)"
                aria-label="Post title"
                className="w-full rounded-xl border border-[#E5E5E8] bg-[#F5F5F6]/60 p-2.5 text-[0.875rem] font-semibold text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600"
              />
              <textarea
                ref={textRef}
                name="body"
                required
                maxLength={5000}
                rows={3}
                onChange={(e) => setCount(e.target.value.length)}
                placeholder={kind === "update" ? "Share a practical lesson, wholesale milestone, supplier question, or B2B offer with Canadian founders..." : KINDS[kind].prompt}
                className="w-full p-3 rounded-xl bg-[#F5F5F6]/60 border border-[#E5E5E8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 text-[0.875rem] text-zinc-900 placeholder-zinc-400 resize-none leading-relaxed"
              />

              {photo.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{photo.error}</p>}
              {photo.preview && (
                <div className="relative rounded-xl overflow-hidden border border-[#E5E5E8] bg-zinc-100">
                  <img src={photo.preview} alt="Selected image" className={cx("w-full max-h-[22.5rem] object-cover", photo.busy && "opacity-60")} />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => {
                      photo.clear();
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="absolute right-2 top-2 rounded-full bg-zinc-900/70 p-1.5 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <ComposerOptions key={state.ok ?? 0} onBusy={setOptionsBusy} rules={rules} />
              {state.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.error}</p>}

              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-[#F5F5F6] transition-colors">
                  <ImagePlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>{photo.busy ? "Uploading…" : photo.preview ? "Change photo" : "Add photo"}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className={cx("hidden sm:inline text-[0.75rem]", count > 4800 ? "text-rose-600" : "text-zinc-400")}>{count}/5000</span>
                  <button type="button" onClick={collapse} className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:bg-[#F5F5F6]">
                    Cancel
                  </button>
                  <PublishButton disabled={photo.busy || optionsBusy} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#F5F5F6] grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button type="button" onClick={() => expand(undefined, true)} className={QUICK}>
          <ImagePlus className="w-3.5 h-3.5 text-blue-600" />
          <span>Photo</span>
        </button>
        <button type="button" onClick={() => expand("question")} className={QUICK}>
          <CircleHelp className="w-3.5 h-3.5 text-indigo-600" />
          <span>Ask a question</span>
        </button>
        <button type="button" onClick={() => expand("win")} className={QUICK}>
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Share a win</span>
        </button>
        <button type="button" onClick={() => expand("offer")} className={QUICK}>
          <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>Post an offer</span>
        </button>
      </div>
    </form>
  );
}

function ZipPublish({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending || disabled}>
      {pending ? "Posting…" : "Post"}
    </button>
  );
}

function PublishButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-60">
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      Publish post
    </button>
  );
}

// ---------- post menu: copy link, report, delete ----------
export function PostMenu({ postId, canDelete, canReport, canEdit = false }: { postId: string; canDelete: boolean; canReport: boolean; canEdit?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "report" | "done" | "copied">("menu");
  const [gone, setGone] = useState(false);
  const row = "";

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setStep("menu");
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  if (gone) return null;
  return (
    <div className="menuwrap" onClick={(e) => e.stopPropagation()} role="presentation">
      <button type="button" aria-label="Post options" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="iconbtn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (
        <div className="menu">
          {step === "menu" && (
            <>
              <button
                type="button"
                className={row}
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`).catch(() => {});
                  setStep("copied");
                }}
              >
                Copy link to post
              </button>
              <button type="button" className={row} onClick={() => router.push(`/messages?text=${encodeURIComponent(`${window.location.origin}/posts/${postId}`)}`)}>
                Send in a message
              </button>
              {canEdit && (
                <button
                  type="button"
                  className={row}
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent("zip:edit-post", { detail: postId }));
                  }}
                >
                  Edit post
                </button>
              )}
              {canReport && (
                <button type="button" className={row} onClick={() => setStep("report")}>
                  Report post
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  style={{ color: "var(--err, #B91C1C)" }}
                  onClick={() => {
                    setGone(true);
                    document.getElementById(`post-${postId}`)?.classList.add("hidden");
                    deletePost(postId).then(() => router.refresh()).catch(() => {
                      setGone(false);
                      document.getElementById(`post-${postId}`)?.classList.remove("hidden");
                    });
                  }}
                >
                  Delete post
                </button>
              )}
            </>
          )}
          {step === "report" && (
            <>
              <p className="note"><strong>What is wrong with it?</strong></p>
              {["Spam", "Harassment", "Inappropriate", "Misinformation"].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={row}
                  onClick={() => {
                    setStep("done");
                    reportPost(postId, r.toLowerCase()).catch(() => {});
                  }}
                >
                  {r}
                </button>
              ))}
            </>
          )}
          {step === "done" && <p className="note">Reported. Our team will take a look.</p>}
          {step === "copied" && <p className="note">Link copied.</p>}
        </div>
      )}
    </div>
  );
}

// ---------- post actions (design: docs/design/feed.html) ----------
// One reaction per member, LinkedIn style. Stored kinds keep their database names:
// like = Helpful, love = Insightful, celebrate = Celebrate.
const REACTIONS: { kind: ReactionKind; emoji: string; label: string; on: string; color: string }[] = [
  { kind: "like", emoji: "👍", label: REACTION_LABEL.like, on: "bg-blue-50 text-blue-700 border-blue-200", color: "#2563EB" },
  { kind: "celebrate", emoji: "🎉", label: REACTION_LABEL.celebrate, on: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "#059669" },
  { kind: "support", emoji: "🤝", label: REACTION_LABEL.support, on: "bg-violet-50 text-violet-700 border-violet-200", color: "#7C3AED" },
  { kind: "love", emoji: "❤️", label: REACTION_LABEL.love, on: "bg-rose-50 text-rose-700 border-rose-200", color: "#E11D48" },
  { kind: "insight", emoji: "💡", label: REACTION_LABEL.insight, on: "bg-amber-50 text-amber-800 border-amber-200", color: "#B45309" },
  { kind: "funny", emoji: "😄", label: REACTION_LABEL.funny, on: "bg-orange-50 text-orange-700 border-orange-200", color: "#C2410C" },
];
const ICON_CLASS: Record<ReactionKind, string> = { like: "react-like", celebrate: "react-celebrate", support: "react-like", love: "react-like", insight: "react-love", funny: "react-like" };

/**
 * One reaction pill. Turning a reaction on plays that emotion's own moment: the thumb nods and
 * small thumbs float up (Helpful), the bulb lights up and throws sparkles (Insightful), the popper
 * shakes and fires confetti (Celebrate). The count rolls to its new value. Turning it off just
 * settles. Phones that support it get a tiny tap of vibration. Reduced-motion settings skip it all.
 */
const CONFETTI = ["#2563EB", "#E11D48", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];
type Particle = { id: number; dx: number; dy: number; r: number; delay: number; content: string; color?: string; size: number };

function burstFor(kind: ReactionKind, seed: number): Particle[] {
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  if (kind === "celebrate") {
    // confetti fans up and out, then drifts down
    return Array.from({ length: 14 }, (_, i) => {
      const angle = rand(-160, -20) * (Math.PI / 180);
      const dist = rand(26, 54);
      return { id: seed * 100 + i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist + rand(4, 14), r: rand(-260, 260), delay: rand(0, 60), content: "", color: CONFETTI[i % CONFETTI.length], size: rand(4, 6.5) };
    });
  }
  if (kind === "insight") {
    // sparkles ring out around the bulb
    return Array.from({ length: 7 }, (_, i) => {
      const angle = ((i / 7) * 360 - 90 + rand(-12, 12)) * (Math.PI / 180);
      const dist = rand(18, 30);
      return { id: seed * 100 + i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, r: rand(-40, 40), delay: rand(0, 90), content: i % 2 ? "✨" : "✦", color: "#F59E0B", size: i % 2 ? 11 : 9 };
    });
  }
  // little thumbs float up in a loose column
  return Array.from({ length: 6 }, (_, i) => ({ id: seed * 100 + i, dx: (i - 2.5) * 9 + rand(-5, 5), dy: rand(-60, -36), r: rand(-30, 30), delay: i * 60, content: "@icon", size: rand(12, 16) }));
}

function ReactionButton({
  reaction,
  active,
  count,
  onToggle,
  pick = false,
  main = false,
}: {
  reaction: (typeof REACTIONS)[number];
  active: boolean;
  count: number;
  onToggle: () => void;
  /** in the reaction picker: the icon alone, no count */
  pick?: boolean;
  /** the post's React button: an outline thumb until you react, then your reaction's badge; the count is the total */
  main?: boolean;
}) {
  const { kind, label, color } = reaction;
  const [play, setPlay] = useState<{ n: number; on: boolean } | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const seed = useRef(0);

  const click = () => {
    const turningOn = !active;
    onToggle();
    const n = ++seed.current;
    setPlay({ n, on: turningOn });
    if (!turningOn || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      navigator.vibrate?.(12);
    } catch {}
    const burst = burstFor(kind, n);
    setParticles((p) => [...p, ...burst]);
    setTimeout(() => setParticles((p) => p.filter((x) => !burst.includes(x))), 1100);
  };

  const iconAnim = play ? (play.on ? ICON_CLASS[kind] : "react-off") : "";
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={active}
      aria-label={pick ? label : main ? (active ? `Remove your ${label} reaction, ${count} reactions` : `Like, ${count} reactions`) : `${label}, ${count}`}
      title={main ? (active ? label : "Like") : label}
      className={pick ? "rx3 rxpick" : main ? "rx3 rxmain" : "rx3"}
      style={{ "--rxc": color } as React.CSSProperties}
    >
      <span className="relative inline-flex">
        {kind === "insight" && play?.on && <span key={`g${play.n}`} aria-hidden="true" className="react-glow pointer-events-none absolute -inset-2 rounded-full" />}
        {kind === "celebrate" && play?.on && <span key={`r${play.n}`} aria-hidden="true" className="react-ring pointer-events-none absolute -inset-1.5 rounded-full border-2 border-emerald-400" />}
        <span key={play ? `i${play.n}` : "i"} aria-hidden="true" className={cx("relative inline-flex", iconAnim)}>
          {main ? (active ? <RxGlyph kind={kind} size={17} /> : <Ic n="thumb" s={17} />) : <RxIcon kind={kind} size={pick ? 36 : active ? 24 : 21} />}
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-20">
          {particles.map((p) => (
            <span
              key={p.id}
              className={cx("react-particle absolute -translate-x-1/2 -translate-y-1/2", kind === "celebrate" ? "rounded-[0.0938rem]" : "leading-none")}
              style={
                {
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                  "--r": `${p.r}deg`,
                  animationDelay: `${p.delay}ms`,
                  animationDuration: kind === "celebrate" ? "900ms" : kind === "insight" ? "700ms" : "950ms",
                  width: p.content ? undefined : p.size,
                  height: p.content ? undefined : p.size * 0.6,
                  background: p.content ? undefined : p.color,
                  color: p.content ? p.color : undefined,
                  fontSize: p.content && p.content !== "@icon" ? p.size : undefined,
                } as React.CSSProperties
              }
            >
              {p.content === "@icon" ? <RxIcon kind={kind} size={Math.round(p.size)} ring={false} /> : p.content}
            </span>
          ))}
        </span>
      </span>
      {!pick && (
        <span key={`c${count}`} className={cx("rxn tabular-nums inline-block", play && "react-count")}>
          {count}
        </span>
      )}
    </button>
  );
}


/**
 * The React button and its picker (LinkedIn style). A tap or click likes the post, or removes your reaction. Resting the
 * pointer on it for a moment, or a long press on a touch screen, opens all six reactions in a floating row; the picked
 * reaction plays its animation there before the row closes. Escape or a click elsewhere closes it.
 */
function ReactionPicker({ mine, total, onPick }: { mine: ReactionKind | null; total: number; onPick: (k: ReactionKind) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const pressed = useRef(false);
  const later = (fn: () => void, ms: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(fn, ms); };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const current = REACTIONS.find((r) => r.kind === (mine ?? "like"))!;
  return (
    <div
      ref={wrap}
      className="rxadd"
      onMouseEnter={() => later(() => setOpen(true), 450)}
      onMouseLeave={() => later(() => setOpen(false), 320)}
      onPointerDown={(e) => { if (e.pointerType !== "mouse") { pressed.current = false; later(() => { pressed.current = true; setOpen(true); }, 450); } }}
      onPointerUp={(e) => { if (e.pointerType !== "mouse" && !pressed.current) window.clearTimeout(timer.current); }}
      onClickCapture={(e) => { if (pressed.current) { pressed.current = false; if (!(e.target as Element).closest(".rxtray")) { e.preventDefault(); e.stopPropagation(); } } }}
      onContextMenu={(e) => { if (open) e.preventDefault(); }}
    >
      <ReactionButton reaction={current} main active={!!mine} count={total} onToggle={() => { window.clearTimeout(timer.current); setOpen(false); onPick(mine ?? "like"); }} />
      {open && (
        <div className="rxtray" role="group" aria-label="Choose a reaction">
          {REACTIONS.map((r) => (
            <ReactionButton key={r.kind} reaction={r} pick active={mine === r.kind} count={0} onToggle={() => { onPick(r.kind); later(() => setOpen(false), 650); }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PostActions({
  postId,
  comments,
  counts,
  myReaction,
  reposts,
  reposted,
  me,
  isStaff,
  startOpen = false,
  commentsClosed = false,
  rules,
  canQuote = false,
}: {
  postId: string;
  /** shows the Quote icon; it opens the quote form under the post (QuoteButton in post-extras) */
  canQuote?: boolean;
  commentsClosed?: boolean;
  rules?: import("@/lib/zip/settings-load").PostRules;
  likes?: number;
  comments: number;
  counts: Partial<Record<ReactionKind, number>>;
  kinds?: ReactionKind[];
  myReaction: ReactionKind | null;
  reposts: number;
  reposted: boolean;
  me: (Pick<Profile, "id" | "full_name" | "avatar_url"> & { headline?: string | null }) | null;
  isStaff: boolean;
  startOpen?: boolean;
}) {
  const router = useRouter();
  const [mine, setMine] = useState(myReaction);
  const [tally, setTally] = useState(counts);
  const [didRepost, setDidRepost] = useState(reposted);
  const [repostCount, setRepostCount] = useState(reposts);
  const [open, setOpen] = useState(startOpen);
  const [list, setList] = useState<CommentRow[] | null>(null);
  const [commentCount, setCommentCount] = useState(comments);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (open && list === null) loadComments(postId).then(setList);
  }, [open, list, postId]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2500);
    return () => clearTimeout(t);
  }, [note]);

  const needAccount = () => {
    if (me) return false;
    router.push("/auth/login");
    return true;
  };

  const bump = (t: typeof tally, kind: ReactionKind | null, by: number) => (kind ? { ...t, [kind]: Math.max(0, (t[kind] ?? 0) + by) } : t);

  // change the screen first, save after, step back if the save fails
  const react = (kind: ReactionKind) => {
    if (needAccount()) return;
    const was = mine;
    const next = was === kind ? null : kind;
    setMine(next);
    setTally((t) => bump(bump(t, was, -1), next, 1));
    setReaction(postId, next).catch(() => {
      setMine(was);
      setTally((t) => bump(bump(t, next, -1), was, 1));
      setNote("Could not save your reaction. Try again.");
    });
  };

  const repost = () => {
    if (needAccount()) return;
    const was = didRepost;
    setDidRepost(!was);
    setRepostCount((n) => n + (was ? -1 : 1));
    setNote(was ? "Repost removed" : "Shared to your network");
    toggleRepost(postId, was).catch(() => {
      setDidRepost(was);
      setRepostCount((n) => n + (was ? 1 : -1));
      setNote("Could not save your repost. Try again.");
    });
  };

  return (
    <>
      <div className="acts rxrow">
        {/* LinkedIn style: React (with the total), comment, repost, quote, send; the reactions used stack on the right */}
        <ReactionPicker mine={mine} total={REACTIONS.reduce((n, r) => n + (tally[r.kind] ?? 0), 0)} onPick={(k) => react(k)} />
        {rules?.comments !== false && <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Comments, ${commentCount}`} className="act plain">
          <Ic n="msg" s={17} />
          {commentCount}
        </button>}
        {rules?.share !== false && <button
          type="button"
          onClick={repost}
          aria-pressed={didRepost}
          aria-label={didRepost ? "Remove repost" : "Repost"}
          title={didRepost ? "Remove repost" : "Repost"}
          className="act plain"
        >
          <Ic n="repost" s={17} />
          {repostCount}
        </button>}
        {canQuote && rules?.share !== false && (
          <button type="button" aria-label="Quote this post" title="Quote" className="act plain"
            onClick={() => { if (needAccount()) return; window.dispatchEvent(new CustomEvent("zip:quote", { detail: postId })); }}>
            <Ic n="quote" s={17} />
          </button>
        )}
        {rules?.share !== false && <button
          type="button"
          aria-label="Send in a message"
          title="Send in a message"
          onClick={() => {
            if (needAccount()) return;
            router.push(`/messages?text=${encodeURIComponent(`${window.location.origin}/posts/${postId}`)}`);
          }}
          className="act plain"
        >
          <Ic n="send" s={17} />
        </button>}
        <span className="spacer" style={{ flex: 1 }} />
        {note && (
          <span role="status" className="small" style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 999, padding: "4px 10px" }}>
            {note}
          </span>
        )}
        {(() => {
          const used = REACTIONS.filter((r) => (tally[r.kind] ?? 0) > 0).sort((x, y) => (tally[y.kind] ?? 0) - (tally[x.kind] ?? 0));
          if (!used.length) return null;
          const said = used.map((r) => `${r.label} ${tally[r.kind]}`).join(", ");
          return (
            <span className="rxstack" role="img" aria-label={`Reactions: ${said}`} title={said}>
              {used.slice(0, 3).map((r) => <RxIcon key={r.kind} kind={r.kind} size={20} />)}
            </span>
          );
        })()}
      </div>

      {open && rules?.comments !== false && (
        <div className="comments">
          <CommentThread
            postId={postId}
            me={me}
            isStaff={isStaff}
            closed={commentsClosed}
            list={list}
            setList={(fn) => setList(fn)}
            onCount={(by) => setCommentCount((n) => Math.max(0, n + by))}
            onNote={setNote}
            flat={rules?.flat}
            firstShown={rules?.cshow}
            more={rules?.cload}
          />
        </div>
      )}
    </>
  );
}

// ---------- profile form ----------
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});
  const photo = useImageUpload("avatar", profile.avatar_url);
  const fields = [
    { name: "full_name", label: "Full name", required: true, max: 80, hint: "" },
    { name: "headline", label: "Headline", required: false, max: 120, hint: "Founder, Maple Bakery" },
    { name: "location", label: "City and province", required: false, max: 80, hint: "Mississauga, ON" },
    { name: "website", label: "Website", required: false, max: 200, hint: "yourbusiness.ca" },
  ] as const;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <AvatarImg person={{ id: profile.id, full_name: profile.full_name, avatar_url: photo.preview }} size={72} />
        <label className={cx("press cursor-pointer rounded-xl border border-input bg-white px-4 py-2 text-sm font-semibold hover:bg-muted", photo.busy && "pointer-events-none opacity-60")}>
          {photo.busy ? "Uploading…" : "Change photo"}
          {/* no name: the file itself is never sent with the form, only the uploaded address below */}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => photo.pick(e.target.files?.[0])} />
        </label>
        <input type="hidden" name="avatar_url" value={photo.url} />
      </div>
      {photo.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{photo.error}</p>}
      {fields.map((f) => (
        <label key={f.name} className="grid gap-1.5 text-sm font-medium">
          {f.label}
          <input
            name={f.name}
            defaultValue={profile[f.name] ?? ""}
            required={f.required}
            maxLength={f.max}
            placeholder={f.hint}
            className="field font-normal"
          />
        </label>
      ))}
      <label className="grid gap-1.5 text-sm font-medium">
        About
        <textarea
          name="bio"
          rows={5}
          maxLength={2000}
          defaultValue={profile.bio ?? ""}
          placeholder="What does your business do, and what are you looking for here?"
          className="field font-normal"
        />
      </label>
      {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      <SubmitButton className="self-start" disabled={photo.busy}>
        Save profile
      </SubmitButton>
    </form>
  );
}

/** Story picture that falls back to the blue cover when there is no picture or it fails to load. */
export function Thumb({ src, className }: { src?: string; className: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`cover object-cover ${className}`} />
  ) : (
    <div aria-hidden="true" className={`cover ${className}`} />
  );
}
