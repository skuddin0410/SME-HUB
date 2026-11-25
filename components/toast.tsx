"use client";

import { useEffect, useState } from "react";

/**
 * Motion plan, phase 1: one toast for the whole Hub, in the zip's style (.toast). Any part of the site calls
 * toast("...") (for example when an instant change could not be saved and has been undone).
 */
const EVENT = "hub:toast";
export function toast(text: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: text }));
}

export function ToastHost() {
  const [msg, setMsg] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setMsg((m) => ({ text: (e as CustomEvent<string>).detail, n: (m?.n ?? 0) + 1 }));
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <div className="zip" style={{ display: "contents" }}>
      <div aria-live="polite" className="sr">{msg?.text}</div>
      {msg && <div key={msg.n} className="toast" data-hub-toast="">{msg.text}</div>}
    </div>
  );
}
