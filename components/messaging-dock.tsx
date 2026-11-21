"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronUp, SquarePen } from "lucide-react";
import { AvatarImg } from "@/components/hub-client";

export type DockThread = {
  id: string;
  name: string;
  avatar_url: string | null;
  last: string;
  ago: string;
  unread: number;
};

const OPEN_KEY = "smbhub.dock.open";

/** Messaging pop-up in the bottom-right corner of every page for members (the full inbox is /messages). */
export function MessagingDock({ me, threads, unread }: { me: { id: string; full_name: string; avatar_url: string | null }; threads: DockThread[]; unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(OPEN_KEY) === "1");
    } catch {}
  }, []);
  const flip = () => {
    setOpen((o) => {
      try {
        sessionStorage.setItem(OPEN_KEY, o ? "0" : "1");
      } catch {}
      return !o;
    });
  };
  if (pathname.startsWith("/messages")) return null;

  return (
    <aside aria-label="Messaging" className="fixed bottom-0 right-4 z-30 hidden w-[320px] md:block lg:right-8">
      <div className="overflow-hidden rounded-t-2xl border border-b-0 border-[#E5E5E8] bg-white shadow-popover">
        <button type="button" onClick={flip} aria-expanded={open} className="flex h-12 w-full items-center gap-2.5 px-3.5 text-left hover:bg-[#F5F5F6]">
          <span className="relative">
            <AvatarImg person={me} size={28} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </span>
          <span className="flex-1 text-[14px] font-semibold text-zinc-900">Messaging</span>
          {unread > 0 && <span className="min-w-5 rounded-full bg-rose-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{unread > 99 ? "99+" : unread}</span>}
          <ChevronUp className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="border-t border-[#E5E5E8]">
            <div className="max-h-[340px] overflow-y-auto">
              {threads.length === 0 && <p className="p-4 text-xs text-zinc-500">No conversations yet. Connect with a member and say hello.</p>}
              {threads.map((t) => (
                <Link key={t.id} href={`/messages?with=${t.id}`} className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#F5F5F6]">
                  <AvatarImg person={{ id: t.id, full_name: t.name, avatar_url: t.avatar_url }} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[13px] ${t.unread ? "font-bold" : "font-semibold"} text-zinc-900`}>{t.name}</span>
                      <span className="shrink-0 text-[10px] text-zinc-400">{t.ago}</span>
                    </span>
                    <span className={`block truncate text-xs ${t.unread ? "font-medium text-zinc-900" : "text-zinc-500"}`}>{t.last}</span>
                  </span>
                  {t.unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label={`${t.unread} unread`} />}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-[#E5E5E8] px-3.5 py-2 text-xs font-semibold">
              <Link href="/messages" className="text-blue-600 hover:underline">
                Open Messages
              </Link>
              <Link href="/messages?with=" aria-label="New message" className="text-zinc-500 hover:text-zinc-900">
                <SquarePen className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
