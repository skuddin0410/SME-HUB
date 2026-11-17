"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, ChevronDown, ExternalLink, Home, IdCard, LifeBuoy, Menu, Search, SquareArrowOutUpRight, UserPlus, X } from "lucide-react";
import { ABOUT_MENU, EXPLORE_MENU, POLICY_MENU, PROVINCES, RESOURCES_MENU, type NavItem } from "@/lib/site";
import { AvatarImg, SignOutButton } from "@/components/hub-client";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Logo({ onDark = false, href = "/feed" }: { onDark?: boolean; href?: string }) {
  return (
    <Link href={href} aria-label="SMB Hub home" className={cx("inline-flex shrink-0", onDark && "rounded-xl bg-white px-3 py-1.5")}>
      <img src="/smb-hub-logo.png" alt="SMB Hub" className="h-10 w-auto sm:h-12" />
    </Link>
  );
}

function MenuLink({ item }: { item: NavItem }) {
  const external = item.href.startsWith("http");
  const cls = "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-primary/5 hover:text-primary";
  return external ? (
    <a href={item.href} target="_blank" rel="noreferrer" className={cls}>
      {item.label}
      <ExternalLink className="h-3.5 w-3.5 opacity-40" />
    </a>
  ) : (
    <Link href={item.href} className={cls}>
      {item.label}
    </Link>
  );
}

function Column({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground">{title}</p>
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
    { title: "Business guides by province", items: PROVINCES },
  ],
  Explore: [
    { title: "Community", items: EXPLORE_MENU.slice(0, 5) },
    { title: "Learn", items: EXPLORE_MENU.slice(5) },
    { title: "Good to know", items: POLICY_MENU },
  ],
} as const;

type Me = { id: string; full_name: string; avatar_url: string | null } | null;

export function SiteNav({ me, isStaff, requests, unread }: { me: Me; isStaff: boolean; requests: number; unread: number }) {
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

  const item = (active: boolean) =>
    cx(
      "relative flex h-[72px] items-center gap-2 px-3.5 text-[15px] font-medium transition-colors",
      "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-transform after:duration-200",
      active ? "text-foreground after:scale-x-100 after:bg-primary" : "text-foreground/75 after:scale-x-0 after:bg-primary hover:text-foreground hover:after:scale-x-100",
    );
  const iconBtn = "press relative rounded-full p-2.5 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground";
  const dot = "absolute right-1 top-1 min-w-[16px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-semibold leading-4 text-white";

  const dropdown = (name: "About" | "Explore", Icon: typeof IdCard) => (
    <div className="relative" onMouseEnter={() => setOpen(name)} onMouseLeave={() => setOpen(null)}>
      <button type="button" aria-expanded={open === name} onClick={() => setOpen(open === name ? null : name)} className={item(false)}>
        <Icon className="h-5 w-5" />
        {name}
        <ChevronDown className={cx("h-4 w-4 transition-transform duration-200", open === name && "rotate-180")} />
      </button>
      {open === name && (
        <div className="absolute left-0 top-full z-40 w-[720px] max-w-[92vw] animate-rise pt-1">
          <div className="panel grid grid-cols-3 gap-2 p-4 shadow-2xl">
            {MENUS[name].map((col) => (
              <div key={col.title} className={col.items.length > 8 ? "max-h-80 overflow-y-auto" : ""}>
                <Column title={col.title} items={[...col.items]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-2 px-4">
        <Logo />
        <nav className="ml-6 hidden items-center lg:flex" aria-label="Main">
          <Link href="/feed" className={item(pathname === "/feed")} aria-current={pathname === "/feed" ? "page" : undefined}>
            <Home className="h-5 w-5" />
            Home
          </Link>
          {dropdown("About", IdCard)}
          {dropdown("Explore", SquareArrowOutUpRight)}
          <Link href="/membership-plans" className={item(pathname === "/membership-plans")}>
            <ArrowRight className="h-5 w-5" />
            Upgrade
          </Link>
          <Link href="/help" className={item(pathname === "/help")}>
            <LifeBuoy className="h-5 w-5" />
            Help
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/search" className={iconBtn} aria-label="Search">
            <Search className="h-5 w-5" />
          </Link>
          {me ? (
            <>
              <Link href="/network" className={iconBtn} aria-label={`Network, ${requests} requests`}>
                <UserPlus className="h-5 w-5" />
                {requests > 0 && <span className={dot}>{requests > 9 ? "9+" : requests}</span>}
              </Link>
              <Link href="/notifications" className={iconBtn} aria-label={`Alerts, ${unread} unread`}>
                <Bell className="h-5 w-5" />
                {unread > 0 && <span className={dot}>{unread > 9 ? "9+" : unread}</span>}
              </Link>
              <details className="relative ml-1">
                <summary className="flex cursor-pointer list-none items-center rounded-full ring-2 ring-primary/20 transition hover:ring-primary/60 [&::-webkit-details-marker]:hidden">
                  <AvatarImg person={me} size={38} />
                </summary>
                <div className="panel absolute right-0 mt-2 w-56 animate-rise p-1.5 text-sm shadow-2xl">
                  <p className="truncate px-3 py-2 font-semibold">{me.full_name}</p>
                  {[
                    { href: `/members/${me.id}`, label: "View profile" },
                    { href: "/profile/edit", label: "Edit profile" },
                    ...(isStaff ? [{ href: "/admin", label: "Admin panel" }] : []),
                  ].map((l) => (
                    <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 hover:bg-muted">
                      {l.label}
                    </Link>
                  ))}
                  <SignOutButton className="block w-full rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-muted" />
                </div>
              </details>
            </>
          ) : (
            <>
              <span className="mx-2 hidden h-6 w-px bg-border sm:block" />
              <Link href="/auth/login" className="press hidden rounded-lg px-3 py-2 text-[15px] font-semibold hover:bg-muted sm:block">
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="press rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-white shadow-md shadow-primary/30 transition-colors hover:bg-primary/90"
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
        <div className="max-h-[calc(100vh-72px)] animate-rise space-y-4 overflow-y-auto border-t bg-white p-4 lg:hidden">
          {!me && (
            <Link href="/auth/login" className="block rounded-lg border px-3 py-2 text-center text-sm font-semibold sm:hidden">
              Sign in
            </Link>
          )}
          <Column title="Start here" items={[{ label: "Home", href: "/feed" }, { label: "Upgrade", href: "/membership-plans" }, { label: "Help", href: "/help" }]} />
          {[...MENUS.Explore, ...MENUS.About].map((col) => (
            <Column key={col.title} title={col.title} items={[...col.items]} />
          ))}
        </div>
      )}
    </header>
  );
}
