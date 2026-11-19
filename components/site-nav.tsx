"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, Home, LayoutGrid, Menu, MessageSquareText, Search, UsersRound, X } from "lucide-react";
import { ABOUT_MENU, EXPLORE_MENU, POLICY_MENU, RESOURCES_MENU, type NavItem } from "@/lib/site";
import { AvatarImg, SignOutButton } from "@/components/hub-client";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Logo({ onDark = false, href = "/feed", large = false }: { onDark?: boolean; href?: string; large?: boolean }) {
  return (
    <Link href={href} aria-label="SMB Hub home" className={cx("inline-flex shrink-0", onDark && "rounded-xl bg-white px-3 py-1.5")}>
      <img src="/smb-hub-logo.png" alt="SMB Hub" className={large ? "h-10 w-auto sm:h-[50px]" : "h-9 w-auto sm:h-10"} />
    </Link>
  );
}

function MenuLink({ item }: { item: NavItem }) {
  return (
    <Link href={item.href} className="block rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground">
      {item.label}
    </Link>
  );
}

function Column({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-3 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">{title}</p>
      {items.map((i) => (
        <MenuLink key={i.label} item={i} />
      ))}
    </div>
  );
}

const MENUS = {
  About: [
    { title: "SMB Hub", items: ABOUT_MENU },
    { title: "Resources for founders", items: RESOURCES_MENU },
  ],
  Explore: [
    { title: "Community", items: EXPLORE_MENU.slice(0, 5) },
    { title: "Learn", items: EXPLORE_MENU.slice(5) },
  ],
} as const;

type Me = { id: string; full_name: string; avatar_url: string | null } | null;

