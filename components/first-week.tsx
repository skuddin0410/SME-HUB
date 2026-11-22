"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

export type WeekStep = { key: string; title: string; text: string; cta: string; href: string; done: boolean; soon?: boolean };

const KEY = "smbhub.firstweek.hidden";

/** "Your first week": a short checklist for new members. Steps tick themselves from real activity. */
export function FirstWeek({ steps }: { steps: WeekStep[] }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  const done = steps.filter((s) => s.done).length;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  if (hidden) return null;

  return (
    <section className="panel p-5" aria-labelledby="first-week-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[.06em] text-zinc-500">Your first week</p>
          <h2 id="first-week-title" className="mt-0.5 font-display text-[1.2188rem] font-bold text-zinc-900">
            Get started on SMB Hub
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[0.8125rem] text-zinc-500">
          <span>
            {done} of {steps.length} done
          </span>
          <button type="button" onClick={hide} aria-label="Hide this checklist" className="rounded-full p-1 hover:bg-[#F5F5F6]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F5F5F6]">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-2 divide-y divide-[#E5E5E8]">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-3 py-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${s.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#D4D4D8]"}`}
              aria-hidden
            >
              {s.done && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[0.9375rem] font-semibold ${s.done ? "text-zinc-500 line-through" : "text-zinc-900"}`}>{s.title}</span>
              <span className="block text-[0.8438rem] text-zinc-500">{s.text}</span>
            </span>
            {s.done ? (
              <span className="shrink-0 text-xs font-semibold text-emerald-700">Done</span>
            ) : s.soon ? (
              <span className="shrink-0 rounded-full border border-[#E5E5E8] px-3 py-1.5 text-xs font-semibold text-zinc-400">Coming soon</span>
            ) : (
              <Link href={s.href} className="shrink-0 rounded-full border border-[#E5E5E8] px-3.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-[#F5F5F6]">
                {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
