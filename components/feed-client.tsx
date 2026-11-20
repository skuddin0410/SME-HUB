"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark } from "lucide-react";
import { joinGroup, leaveGroup, toggleSave } from "@/app/(hub)/actions";
import { COMPOSE_EVENT } from "@/components/site-nav";

/** Opens the composer on the feed, or goes to the feed with it open. */
export function ComposeLink({ className, kind = "update", children }: { className?: string; kind?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (pathname === "/feed") {
          window.dispatchEvent(new CustomEvent(COMPOSE_EVENT, { detail: kind }));
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else router.push(`/feed?compose=${kind}`);
      }}
    >
      {children}
    </button>
  );
}

/** Join / Joined ✓ in the right rail. Shows the new state at once and steps back if saving fails. */
export function JoinGroupButton({ groupId, initial, signedIn }: { groupId: string; initial: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [joined, setJoined] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!signedIn) return router.push("/auth/login");
        const was = joined;
        setJoined(!was);
        setBusy(true);
        try {
          await (was ? leaveGroup(groupId) : joinGroup(groupId));
        } catch {
          setJoined(was);
        } finally {
          setBusy(false);
        }
      }}
      className={
        "shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " +
        (joined ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[#F4F2EE] hover:bg-zinc-900 text-zinc-700 hover:text-white")
      }
    >
      {joined ? "Joined ✓" : "Join"}
    </button>
  );
}

/** Bookmark toggle on a post. */
export function SaveButton({ postId, initial, signedIn }: { postId: string; initial: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  return (
    <button
      type="button"
      title={saved ? "Remove bookmark" : "Bookmark post"}
      aria-label={saved ? "Remove bookmark" : "Bookmark post"}
      aria-pressed={saved}
      onClick={() => {
        if (!signedIn) return router.push("/auth/login");
        const was = saved;
        setSaved(!was);
        toggleSave(postId, was).catch(() => setSaved(was));
      }}
      className="p-1.5 rounded-lg hover:bg-[#F4F2EE] text-zinc-400 hover:text-zinc-800 transition-colors"
    >
      <Bookmark className={"w-4 h-4" + (saved ? " fill-zinc-900 text-zinc-900" : "")} />
    </button>
  );
}
