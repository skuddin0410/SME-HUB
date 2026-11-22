"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ToastProvider } from "@/components/auth-toast";
import { CommandPalette } from "@/components/site-nav";

const NAV = [
  { href: "/auth/login", label: "Home" },
  { href: "/feed", label: "Top Posts" },
  { href: "/members", label: "People" },
  { href: "/groups", label: "Groups" },
  { href: "/businesses", label: "Businesses" },
  { href: "/membership-plans", label: "Plans" },
];

const NAV_ON = "px-3.5 py-1.5 rounded-full text-[0.875rem] font-semibold bg-blue-50 text-blue-700";
const NAV_OFF = "px-3.5 py-1.5 rounded-full text-[0.875rem] font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 transition-colors";

/** Header buttons switch the form in place on the sign-in page instead of reloading it. */
export const AUTH_MODE_EVENT = "smbhub:auth-mode";

/** Sign-in, join and password screens: header, dotted page, footer (design: docs/design/auth.html). */
export function AuthChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onLanding = pathname === "/auth/login" || pathname === "/auth/sign-up";
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === "Escape") setPalette(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const authButton = (mode: "signin" | "signup") => (e: React.MouseEvent) => {
    if (!onLanding) return; // a normal link everywhere else
    e.preventDefault();
    window.dispatchEvent(new CustomEvent(AUTH_MODE_EVENT, { detail: mode }));
  };

  return (
    <div className="min-h-screen flex flex-col justify-between auth-grid-bg text-slate-900 font-inter text-base leading-normal antialiased selection:bg-blue-600/15 selection:text-blue-700">
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link href="/auth/login" aria-label="SMB Hub home" className="flex items-center shrink-0 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/smb-hub-logo.png" alt="SMB Hub" width={874} height={224} className="h-8 w-auto group-hover:opacity-90 transition-opacity" />
          </Link>

          <nav aria-label="Primary Marketing Navigation" className="hidden lg:flex min-w-0 items-center gap-0.5 xl:gap-1">
            {NAV.map(({ href, label }, i) => {
              const active = i === 0 && pathname.startsWith("/auth");
              return (
                <Link key={label} href={href} aria-current={active ? "page" : undefined} className={active ? NAV_ON : NAV_OFF}>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="hidden sm:flex items-center justify-between gap-2 w-40 md:w-32 xl:w-44 h-9 px-3 rounded-full bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/90 text-xs text-slate-500 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[0.6562rem] font-mono bg-white border border-slate-200 rounded text-slate-500">⌘K</kbd>
            </button>
            <Link
              href="/auth/login"
              onClick={authButton("signin")}
              className="h-9 px-4 inline-flex items-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[0.875rem] font-semibold text-slate-800 whitespace-nowrap transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              onClick={authButton("signup")}
              className="h-9 px-4 inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-700 text-[0.875rem] font-semibold text-white whitespace-nowrap transition-all"
            >
              Join now
            </Link>
          </div>
        </div>
      </header>

      <ToastProvider>{children}</ToastProvider>

      <footer className="w-full border-t border-slate-200/70 bg-white/60">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-8 py-4 flex items-center justify-start gap-x-3 gap-y-1 flex-wrap text-xs text-slate-500">
          <span>SMB Hub, by Cmarketing Inc. © {new Date().getFullYear()}</span>
          <span className="text-slate-300">|</span>
          <Link href="/about" className="hover:text-slate-900">
            About
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/help" className="hover:text-slate-900">
            Help
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/policies/terms" className="hover:text-slate-900">
            Terms
          </Link>
        </div>
      </footer>

      {palette && <CommandPalette onClose={() => setPalette(false)} signedIn={false} />}
    </div>
  );
}
