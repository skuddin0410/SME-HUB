"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, MessageSquareText, UsersRound, ChevronDown, Home, IdCard, LifeBuoy, Menu, Search, SquareArrowOutUpRight, X } from "lucide-react";
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
    <Link href={item.href} className="block rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-slate-100 hover:text-foreground">
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

  // tabs are quiet pills: a soft grey on hover, a blue tint for the page you are on
  const item = (active: boolean) =>
    cx(
      "press flex h-9 items-center gap-2 rounded-full px-3.5 text-[15px] transition-colors duration-150",
      active ? "bg-primary/10 font-semibold text-primary" : "font-medium text-foreground/70 hover:bg-slate-100 hover:text-foreground",
    );
  const iconBtn = "press relative rounded-full p-2.5 text-foreground/70 transition-colors hover:bg-slate-100 hover:text-foreground";
  const stack = (active: boolean) =>
    cx(
      "press flex h-[52px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs transition-colors md:min-w-[76px]",
      active ? "font-semibold text-primary" : "text-foreground/60 hover:bg-slate-100 hover:text-foreground",
    );
  const dot = "absolute -right-2 -top-1.5 min-w-[18px] border-2 border-white rounded-full bg-rose-600 px-1 text-center text-[10px] font-semibold leading-[14px] text-white";

  const dropdown = (name: "About" | "Explore", Icon: typeof IdCard) => {
    const active = MENUS[name].some((col) => col.items.some((i) => pathname === i.href || (i.href !== "/members" && pathname.startsWith(`${i.href}/`))));
    return (
      <div className="relative flex h-[60px] items-center" onMouseEnter={() => setOpen(name)} onMouseLeave={() => setOpen(null)}>
        <button
          type="button"
          aria-expanded={open === name}
          onClick={() => setOpen(open === name ? null : name)}
          className={cx(item(active), !active && open === name && "bg-slate-100 text-foreground")}
        >
          <Icon className="hidden h-[18px] w-[18px] xl:block" />
          {name}
          <ChevronDown className={cx("h-4 w-4 opacity-60 transition-transform duration-200", open === name && "rotate-180")} />
        </button>
        {open === name && (
          <div className="absolute left-1/2 top-full z-40 w-[460px] -translate-x-1/2">
            <div className="grid animate-rise grid-cols-2 gap-1 rounded-xl border bg-white p-2 shadow-[0_12px_32px_-8px_rgb(15_23_42/0.18)]">
              {MENUS[name].map((col) => (
                <Column key={col.title} title={col.title} items={[...col.items]} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-white">
      {/* three columns from lg up: logo, tabs centred on the page, account controls */}
      <div className="mx-auto flex h-[60px] max-w-[1260px] items-center gap-2 px-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <Link href="/feed" className={item(pathname === "/feed")} aria-current={pathname === "/feed" ? "page" : undefined}>
            <Home className="hidden h-[18px] w-[18px] xl:block" />
            Home
          </Link>
          {dropdown("About", IdCard)}
          {dropdown("Explore", SquareArrowOutUpRight)}
          <Link href="/membership-plans" className={item(pathname === "/membership-plans")}>
            <ArrowRight className="hidden h-[18px] w-[18px] xl:block" />
            Upgrade
          </Link>
          <Link href="/help" className={item(pathname === "/help")}>
            <LifeBuoy className="hidden h-[18px] w-[18px] xl:block" />
            Help
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:justify-self-end">
          <Link href="/search" className={iconBtn} aria-label="Search">
            <Search className="h-5 w-5" />
          </Link>
          {me ? (
            <>
              {[
                { href: "/network", label: "Network", icon: UsersRound, count: requests },
                { href: "/messages", label: "Messaging", icon: MessageSquareText, count: messages },
                { href: "/notifications", label: "Notifications", icon: Bell, count: unread },
              ].map(({ href, label, icon: Icon, count }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={count ? `${label}, ${count} new` : label} className={stack(active)}>
                    <span className="relative">
                      <Icon className={cx("h-6 w-6", active && "fill-primary/15")} />
                      {count > 0 && <span className={dot}>{count > 9 ? "9+" : count}</span>}
                    </span>
                    <span className="hidden md:block">{label}</span>
                  </Link>
                );
              })}
              <details className="relative">
                <summary className={cx(stack(false), "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
                  <AvatarImg person={me} size={24} />
                  <span className="hidden items-center md:flex">
                    Me <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </summary>
                <div className="panel absolute right-0 mt-1 w-64 animate-rise p-1.5 text-sm shadow-2xl">
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
            </>
          ) : (
            <>
              <span className="mx-2 hidden h-6 w-px bg-border sm:block" />
              <Link href="/auth/login" className="press hidden rounded-full px-4 py-2 text-base font-semibold text-foreground/70 hover:bg-muted hover:text-foreground sm:block">
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="press rounded-full bg-primary px-5 py-2 text-base font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Sign up
              </Link>
            </>
          )}
          <button type="button" className={cx(iconBtn, "lg:hidden")} aria-label="Menu" aria-expanded={mobile} onClick={() => setMobile((m) => !m)}>
            {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="max-h-[calc(100vh-60px)] animate-rise space-y-4 overflow-y-auto border-t bg-white p-4 lg:hidden">
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
