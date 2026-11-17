"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Clock, MessageSquareText, Plus, UserPlus, X } from "lucide-react";
import { acceptConnection, removeConnection, requestConnection } from "@/app/(hub)/actions";
import type { Author, LinkState } from "@/lib/hub";
import { MEMBER_LABEL } from "@/lib/demo";
import { AvatarImg, Cover } from "@/components/hub-client";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/**
 * Connect / Pending / Accept / Message. The button changes the moment it is pressed;
 * the save happens in the background and the button steps back if the save fails.
 */
export function ConnectButton({
  otherId,
  initial,
  signedIn,
  variant = "pill",
  onChange,
}: {
  otherId: string;
  initial: LinkState;
  signedIn: boolean;
  variant?: "pill" | "block" | "text";
  onChange?: (state: LinkState) => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<LinkState>(initial);

  const go = (next: LinkState, save: () => Promise<unknown>) => {
    if (!signedIn) return router.push("/auth/login");
    const before = state;
    setState(next);
    onChange?.(next);
    save().catch(() => {
      setState(before);
      onChange?.(before);
    });
  };

  const base = cx(
    "press inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors duration-150",
    variant === "block" ? "w-full px-4 py-1.5" : variant === "pill" ? "px-4 py-1.5" : "px-2 py-1",
  );
  const outline = variant === "text" ? "text-primary hover:bg-primary/10" : "border border-primary text-primary hover:bg-primary/10 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary))]";
  const quiet = variant === "text" ? "text-muted-foreground hover:bg-muted" : "border border-foreground/40 text-muted-foreground hover:bg-muted hover:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.4)]";

  if (state === "connected") {
    if (variant === "text") return null;
    return (
      <Link href={`/messages?with=${otherId}`} className={cx(base, outline)}>
        <MessageSquareText className="h-4 w-4" />
        Message
      </Link>
    );
  }
  if (state === "sent") {
    return (
      <button type="button" title="Withdraw request" onClick={() => go("none", () => removeConnection(otherId))} className={cx(base, quiet)}>
        <Clock className="h-4 w-4" />
        Pending
      </button>
    );
  }
  if (state === "received" && variant === "text") {
    return (
      <button type="button" onClick={() => go("connected", () => acceptConnection(otherId))} className={cx(base, outline)}>
        <Check className="h-4 w-4" />
        Accept
      </button>
    );
  }
  if (state === "received") {
    return (
      <span className={cx("inline-flex gap-2", variant === "block" && "w-full")}>
        <button type="button" onClick={() => go("none", () => removeConnection(otherId))} className={cx(base, "text-muted-foreground hover:bg-muted", variant === "block" && "!w-auto flex-1")}>
          Ignore
        </button>
        <button type="button" onClick={() => go("connected", () => acceptConnection(otherId))} className={cx(base, outline, variant === "block" && "!w-auto flex-1")}>
          <Check className="h-4 w-4" />
          Accept
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => go("sent", () => requestConnection(otherId))} className={cx(base, outline)}>
      {variant === "text" ? <Plus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      Connect
    </button>
  );
}

export type Person = Author & { location?: string };

/** Member card: cover, large photo, name, headline, connect. */
export function PersonCard({
  person,
  link,
  signedIn,
  note,
  onDismiss,
}: {
  person: Person;
  link: LinkState;
  signedIn: boolean;
  note?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="panel group relative flex animate-rise flex-col overflow-hidden text-center transition-shadow duration-200 hover:shadow-lg">
      <Cover seed={person.id} className="h-[62px]" />
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${person.full_name}`}
          className="press absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <Link href={`/members/${person.id}`} className="relative mx-auto -mt-[50px] rounded-full ring-2 ring-white">
        <AvatarImg person={person} size={104} />
      </Link>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
        <Link href={`/members/${person.id}`} className="text-base font-semibold leading-tight hover:underline">
          {person.full_name || "Member"}
        </Link>
        <p className="mt-0.5 line-clamp-2 min-h-[40px] text-sm leading-5 text-muted-foreground">{person.headline || "SMB Hub member"}</p>
        <p className="mb-2 mt-auto pt-2 text-xs text-muted-foreground">
          {note ?? (person.member_type !== "owner" ? MEMBER_LABEL[person.member_type] : person.location || " ")}
        </p>
        <ConnectButton otherId={person.id} initial={link} signedIn={signedIn} variant="block" />
      </div>
    </div>
  );
}

/** Invitations waiting for an answer. Each row leaves the list the moment it is answered. */
export function Invitations({ people }: { people: Person[] }) {
  const [answered, setAnswered] = useState<Record<string, "connected" | "none">>({});
  const open = people.filter((p) => !answered[p.id]);
  const accepted = people.filter((p) => answered[p.id] === "connected");

  return (
    <section className="panel">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-base font-semibold">{open.length ? `Invitations (${open.length})` : "No pending invitations"}</h2>
      </div>
      {open.map((p) => (
        <div key={p.id} className="flex animate-rise flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <Link href={`/members/${p.id}`} className="flex min-w-0 items-center gap-3">
            <AvatarImg person={p} size={56} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold hover:underline">{p.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.headline || "SMB Hub member"}</span>
            </span>
          </Link>
          <ConnectButton otherId={p.id} initial="received" signedIn onChange={(s) => setAnswered((a) => ({ ...a, [p.id]: s === "connected" ? "connected" : "none" }))} />
        </div>
      ))}
      {accepted.map((p) => (
        <p key={p.id} className="flex animate-rise items-center gap-2 border-t bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <Check className="h-4 w-4" />
          You and {p.full_name} are now connected.
          <Link href={`/messages?with=${p.id}`} className="ml-auto font-semibold hover:underline">
            Say hello
          </Link>
        </p>
      ))}
    </section>
  );
}

/** "People you may know" grid. Dismissed cards disappear at once and the next suggestion slides in. */
export function Suggestions({ title, people, signedIn, visible = 8 }: { title: string; people: Person[]; signedIn: boolean; visible?: number }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [all, setAll] = useState(false);
  const rest = people.filter((p) => !hidden.has(p.id));
  const shown = all ? rest : rest.slice(0, visible);
  if (rest.length === 0) return null;

  return (
    <section className="panel p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {rest.length > visible && (
          <button type="button" onClick={() => setAll((a) => !a)} className="press rounded px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
            {all ? "Show less" : "Show all"}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {shown.map((p) => (
          <PersonCard key={p.id} person={p} link="none" signedIn={signedIn} onDismiss={() => setHidden((h) => new Set(h).add(p.id))} />
        ))}
      </div>
    </section>
  );
}
