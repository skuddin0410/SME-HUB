"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleHelp, Ellipsis, Flag, ImagePlus, Link2, Loader2, MessageSquare, Megaphone, Repeat2, Send, Trash2, Trophy, X, Banknote, Bot, Factory, Ship, ShieldCheck, Store, UsersRound, MapPin, House } from "lucide-react";
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
export function PostBody({ text }: { text: string }) {
  const long = text.length > 420 || text.split("\n").length > 7;
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className={cx("text-[13.5px] text-zinc-900 leading-[1.6] whitespace-pre-line break-words", long && !open && "line-clamp-5")}>{text}</p>
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
      "relative flex h-14 min-w-[68px] flex-col items-center justify-center gap-0.5 border-b-2 px-2 text-[11px] font-medium transition-colors",
      active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
    ),
    bottom: cx(
      "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
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
          <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">
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
}: {
  me: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  /** published business pages this member may post as */
  businesses?: { id: string; name: string }[];
  groupId?: string;
  placeholder?: string;
  /** open on this post type straight away (for example from ?compose=win) */
  initialKind?: Kind;
}) {
  const [state, action] = useActionState<FormState, FormData>(createPost, {});
  const [open, setOpen] = useState(!!initialKind);
  const photo = useImageUpload("post");
  const clearPhoto = photo.clear;
  const [count, setCount] = useState(0);
  const [optionsBusy, setOptionsBusy] = useState(false);
  const [kind, setKind] = useState<Kind>(initialKind ?? "update");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const expand = (k?: Kind, pickPhoto = false) => {
    if (k) setKind(k);
    setOpen(true);
    setTimeout(() => (pickPhoto ? fileRef.current?.click() : textRef.current?.focus()), 30);
  };
  const collapse = () => {
    setOpen(false);
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
      setOpen(false);
    }
  }, [state.ok, clearPhoto]);

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
              className="w-full text-left px-4 py-2.5 rounded-xl bg-[#F5F5F6]/80 hover:bg-[#ECE9E2] border border-[#E5E5E8] text-xs sm:text-[13px] text-zinc-500 transition-colors"
            >
              {placeholder ?? "Start a post, ask a question, or share a win..."}
            </button>
          ) : (
            <div className="space-y-3 fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-500">Post tag:</span>
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
                className="w-full rounded-xl border border-[#E5E5E8] bg-[#F5F5F6]/60 p-2.5 text-[13px] font-semibold text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600"
              />
              <textarea
                ref={textRef}
                name="body"
                required
                maxLength={5000}
                rows={3}
                onChange={(e) => setCount(e.target.value.length)}
                placeholder={kind === "update" ? "Share a practical lesson, wholesale milestone, supplier question, or B2B offer with Canadian founders..." : KINDS[kind].prompt}
                className="w-full p-3 rounded-xl bg-[#F5F5F6]/60 border border-[#E5E5E8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 text-[13px] text-zinc-900 placeholder-zinc-400 resize-none leading-relaxed"
              />

              {photo.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{photo.error}</p>}
              {photo.preview && (
                <div className="relative rounded-xl overflow-hidden border border-[#E5E5E8] bg-zinc-100">
                  <img src={photo.preview} alt="Selected image" className={cx("w-full max-h-[360px] object-cover", photo.busy && "opacity-60")} />
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
              <ComposerOptions key={state.ok ?? 0} onBusy={setOptionsBusy} />
              {state.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.error}</p>}

              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-[#F5F5F6] transition-colors">
                  <ImagePlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>{photo.busy ? "Uploading…" : photo.preview ? "Change photo" : "Add photo"}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className={cx("hidden sm:inline text-[11px]", count > 4800 ? "text-rose-600" : "text-zinc-400")}>{count}/5000</span>
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
export function PostMenu({ postId, canDelete, canReport }: { postId: string; canDelete: boolean; canReport: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "report" | "done" | "copied">("menu");
  const [gone, setGone] = useState(false);
  const row = "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-zinc-800 transition-colors hover:bg-[#F5F5F6] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-zinc-400";

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
    <div className="relative" onClick={(e) => e.stopPropagation()} role="presentation">
      <button type="button" aria-label="Post options" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="p-1.5 rounded-lg text-zinc-400 transition-colors hover:bg-[#F5F5F6] hover:text-zinc-900">
        <Ellipsis className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-60 bg-white rounded-2xl border border-[#E5E5E8] shadow-popover p-2 fade-in">
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
                <Link2 className="h-4 w-4" /> Copy link to post
              </button>
              {canReport && (
                <button type="button" className={row} onClick={() => setStep("report")}>
                  <Flag className="h-4 w-4" /> Report post
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className={cx(row, "!text-rose-600")}
                  onClick={() => {
                    setGone(true);
                    document.getElementById(`post-${postId}`)?.classList.add("hidden");
                    deletePost(postId).then(() => router.refresh()).catch(() => {
                      setGone(false);
                      document.getElementById(`post-${postId}`)?.classList.remove("hidden");
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </button>
              )}
            </>
          )}
          {step === "report" && (
            <>
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">What is wrong with it?</p>
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
          {step === "done" && <p className="px-3 py-3 text-sm">Reported. Our team will take a look.</p>}
          {step === "copied" && <p className="px-3 py-3 text-sm">Link copied.</p>}
        </div>
      )}
    </div>
  );
}

// ---------- post actions (design: docs/design/feed.html) ----------
// One reaction per member, LinkedIn style. Stored kinds keep their database names:
// like = Helpful, love = Insightful, celebrate = Celebrate.
const REACTIONS: { kind: ReactionKind; emoji: string; label: string; on: string }[] = [
  { kind: "like", emoji: "👍", label: REACTION_LABEL.like, on: "bg-blue-50 text-blue-700 border-blue-200" },
  { kind: "celebrate", emoji: "🎉", label: REACTION_LABEL.celebrate, on: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { kind: "support", emoji: "🤝", label: REACTION_LABEL.support, on: "bg-violet-50 text-violet-700 border-violet-200" },
  { kind: "love", emoji: "❤️", label: REACTION_LABEL.love, on: "bg-rose-50 text-rose-700 border-rose-200" },
  { kind: "insight", emoji: "💡", label: REACTION_LABEL.insight, on: "bg-amber-50 text-amber-800 border-amber-200" },
  { kind: "funny", emoji: "😄", label: REACTION_LABEL.funny, on: "bg-orange-50 text-orange-700 border-orange-200" },
];
const BURST_EMOJI: Partial<Record<ReactionKind, string>> = { like: "👍", support: "🤝", love: "❤️", funny: "😄" };
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
  return Array.from({ length: 6 }, (_, i) => ({ id: seed * 100 + i, dx: (i - 2.5) * 9 + rand(-5, 5), dy: rand(-60, -36), r: rand(-30, 30), delay: i * 60, content: BURST_EMOJI[kind] ?? "👍", size: rand(10, 14) }));
}

function ReactionButton({
  reaction,
  active,
  count,
  onToggle,
}: {
  reaction: (typeof REACTIONS)[number];
  active: boolean;
  count: number;
  onToggle: () => void;
}) {
  const { kind, emoji, label, on } = reaction;
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
      aria-label={`${label}, ${count}`}
      className={cx(
        "relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-200 active:scale-95",
        active ? on : PILL_OFF,
      )}
    >
      <span className="relative inline-flex">
        {kind === "insight" && play?.on && <span key={`g${play.n}`} aria-hidden="true" className="react-glow pointer-events-none absolute -inset-2 rounded-full" />}
        {kind === "celebrate" && play?.on && <span key={`r${play.n}`} aria-hidden="true" className="react-ring pointer-events-none absolute -inset-1.5 rounded-full border-2 border-emerald-400" />}
        <span key={play ? `i${play.n}` : "i"} aria-hidden="true" className={cx("relative inline-block", iconAnim)}>
          {emoji}
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-20">
          {particles.map((p) => (
            <span
              key={p.id}
              className={cx("react-particle absolute -translate-x-1/2 -translate-y-1/2", kind === "celebrate" ? "rounded-[1.5px]" : "leading-none")}
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
                  fontSize: p.content ? p.size : undefined,
                } as React.CSSProperties
              }
            >
              {p.content}
            </span>
          ))}
        </span>
      </span>
      <span className="hidden sm:inline">{label}</span>
      <span key={`c${count}`} className={cx("font-semibold tabular-nums inline-block", play && "react-count")}>
        {count}
      </span>
    </button>
  );
}

const PILL_OFF = "bg-[#F5F5F6]/70 hover:bg-[#F5F5F6] text-zinc-600 border-transparent";
const ICON_ACTION = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-[#F5F5F6] transition-colors";

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
}: {
  postId: string;
  commentsClosed?: boolean;
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
      <div className="pt-3 border-t border-[#F5F5F6] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {REACTIONS.map((r) => (
            <ReactionButton key={r.kind} reaction={r} active={mine === r.kind} count={tally[r.kind] ?? 0} onToggle={() => react(r.kind)} />
          ))}
        </div>

        <div className="flex items-center gap-1">
          {note && (
            <span role="status" className="mr-1 fade-in rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white">
              {note}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
            }}
            aria-expanded={open}
            aria-label={`Comments, ${commentCount}`}
            className={ICON_ACTION}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{commentCount}</span>
          </button>
          <button
            type="button"
            onClick={repost}
            aria-pressed={didRepost}
            aria-label={didRepost ? "Remove repost" : "Repost"}
            title={didRepost ? "Remove repost" : "Repost"}
            className={cx(ICON_ACTION, didRepost && "!text-emerald-700")}
          >
            <Repeat2 className="w-3.5 h-3.5" />
            <span>{repostCount}</span>
          </button>
          <button
            type="button"
            aria-label="Send in a message"
            title="Send in a message"
            onClick={() => {
              if (needAccount()) return;
              router.push(`/messages?text=${encodeURIComponent(`${window.location.origin}/posts/${postId}`)}`);
            }}
            className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-[#F5F5F6] transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="pt-3 border-t border-[#F5F5F6] fade-in">
          <CommentThread
            postId={postId}
            me={me}
            isStaff={isStaff}
            closed={commentsClosed}
            list={list}
            setList={(fn) => setList(fn)}
            onCount={(by) => setCommentCount((n) => Math.max(0, n + by))}
            onNote={setNote}
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
