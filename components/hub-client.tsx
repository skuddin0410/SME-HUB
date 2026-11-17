"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { CircleHelp, Ellipsis, Flag, ImagePlus, Link2, Loader2, MessageCircle, Megaphone, Repeat2, Send, ThumbsUp, Trash2, Trophy, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  loadComments,
  reportPost,
  toggleLike,
  updateProfile,
  type FormState,
} from "@/app/(hub)/actions";
import type { CommentRow, Profile } from "@/lib/hub";
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
    <div className={cx("cover relative w-full overflow-hidden", className)}>
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

/** Long posts start folded so the feed stays scannable. */
export function PostBody({ text }: { text: string }) {
  const long = text.length > 420 || text.split("\n").length > 7;
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-2">
      <p className={cx("whitespace-pre-wrap break-words text-sm leading-5", long && !open && "line-clamp-5")}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-sm font-semibold text-primary hover:underline">
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

export function SignOutButton({ className, to = "/feed" }: { className?: string; to?: string }) {
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
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "primary" | "outline" | "ghost" | "danger" | "dark";
}) {
  const { pending } = useFormStatus();
  const tones = {
    primary: "bg-primary text-white hover:bg-primary/90",
    dark: "bg-[hsl(var(--ink))] text-white hover:opacity-90",
    outline: "border border-input bg-white hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "border border-rose-200 text-rose-600 hover:bg-rose-50",
  }[tone];
  return (
    <button
      type="submit"
      disabled={pending}
      className={cx(
        "press inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60",
        tones,
        className,
      )}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ---------- composer ----------
export function Composer({
  me,
  groupId,
  placeholder,
}: {
  me: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  groupId?: string;
  placeholder?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(createPost, {});
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [kind, setKind] = useState<Kind>("update");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPreview(null);
      setCount(0);
      setKind("update");
      setOpen(false);
    }
  }, [state.ok]);

  if (!me) {
    return (
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-display text-lg font-semibold">Have something to share?</p>
          <p className="text-sm text-muted-foreground">Join to post, comment and connect with other owners.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/auth/sign-up" className="press rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            Join free
          </Link>
          <Link href="/auth/login" className="press rounded-full border border-input bg-white px-4 py-2 text-sm font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="panel px-4 pb-1 pt-3">
      {groupId && <input type="hidden" name="group_id" value={groupId} />}
      <div className="flex gap-3">
        <AvatarImg person={me} size={48} />
        <textarea
          name="body"
          required
          maxLength={5000}
          rows={open ? 4 : 1}
          onFocus={() => setOpen(true)}
          onChange={(e) => setCount(e.target.value.length)}
          placeholder={!open ? (placeholder ?? "Start a post") : kind === "update" ? (placeholder ?? KINDS.update.prompt) : KINDS[kind].prompt}
          className={cx(
            "field resize-none transition-all duration-200",
            open ? "!rounded-xl" : "!rounded-full !py-3 font-semibold placeholder:text-foreground/60 hover:bg-muted",
          )}
        />
      </div>
      {!open && (
        <div className="mt-2 flex justify-around">
          {[
            { label: "Photo", icon: ImagePlus, tone: "text-sky-600", run: () => fileRef.current?.click() },
            { label: "Ask a question", icon: CircleHelp, tone: "text-blue-700", run: () => setKind("question") },
            { label: "Share a win", icon: Trophy, tone: "text-amber-600", run: () => setKind("win") },
            { label: "Post an offer", icon: Megaphone, tone: "text-emerald-600", run: () => setKind("offer") },
          ].map(({ label, icon: Icon, tone, run }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setOpen(true);
                run();
              }}
              className="press inline-flex items-center gap-2 rounded-md px-2 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              <Icon className={cx("h-5 w-5", tone)} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      <input type="hidden" name="kind" value={kind} />
      {open && (
        <div className="mt-3 flex animate-rise flex-wrap gap-1.5" role="radiogroup" aria-label="What are you sharing?">
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cx(
                "press rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                kind === k ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {KINDS[k].label}
            </button>
          ))}
        </div>
      )}
      {preview && (
        <div className="relative mt-3 animate-rise">
          <img src={preview} alt="Selected image" className="max-h-72 w-full rounded-xl object-cover" />
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => {
              setPreview(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {state.error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}

      <div className={cx("mb-2 mt-3 flex flex-wrap items-center justify-between gap-2", !open && "hidden")}>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            name="image"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ImagePlus className="h-4 w-4" />
            Photo
          </button>
          {!groupId && (
            <select
              name="visibility"
              defaultValue="public"
              aria-label="Who can see this post"
              className="rounded-full border border-input bg-white px-3 py-2 text-sm"
            >
              <option value="public">Anyone</option>
              <option value="members">Members only</option>
              <option value="connections">My connections</option>
              <option value="private">Only me</option>
            </select>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={cx("text-xs", count > 4800 ? "text-rose-600" : "text-muted-foreground")}>{count}/5000</span>
          <SubmitButton>Post</SubmitButton>
        </div>
      </div>
    </form>
  );
}

// ---------- post menu: copy link, report, delete ----------
export function PostMenu({ postId, canDelete, canReport }: { postId: string; canDelete: boolean; canReport: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "report" | "done" | "copied">("menu");
  const [gone, setGone] = useState(false);
  const row = "flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted";

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
      <button type="button" aria-label="Post options" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="press rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Ellipsis className="h-5 w-5" />
      </button>
      {open && (
        <div className="panel absolute right-0 z-20 mt-1 w-60 animate-rise p-1.5 shadow-xl">
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
          {step === "done" && <p className="px-3 py-3 text-sm">Reported. Our moderators will take a look.</p>}
          {step === "copied" && <p className="px-3 py-3 text-sm">Link copied.</p>}
        </div>
      )}
    </div>
  );
}

// ---------- post actions: like, comment, share, send ----------
export function PostActions({
  postId,
  likes,
  comments,
  likedByMe,
  me,
  isStaff,
  startOpen = false,
}: {
  postId: string;
  likes: number;
  comments: number;
  likedByMe: boolean;
  me: (Pick<Profile, "id" | "full_name" | "avatar_url">) | null;
  isStaff: boolean;
  startOpen?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(likedByMe);
  const [likeCount, setLikeCount] = useState(likes);
  const [popKey, setPopKey] = useState(0);
  const [open, setOpen] = useState(startOpen);
  const [list, setList] = useState<CommentRow[] | null>(null);
  const [commentCount, setCommentCount] = useState(comments);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

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

  const like = () => {
    if (needAccount()) return;
    const was = liked;
    setLiked(!was);
    setLikeCount((n) => n + (was ? -1 : 1));
    if (!was) setPopKey((k) => k + 1);
    toggleLike(postId, was).catch(() => {
      setLiked(was);
      setLikeCount((n) => n + (was ? 1 : -1));
      setNote("Could not save your like. Try again.");
    });
  };

  const send = () => {
    const body = draft.trim();
    if (!body || needAccount()) return;
    startTransition(async () => {
      try {
        const created = await addComment(postId, body);
        setList((l) => [...(l ?? []), created]);
        setCommentCount((n) => n + 1);
        setDraft("");
      } catch {
        setNote("Could not post your comment. Try again.");
      }
    });
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`);
      setNote("Link copied");
    } catch {
      setNote("Could not copy the link");
    }
  };

  const actionClass =
    "press inline-flex min-w-[40px] items-center justify-center gap-1.5 rounded px-2.5 py-2 text-sm text-foreground/75 transition-colors duration-100 hover:bg-muted hover:text-foreground";

  return (
    <div>
      <div className="flex items-center gap-1 px-2 py-1">
        <button type="button" onClick={like} aria-pressed={liked} aria-label="Like" className={cx(actionClass, liked && "!text-primary")}>
          <ThumbsUp key={popKey} className={cx("h-5 w-5", liked && "fill-primary/20", popKey > 0 && liked && "animate-pop")} />
          {likeCount > 0 && likeCount}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Comment" className={actionClass}>
          <MessageCircle className="h-5 w-5" />
          {commentCount > 0 && commentCount}
        </button>
        <button type="button" onClick={share} aria-label="Copy link to share" title="Copy link" className={actionClass}>
          <Repeat2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Send in a message"
          title="Send in a message"
          onClick={() => {
            if (needAccount()) return;
            router.push(`/messages?text=${encodeURIComponent(`${window.location.origin}/posts/${postId}`)}`);
          }}
          className={actionClass}
        >
          <Send className="h-5 w-5" />
        </button>
        {note && (
          <span role="status" className="ml-2 animate-rise rounded-full bg-[hsl(var(--ink))] px-3 py-1 text-xs font-medium text-white">
            {note}
          </span>
        )}
        {likeCount > 0 && (
          <span className="ml-auto mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary ring-2 ring-white" title={`${likeCount} likes`}>
            <ThumbsUp className="h-3 w-3 fill-white text-white" />
          </span>
        )}
      </div>

      {open && (
        <div className="animate-rise space-y-3 px-4 pb-3 pt-2">
          {list === null && (
            <div className="space-y-2">
              <div className="skeleton h-10 w-3/4" />
              <div className="skeleton h-10 w-1/2" />
            </div>
          )}
          {list?.map((c) => (
            <div key={c.id} className="group flex gap-2.5">
              <Link href={`/members/${c.author.id}`}>
                <AvatarImg person={c.author} size={32} />
              </Link>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-muted px-3.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/members/${c.author.id}`} className="truncate text-sm font-semibold hover:underline">
                    {c.author.full_name || "Member"}
                  </Link>
                  {(c.author.id === me?.id || isStaff) && (
                    <button
                      type="button"
                      aria-label="Delete comment"
                      onClick={() => {
                        setList((l) => (l ?? []).filter((x) => x.id !== c.id));
                        setCommentCount((n) => Math.max(0, n - 1));
                        deleteComment(c.id).catch(() => setNote("Could not delete the comment."));
                      }}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </div>
            </div>
          ))}
          {list?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>}

          {me ? (
            <div className="flex items-center gap-2.5">
              <AvatarImg person={me} size={32} />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                maxLength={2000}
                placeholder="Add a comment"
                aria-label="Add a comment"
                className="field !rounded-full !py-2"
              />
              <button
                type="button"
                onClick={send}
                disabled={busy || !draft.trim()}
                aria-label="Send comment"
                className="press rounded-full bg-primary p-2.5 text-white disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- profile form ----------
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});
  const [preview, setPreview] = useState<string | null>(profile.avatar_url);
  const fields = [
    { name: "full_name", label: "Full name", required: true, max: 80, hint: "" },
    { name: "headline", label: "Headline", required: false, max: 120, hint: "Founder, Maple Bakery" },
    { name: "location", label: "City and province", required: false, max: 80, hint: "Mississauga, ON" },
    { name: "website", label: "Website", required: false, max: 200, hint: "yourbusiness.ca" },
  ] as const;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <AvatarImg person={{ id: profile.id, full_name: profile.full_name, avatar_url: preview }} size={72} />
        <label className="press cursor-pointer rounded-full border border-input bg-white px-4 py-2 text-sm font-semibold hover:bg-muted">
          Change photo
          <input
            name="avatar"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
        </label>
      </div>
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
      <SubmitButton className="self-start">Save profile</SubmitButton>
    </form>
  );
}
