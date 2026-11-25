"use client";
import { useInstant } from "@/lib/optimistic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleArticleMark } from "@/app/(hub)/actions";
import { Ic } from "@/components/zip/ic";

type Kind = "saved" | "helpful" | "insightful";

function useMark(item: string, kind: Kind, initial: boolean, signedIn: boolean) {
  const router = useRouter();
  const { value: on, set, tap } = useInstant(initial);
  const flip = () => {
    if (!signedIn) return router.push("/auth/sign-up");
    set(!on, () => toggleArticleMark(item, kind, !on));
  };
  return [on, flip, tap] as const;
}

export function SaveBtn({ item, saved, signedIn }: { item: string; saved: boolean; signedIn: boolean }) {
  const [on, flip, tap] = useMark(item, "saved", saved, signedIn);
  return (
    <button type="button" className={`act ${tap}`} aria-pressed={on} aria-label={on ? "Saved" : "Save for later"} onClick={flip}>
      <Ic n="bookmark" s={15} fill={on ? "currentColor" : "none"} />
      {on ? "Saved" : "Save"}
    </button>
  );
}

export function ReactBtn({ item, kind, mine, count, signedIn }: { item: string; kind: "helpful" | "insightful"; mine: boolean; count: number; signedIn: boolean }) {
  const [on, flip, tap] = useMark(item, kind, mine, signedIn);
  const n = count - (mine ? 1 : 0) + (on ? 1 : 0);
  return (
    <button type="button" className={`act ${tap}`} aria-pressed={on} onClick={flip}>
      <span aria-hidden="true">{kind === "helpful" ? "👍" : "💡"}</span>
      {kind === "helpful" ? "Helpful" : "Insightful"} {n}
    </button>
  );
}

export function ShareLink() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="act"
      onClick={() => {
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      <Ic n="send" s={15} />
      {done ? "Link copied" : "Share"}
    </button>
  );
}
