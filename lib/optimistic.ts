"use client";

import { useRef, useState } from "react";
import { toast } from "@/components/toast";

/** A save failed when the action threw or answered { error }. */
const failed = (r: unknown) => !!r && typeof r === "object" && "error" in r && !!(r as { error?: unknown }).error;

/**
 * Motion plan, phase 1 ("instant actions"): the screen changes the moment the member taps, the save runs in the
 * background, and if it fails the change is undone with a short message. Quick double taps are safe: only the
 * newest tap's outcome can undo anything.
 */
export function useInstant<T>(initial: T, fail = "That didn’t save. Check your connection and try again.") {
  const [value, setValue] = useState(initial);
  const [pop, setPop] = useState(0);
  const turn = useRef(0);
  const set = (next: T, save: () => Promise<unknown>) => {
    const before = value;
    const mine = ++turn.current;
    setValue(next);
    setPop((n) => n + 1);
    save()
      .then((r) => { if (failed(r) && mine === turn.current) { setValue(before); toast(String((r as { error: unknown }).error) || fail); } })
      .catch(() => { if (mine === turn.current) { setValue(before); toast(fail); } });
  };
  /** Class for the small pop on the button that was just pressed (none on first paint; two names so each tap replays it). */
  const tap = pop ? (pop % 2 ? "ztap" : "ztap2") : "";
  return { value, set, tap, pop };
}
