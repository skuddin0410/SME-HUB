"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon, Search, Sun } from "lucide-react";
import { ToastProvider } from "@/components/auth-toast";

export const MAPLE_STAR = "M12 2L14.2 7.2L19.5 6.4L17.1 11.2L21 14.5L15.6 15.4L16.2 20.5L12 17.6L7.8 20.5L8.4 15.4L3 14.5L6.9 11.2L4.5 6.4L9.8 7.2L12 2Z";

const NAV = [
  { href: "/auth/login", label: "Home" },
  { href: "/feed", label: "Top Posts" },
  { href: "/members", label: "People" },
  { href: "/groups", label: "Groups" },
  { href: "/businesses", label: "Businesses" },
  { href: "/membership-plans", label: "Plans" },
];

const NAV_ON = "nav-link px-3.5 py-1.5 rounded-lg text-sm font-medium bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 transition-all";
const NAV_OFF =
  "nav-link px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all";

/** Header buttons switch the form in place on the sign-in page instead of reloading it. */
export const AUTH_MODE_EVENT = "smbhub:auth-mode";
const THEME_KEY = "smbhub-auth-theme";

export function AuthChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const onLanding = pathname === "/auth/login" || pathname === "/auth/sign-up";

  useEffect(() => {
    try {
      setDark(localStorage.getItem(THEME_KEY) === "dark");
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  const toggleTheme = () =>
    setDark((d) => {
      try {
        localStorage.setItem(THEME_KEY, d ? "light" : "dark");
      } catch {}
      return !d;
    });

  const authButton = (mode: "signin" | "signup") => (e: React.MouseEvent) => {
    if (!onLanding) return; // a normal link everywhere else
    e.preventDefault();
    window.dispatchEvent(new CustomEvent(AUTH_MODE_EVENT, { detail: mode }));
  };

  return (
    <div className={dark ? "dark" : undefined}>
      <div className="font-inter text-base leading-normal min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600/15 selection:text-blue-700 dark:selection:text-blue-300 transition-colors duration-200 auth-grid-pattern">
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/75 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-[16px] transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Link href="/auth/login" className="flex items-center gap-2.5 group focus:outline-none">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 flex items-center justify-center shadow-sm ring-1 ring-black/5 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={MAPLE_STAR} />
                </svg>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-jakarta font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">SMB HUB</span>
                <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  CA
                </span>
              </div>
            </Link>

            <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-1">
              {NAV.map(({ href, label }, i) => {
                const active = i === 0 && pathname.startsWith("/auth");
                return (
                  <Link key={label} href={href} aria-current={active ? "page" : undefined} className={active ? NAV_ON : NAV_OFF}>
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                href="/search"
                aria-label="Quick Search"
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 text-xs transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Search</span>
                <kbd className="hidden md:inline-block px-1.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded text-slate-500">⌘K</kbd>
              </Link>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle Dark Mode"
                className="p-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <Moon className="w-4 h-4 block dark:hidden" />
                <Sun className="w-4 h-4 hidden dark:block text-amber-400" />
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <Link
                href="/auth/login"
                onClick={authButton("signin")}
                className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-all"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                onClick={authButton("signup")}
                className="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-[0.98]"
              >
                Join now
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex items-center">
          <ToastProvider>{children}</ToastProvider>
        </main>

        <footer className="w-full border-t border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-[#0B1120]/60 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>SMB Hub, by Cmarketing Inc. © {new Date().getFullYear()}</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <Link href="/about" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                About
              </Link>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <Link href="/help" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Help
              </Link>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <Link href="/policies/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Privacy
              </Link>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Data hosted in Canada (ca-central-1)
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