export function SiteNav({ me, isStaff, requests, unread, messages }: { me: Me; isStaff: boolean; requests: number; unread: number; messages: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<null | "About" | "Explore">(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(null), setMobile(false));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // LinkedIn's bar: icon over a 12px label, 80px wide, a 2px dark bar under the page you are on
  const stack = (active: boolean) =>
    cx(
      "relative flex h-[50px] w-10 shrink-0 flex-col items-center justify-center gap-0.5 text-xs transition-colors md:w-20",
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
    );
  const bar = (active: boolean) => active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />;
  const dot = "absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#cb112d] px-1 text-[11px] font-normal leading-none text-white";
  const iconSize = "h-6 w-6";

  const links = me
    ? [
        { href: "/feed", label: "Home", icon: Home, count: 0, active: pathname === "/feed" },
        { href: "/network", label: "Network", icon: UsersRound, count: requests, active: pathname.startsWith("/network") },
        { href: "/messages", label: "Messaging", icon: MessageSquareText, count: messages, active: pathname.startsWith("/messages") },
        { href: "/notifications", label: "Notifications", icon: Bell, count: unread, active: pathname.startsWith("/notifications") },
      ]
    : [{ href: "/feed", label: "Home", icon: Home, count: 0, active: pathname === "/feed" }];

  const explore = (
    <div className="relative flex h-[50px]" onMouseEnter={() => setOpen("Explore")} onMouseLeave={() => setOpen(null)}>
      <button type="button" aria-expanded={open === "Explore"} onClick={() => setOpen(open === "Explore" ? null : "Explore")} className={stack(false)}>
        <LayoutGrid className={iconSize} />
        <span className="hidden items-center md:flex">
          Explore <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>
      {open === "Explore" && (
        <div className="absolute right-0 top-full z-40 w-[480px]">
          <div className="panel grid animate-rise grid-cols-2 gap-1 p-2 shadow-[0_8px_24px_-6px_rgb(0_0_0/0.2)]">
            {[...MENUS.About, ...MENUS.Explore].map((col) => (
              <Column key={col.title} title={col.title} items={[...col.items]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="mx-auto flex h-[50px] max-w-[1260px] items-center gap-2 px-4">
        <Logo />
        <form action="/search" role="search" className="relative ml-2 hidden xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            aria-label="Search"
            placeholder="Search"
            className="h-8 w-[300px] rounded-full border border-[#b2b2b2] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#676767] focus:border-foreground focus:ring-1 focus:ring-foreground 2xl:w-[370px]"
          />
        </form>

        <nav className="ml-auto flex h-full items-center" aria-label="Main">
          <Link href="/search" aria-label="Search" className={cx(stack(false), "max-md:hidden xl:hidden")}>
            <Search className={iconSize} />
            <span className="hidden md:block">Search</span>
          </Link>
          {links.map(({ href, label, icon: Icon, count, active }) => (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={count ? `${label}, ${count} new` : label} className={cx(stack(active), href === "/feed" && "max-md:hidden")}>
              <span className="relative">
                {active && href === "/feed" ? (
                  <svg viewBox="0 0 24 24" className={iconSize} fill="currentColor" aria-hidden>
                    <path d="M12 2.5 2 10.4V22h7.5v-7h5v7H22V10.4z" />
                  </svg>
                ) : (
                  <Icon className={cx(iconSize, active && "fill-current")} />
                )}
                {count > 0 && <span className={dot}>{count > 99 ? "99+" : count}</span>}
              </span>
              <span className="hidden md:block">{label}</span>
              {bar(active)}
            </Link>
          ))}
          {me && (
            <details className="relative h-[50px]">
              <summary className={cx(stack(false), "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
                <AvatarImg person={me} size={24} />
                <span className="hidden items-center md:flex">
                  Me <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </summary>
              <div className="panel absolute right-0 top-full w-64 animate-rise p-1.5 text-sm shadow-[0_8px_24px_-6px_rgb(0_0_0/0.2)]">
                <Link href={`/members/${me.id}`} className="flex items-center gap-3 rounded px-3 py-2 hover:bg-muted">
                  <AvatarImg person={me} size={48} />
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold">{me.full_name}</span>
                    <span className="block text-xs text-primary">View profile</span>
                  </span>
                </Link>
                <div className="my-1 border-t" />
                {[
                  { href: "/profile/edit", label: "Edit profile" },
                  { href: "/businesses/mine", label: "My business listings" },
                  { href: "/membership-plans", label: "Membership plans" },
                  { href: "/help", label: "Help" },
                  ...(isStaff ? [{ href: "/admin", label: "Admin panel" }] : []),
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                    {l.label}
                  </Link>
                ))}
                <div className="my-1 border-t" />
                <SignOutButton className="block w-full rounded px-3 py-2 text-left text-muted-foreground hover:bg-muted hover:text-foreground" />
              </div>
            </details>
          )}

          <span className="mx-1 hidden h-full w-px bg-border lg:block" />
          <div className="hidden lg:block">{explore}</div>
          {me ? (
            <Link href="/membership-plans" className="hidden h-[50px] w-[110px] flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground lg:flex">
              <span aria-hidden className="h-6 w-6 rounded-[4px] bg-gradient-to-br from-[#e7a33e] to-[#cf873f]" />
              <span>Upgrade plan</span>
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="press ml-2 hidden rounded-full px-4 py-2 text-base font-semibold text-muted-foreground hover:bg-muted hover:text-foreground sm:block">
                Sign in
              </Link>
              <Link href="/auth/sign-up" className="press rounded-full bg-primary px-5 py-2 text-base font-semibold text-white transition-colors hover:bg-[#004182]">
                Sign up
              </Link>
            </>
          )}
          <button type="button" className={cx(stack(false), "lg:hidden")} aria-label="Menu" aria-expanded={mobile} onClick={() => setMobile((m) => !m)}>
            {mobile ? <X className={iconSize} /> : <Menu className={iconSize} />}
            <span className="hidden md:block">Menu</span>
          </button>
        </nav>
      </div>

      {mobile && (
        <div className="max-h-[calc(100vh-50px)] animate-rise space-y-4 overflow-y-auto border-t bg-white p-4 lg:hidden">
          {!me && (
            <Link href="/auth/login" className="block rounded-lg border px-3 py-2 text-center text-sm font-semibold sm:hidden">
              Sign in
            </Link>
          )}
          <Column title="Start here" items={[{ label: "Home", href: "/feed" }, { label: "Upgrade", href: "/membership-plans" }, { label: "Help", href: "/help" }]} />
          {[...MENUS.Explore, ...MENUS.About, { title: "Good to know", items: POLICY_MENU }].map((col) => (
            <Column key={col.title} title={col.title} items={[...col.items]} />
          ))}
        </div>
      )}
    </header>
  );
}
