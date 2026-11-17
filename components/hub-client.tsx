"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Flag, Heart, ImagePlus, Loader2, MessageCircle, Send, Share2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addComment,
  createPost,
  deleteComment,
  loadComments,
  reportPost,
  toggleLike,
  updateProfile,
  type FormState,
} from "@/app/(hub)/actions";
import type { CommentRow, Profile } from "@/lib/hub";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function AvatarImg({
  person,
  size = 40,
}: {
  person: { full_name: string; avatar_url: string | null };
  size?: number;
}) {
  const style = { width: size, height: size };
  return person.avatar_url ? (
    <img src={person.avatar_url} alt="" style={style} className="shrink-0 rounded-full object-cover ring-1 ring-black/5" />
  ) : (
    <span
      style={{ ...style, fontSize: size * 0.4, background: "hsl(var(--ink))" }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    >
      {(person.full_name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

/** CanadianSME logo, with a text wordmark if the image cannot load. */
export function BrandLogo({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [broken, setBroken] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // the image can fail before the page becomes interactive, so check once on mount too
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setBroken(true);
  }, []);
  const src =
    tone === "light"
      ? "https://canadiansme.ca/assets/canadiansme-logo-light.webp"
      : "https://canadiansme.ca/assets/canadiansme-logo-520.webp";
  return (
    <Link href="/feed" className="flex items-center gap-2.5" aria-label="CanadianSME Hub home">
      {broken ? (
        <span className={cx("font-display text-lg font-bold", tone === "light" ? "text-white" : "text-foreground")}>
          Canadian<span className="text-primary">SME</span>
        </span>
      ) : (
        <img ref={img} src={src} alt="CanadianSME" className="h-7 w-auto" onError={() => setBroken(true)} />
      )}
      <span
        className={cx(
          "rounded-md px-1.5 py-0.5 text-xs font-semibold",
          tone === "light" ? "bg-white/15 text-white" : "bg-foreground text-white",
        )}
      >
        Hub
      </span>
    </Link>
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
      active ? "border-primary text-white" : "border-transparent text-white/60 hover:text-white",
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
          <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-white">
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
    dark: "bg-foreground text-white hover:bg-foreground/90",
    outline: "border border-input bg-white hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "border border-primary/30 text-primary hover:bg-primary/5",
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
  me: Pick<Profile, "full_name" | "avatar_url"> | null;
  groupId?: string;
  placeholder?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(createPost, {});
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPreview(null);
      setCount(0);
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
          <Link href="/auth/sign-up" className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
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
    <form ref={formRef} action={action} className="panel p-4">
      {groupId && <input type="hidden" name="group_id" value={groupId} />}
      <div className="flex gap-3">
        <AvatarImg person={me} size={44} />
        <textarea
          name="body"
          required
          maxLength={5000}
          rows={open ? 4 : 1}
          onFocus={() => setOpen(true)}
          onChange={(e) => setCount(e.target.value.length)}
          placeholder={placeholder ?? "Share an update with other owners"}
          className="field resize-none !rounded-2xl transition-all duration-200"
        />
      </div>

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
      {state.error && <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">{state.error}</p>}

      <div className={cx("mt-3 flex flex-wrap items-center justify-between gap-2", !open && "hidden")}>
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
          <span className={cx("text-xs", count > 4800 ? "text-primary" : "text-muted-foreground")}>{count}/5000</span>
          <SubmitButton>Post</SubmitButton>
        </div>
      </div>
    </form>
  );
}

// ---------- post actions: like, comment, share, report ----------
export function PostActions({
  postId,
  likes,
  comments,
  likedByMe,
  me,
  isStaff,
  ownPost,
  startOpen = false,
}: {
  postId: string;
  likes: number;
  comments: number;
  likedByMe: boolean;
  me: (Pick<Profile, "id" | "full_name" | "avatar_url">) | null;
  isStaff: boolean;
  ownPost: boolean;
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
  const [reporting, setReporting] = useState(false);
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

  const report = (reason: string) => {
    setReporting(false);
    reportPost(postId, reason)
      .then(() => setNote("Reported. Our moderators will take a look."))
      .catch(() => setNote("Could not send the report. Try again."));
  };

  const actionClass =
    "press inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className="border-t px-2 pb-2 pt-1">
      <div className="flex items-center gap-1">
        <button type="button" onClick={like} aria-pressed={liked} className={cx(actionClass, liked && "!text-primary")}>
          <Heart key={popKey} className={cx("h-[18px] w-[18px]", liked && "fill-primary", popKey > 0 && liked && "animate-pop")} />
          {likeCount > 0 ? likeCount : "Like"}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={actionClass}>
          <MessageCircle className="h-[18px] w-[18px]" />
          {commentCount > 0 ? commentCount : "Comment"}
        </button>
        <button type="button" onClick={share} className={actionClass}>
          <Share2 className="h-[18px] w-[18px]" />
          Share
        </button>
        {!ownPost && me && (
          <button type="button" onClick={() => setReporting((r) => !r)} className={cx(actionClass, "ml-auto")} aria-label="Report post">
            <Flag className="h-4 w-4" />
          </button>
        )}
        {note && (
          <span role="status" className="ml-auto animate-rise rounded-full bg-foreground px-3 py-1 text-xs font-medium text-white">
            {note}
          </span>
        )}
      </div>

      {reporting && (
        <div className="mx-2 mb-2 flex animate-rise flex-wrap items-center gap-2 rounded-xl bg-muted p-3 text-sm">
          <span className="font-medium">What is wrong with this post?</span>
          {["Spam", "Harassment", "Inappropriate", "Misinformation"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => report(r.toLowerCase())}
              className="press rounded-full border bg-white px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="animate-rise space-y-3 px-2 pb-2 pt-2">
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
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-primary focus:opacity-100 group-hover:opacity-100"
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
        <AvatarImg person={{ full_name: profile.full_name, avatar_url: preview }} size={72} />
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
      {state.error && <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">{state.error}</p>}
      <SubmitButton className="self-start">Save profile</SubmitButton>
    </form>
  );
}
