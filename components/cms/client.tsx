"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps every CMS page in step with the hub. The database writes each change on the hub to
 * cms_events (staff-only); this listens to that table over Supabase Realtime and re-renders the
 * page a moment after something happens, so lists, counts and the activity feed stay current.
 */
export function LiveSync() {
  const router = useRouter();
  const [state, setState] = useState<"connecting" | "live" | "offline">("connecting");
  const [fresh, setFresh] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("cms-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cms_events" }, () => {
        setFresh((n) => n + 1);
        if (timer.current) clearTimeout(timer.current);
        // several changes in a burst (a cascade, a busy minute) become one refresh
        timer.current = setTimeout(() => {
          router.refresh();
          setTimeout(() => setFresh(0), 1500);
        }, 700);
      })
      .subscribe((status) => setState(status === "SUBSCRIBED" ? "live" : status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : "connecting"));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const label = state === "live" ? (fresh ? `${fresh} new` : "Live") : state === "offline" ? "Offline" : "Connecting";
  return (
    <span
      role="status"
      title={state === "live" ? "Changes on the hub appear here automatically" : "Live updates are not connected. Refresh the page to see new changes."}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${
        state === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : state === "offline" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${state === "live" ? "bg-emerald-500" : state === "offline" ? "bg-rose-500" : "bg-zinc-400"} ${fresh ? "animate-ping" : ""}`} />
      {label}
    </span>
  );
}

export type NavItem = { href: string; label: string; badge?: number; icon: React.ReactNode };

export function CmsNav({ groups }: { groups: { title: string; items: NavItem[] }[] }) {
  const path = usePathname();
  // on cms.smbhub.ca the address has no /cms prefix; links still use it and the middleware maps them
  const here = path.startsWith("/cms") ? path : `/cms${path === "/" ? "" : path}`;
  const active = (href: string) => (href === "/cms" ? here === "/cms" : here === href || here.startsWith(href + "/"));
  return (
    <nav aria-label="CMS" className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">{g.title}</p>
          <ul className="grid gap-0.5">
            {g.items.map((i) => {
              const on = active(i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex h-8 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors ${
                      on ? "bg-zinc-900 font-semibold text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                  >
                    <span className={on ? "text-white" : "text-zinc-500"}>{i.icon}</span>
                    <span className="flex-1 truncate">{i.label}</span>
                    {!!i.badge && (
                      <span className={`rounded-full px-1.5 text-[10.5px] font-bold leading-[18px] ${on ? "bg-white text-zinc-900" : "bg-rose-600 text-white"}`}>{i.badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** A submit button that asks first when the action cannot be undone. */
export function ConfirmSubmit({
  children,
  confirm,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  confirm?: string;
  className: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
