"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { SkFeed, SkPage, SkProfile, SkRail } from "@/components/zip/skeletons";

/**
 * Speed (feels like Twitter): the moment a member clicks a link inside the Hub, the tab lights up and the next page's
 * loading shape is drawn by the browser itself, with no wait for the server. The real page replaces it as soon as it
 * arrives. Modified clicks (new tab), other websites, downloads and links to the same page are left alone.
 */
const Pending = createContext<string | null>(null);
/** The path being opened, or null. The header uses it to light up the tab straight away. */
export const usePendingPath = () => useContext(Pending);

const RAILS = /^\/(feed|search|notifications|scheduled|posts\/|groups$)/;

function Shape({ path }: { path: string }) {
  if (RAILS.test(path)) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}><div className="cols">
        <aside className="rail" aria-hidden="true"><SkRail cards={1} /></aside>
        <section className="mid pgmid" style={{ display: "flex", flexDirection: "column" }}><SkFeed /></section>
        <aside className="rail" aria-hidden="true"><SkRail /></aside>
      </div></div></div>
    );
  }
  if (/^\/members\/[0-9a-f-]{36}/i.test(path)) return <SkProfile />;
  return <SkPage />;
}

/** Clears the pending page once the address (path and query) has really changed. */
function Settle({ onChange }: { onChange: (key: string) => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => { onChange(`${pathname}?${search.toString()}`); }, [pathname, search, onChange]);
  return null;
}

export function NavPending({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const [pending, setPending] = useState<string | null>(null);
  const [settled] = useState(() => ({ fn: (_k: string) => setPending(null) }));

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      // (Next.js links always cancel the browser's own navigation, so a cancelled click is still a page change)
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.closest("[data-no-pending], .zoom")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page, or only a #section
      if (/^\/(api|auth|admin|cms)\b/.test(url.pathname)) return;
      // let Next.js handle the click first; if it did not take it (a plain link), the browser loads the page anyway
      const target = url.pathname + url.search;
      setTimeout(() => { if (location.pathname + location.search !== target) setPending(target); }, 0);
    };
    const reset = () => setPending(null);
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", reset);
    return () => { document.removeEventListener("click", onClick); window.removeEventListener("popstate", reset); };
  }, []);

  // never leave the shape up if a page change fails or is cancelled
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 15_000);
    return () => clearTimeout(t);
  }, [pending]);

  const path = pending?.split("?")[0] ?? null;
  return (
    <Pending.Provider value={path}>
      {header}
      <Suspense fallback={null}><Settle onChange={settled.fn} /></Suspense>
      <div id="main-content" tabIndex={-1} className="outline-none">
        {path && <Shape path={path} />}
        {/* the current page stays in place (only hidden), so nothing reloads or loses what was typed */}
        <div hidden={!!path} style={{ display: path ? "none" : "contents" }}>{children}</div>
      </div>
    </Pending.Provider>
  );
}
