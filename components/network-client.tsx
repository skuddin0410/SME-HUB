"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Clock, MessageSquareText, UserPlus, X } from "lucide-react";
import { acceptConnection, removeConnection, requestConnection } from "@/app/(hub)/actions";
import type { Author, LinkState } from "@/lib/hub";
import { MEMBER_LABEL } from "@/lib/demo";
import { AvatarImg, Cover } from "@/components/hub-client";
import { useReady } from "@/components/ready/provider";

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
  variant?: "pill" | "block" | "text" | "solid" | "quiet";
  onChange?: (state: LinkState) => void;
}) {
  const router = useRouter();
  const ready = useReady();
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
    "press inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all duration-150 [&_svg]:h-3.5 [&_svg]:w-3.5",
    variant === "block" ? "w-full px-4 py-2" : variant === "solid" ? "h-8 px-4" : "px-3 py-1.5",
  );
  // "solid" is the main button on a profile; "quiet" is the grey pill in "More profiles for you"
  const connect =
    variant === "solid"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : variant === "quiet"
        ? "bg-[#F5F5F6] text-zinc-800 hover:bg-zinc-900 hover:text-white"
        : null;
  const outline = variant === "text" ? "text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100" : "border border-blue-200 text-blue-600 bg-white hover:bg-blue-50";
  const quiet = variant === "text" ? "text-zinc-500 hover:bg-[#F5F5F6]" : "border border-[#E5E5E8] text-zinc-600 bg-white hover:bg-[#F5F5F6]";

  if (state === "connected") {
    if (variant === "text") return <span className={cx(base, "bg-emerald-50 text-emerald-700 border border-emerald-200")}>Connected ✓</span>;
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
        <button type="button" onClick={() => go("none", () => removeConnection(otherId))} className={cx(base, "text-zinc-600 hover:bg-[#F5F5F6]", variant === "block" && "!w-auto flex-1")}>
          Ignore
        </button>
        <button type="button" onClick={() => go("connected", () => acceptConnection(otherId))} className={cx(base, variant === "solid" ? connect : outline, variant === "block" && "!w-auto flex-1")}>
          <Check className="h-4 w-4" />
          Accept
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => { const run = () => go("sent", () => requestConnection(otherId)); if (ready) ready.gate("connect", run); else run(); }} className={cx(base, connect ?? outline)}>
      {variant === "text" ? "+ Connect" : (
        <>
          <UserPlus className="h-4 w-4" />
          Connect
        </>
      )}
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
  degree,
  onDismiss,
}: {
  person: Person;
  link: LinkState;
  signedIn: boolean;
  note?: string;
  /** 1 = connected, 2 = shares a connection, 3 = further */
  degree?: 1 | 2 | 3;
  onDismiss?: () => void;
}) {
  return (
    <div className="panel group relative flex animate-rise flex-col overflow-hidden text-center transition-shadow duration-200 hover:shadow-lg">
      <Cover seed={person.id} className="h-[3.875rem]" />
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
      <Link href={`/members/${person.id}`} className="relative mx-auto -mt-[3.125rem] rounded-full ring-2 ring-white">
        <AvatarImg person={person} size={104} />
      </Link>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
        <Link href={`/members/${person.id}`} className="text-base font-semibold leading-tight hover:underline">
          {person.full_name || "Member"}
          {degree && <span className="text-xs font-normal text-muted-foreground"> · {degree === 1 ? "1st" : degree === 2 ? "2nd" : "3rd+"}</span>}
        </Link>
        <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted-foreground">{person.headline || "SME Hub member"}</p>
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
              <span className="block truncate text-xs text-muted-foreground">{p.headline || "SME Hub member"}</span>
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
