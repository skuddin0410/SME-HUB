"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

const LINKS = [
  { href: "/auth/login", label: "Home" },
  { href: "/feed", label: "Top Posts" },
  { href: "/members", label: "People" },
  { href: "/groups", label: "Groups" },
  { href: "/businesses", label: "Businesses" },
  { href: "/membership-plans", label: "Plans" },
];

/** Centre links and the right-hand buttons of the sign-in page header. */
export function AuthNav() {
  const pathname = usePathname();
  const home = pathname.startsWith("/auth");
  return (
    <>
      <nav className="mx-auto hidden items-center gap-1 xl:flex" aria-label="Browse">
        {LINKS.map(({ href, label }, i) => (
          <Link
            key={label}
            href={href}
            aria-current={i === 0 && home ? "page" : undefined}
            className={
              i === 0 && home
                ? "rounded-full bg-[#e3ecfb] px-5 py-2 text-[15px] font-semibold text-[#0b1437]"
                : "rounded-full px-[22px] py-2 text-[15px] font-medium text-[#0b1437] transition-colors hover:bg-[#e3ecfb]/70"
            }
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2.5 xl:ml-0">
        <Link href="/search" aria-label="Search" className="press mr-2 hidden rounded-full p-2 text-[#0b1437] transition-colors hover:bg-[#e3ecfb] sm:block">
          <Search className="h-5 w-5" />
        </Link>
        <Link
          href="/auth/login"
          className="press flex h-10 items-center whitespace-nowrap rounded-full border border-[#2f5fe0] bg-white/60 px-4 text-[15px] sm:px-6 sm:text-[16px] font-semibold text-[#0b2bcf] transition-colors hover:bg-white"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="press flex h-10 items-center whitespace-nowrap rounded-full bg-gradient-to-r from-[#1238c9] to-[#001a8f] px-4 text-[15px] sm:px-6 sm:text-[16px] font-semibold text-white shadow-[0_8px_18px_-8px_rgb(0_26_143/0.8)] transition hover:brightness-110"
        >
          Join now
        </Link>
      </div>
    </>
  );
}
