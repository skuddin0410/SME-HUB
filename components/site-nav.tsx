"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Bookmark,
  Building2,
  ChevronDown,
  Crown,
  Edit3,
  HelpCircle,
  Info,
  Home,
  Eye,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Store,
  Users,
  X,
} from "lucide-react";
import { markNotificationsRead } from "@/app/(hub)/actions";
import { ABOUT_MENU, EXPLORE_MENU, POLICY_MENU, PROVINCE_MENU, RESOURCES_MENU, type NavItem } from "@/lib/site";
import { AvatarImg, SignOutButton } from "@/components/hub-client";
import { ThemeToggle } from "@/components/theme-toggle";


/**
 * The SMB Hub logo from smehub.ca: the red maple roundel and the SMB HUB wordmark
 * (public/brand, transparent PNGs at twice the size they are shown, so they stay sharp on retina screens).
 * On small phones only the roundel shows; onDark swaps in the white-lettered version.
 */
export function Logo({ href = "/feed", onDark = false }: { onDark?: boolean; href?: string; large?: boolean }) {
  return (
    <Link href={href} aria-label="SMB Hub home" className="flex items-center shrink-0 group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={onDark ? "/brand/smb-hub-logo-on-dark.png" : "/brand/smb-hub-logo.png"}
        alt="SMB Hub"
        width={874}
        height={224}
        className={`hidden sm:block h-8 w-auto group-hover:opacity-90 transition-opacity no-dim ${onDark ? "" : "dark:!hidden"}`}
      />
      {!onDark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/smb-hub-logo-on-dark.png" alt="SMB Hub" width={874} height={224} className="hidden dark:sm:block h-8 w-auto no-dim" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/smb-hub-mark.png" alt="SMB Hub" width={226} height={224} className="sm:hidden h-8 w-8" />
    </Link>
  );
}

export type NavNote = { id: string; actor: string; text: string; href: string; ago: string; unread: boolean };
type Me = { id: string; full_name: string; avatar_url: string | null; headline?: string | null } | null;

const TAB_ON = "h-8 px-2.5 sm:px-3.5 rounded-full text-[0.875rem] font-medium whitespace-nowrap flex items-center gap-1.5 bg-[#18181B] text-white transition-all";
const TAB_OFF = "h-8 px-2.5 sm:px-3.5 rounded-full text-[0.875rem] font-medium whitespace-nowrap flex items-center gap-1.5 text-zinc-800 hover:text-zinc-950 hover:bg-white/70 transition-all";
const POPOVER = "absolute right-0 mt-2.5 bg-white rounded-2xl border border-[#E5E5E8] shadow-popover z-50 fade-in";
const MENU_BTN = "h-8 px-2.5 rounded-full text-[0.8438rem] font-medium whitespace-nowrap flex items-center gap-1.5 text-zinc-800 hover:text-zinc-950 hover:bg-zinc-100/80 transition-all";
const MENU_BTN_ON = "h-8 px-2.5 rounded-full text-[0.8438rem] font-semibold whitespace-nowrap flex items-center gap-1.5 bg-zinc-100 text-zinc-950 transition-all";
const MENU_ROW = "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-800 hover:bg-[#F5F5F6] text-left";

/** Opens the command palette from anywhere (the left rail's quick links use it too). */
export const PALETTE_EVENT = "smbhub:palette";
/** Asks the feed composer to open, optionally on a post type. */
export const COMPOSE_EVENT = "smbhub:compose";

export function SiteNav({
  me,
  isStaff,
  requests,
  unread,
  messages,
  notes = [],
}: {
  me: Me;
  isStaff: boolean;
  requests: number;
  unread: number;
  messages: number;
  notes?: NavNote[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<null | "notes" | "about" | "explore" | "me">(null);
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const [unreadNow, setUnreadNow] = useState(unread);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => setUnreadNow(unread), [unread]);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
        setPalette(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (bar.current && !bar.current.contains(e.target as Node)) setOpen(null);
    };
    const onPalette = () => setPalette(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    window.addEventListener(PALETTE_EVENT, onPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
      window.removeEventListener(PALETTE_EVENT, onPalette);
    };
  }, []);

  const toggle = (name: "notes" | "about" | "explore" | "me") => setOpen((o) => (o === name ? null : name));
  const onFeed = pathname === "/feed";

  const tabs = [
    { href: "/feed", label: "Home", icon: Home, active: onFeed, extra: null as React.ReactNode },
    {
      href: "/network",
      label: "Network",
      icon: Users,
      active: pathname.startsWith("/network"),
      extra:
        requests > 0 ? (
          <span className="px-1.5 rounded-full text-[0.6562rem] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 leading-tight">{requests > 99 ? "99+" : requests}</span>
        ) : null,
    },
    { href: "/businesses", label: "Business Directory", icon: Building2, active: pathname.startsWith("/businesses"), extra: null as React.ReactNode },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E5E5E8]">
      <div ref={bar} className="max-w-[85rem] mx-auto px-3 sm:px-6 lg:px-8 h-[3.875rem] flex items-center justify-between gap-2 sm:gap-3">
        {/* left: brand and search */}
        <div className="flex items-center gap-3.5 shrink-0">
          <Logo />
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="hidden lg:flex items-center justify-between gap-2 w-[12.5rem] 2xl:w-[13.125rem] h-9 px-3.5 rounded-full bg-[#F7F7F8] hover:bg-[#EFEFF1] border border-[#E5E5E8] hover:border-zinc-300 text-[0.875rem] text-zinc-500 transition-colors shrink-0"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Search</span>
            </span>
            <kbd className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[0.6562rem] font-mono font-medium bg-white border border-[#E5E5E8] rounded-md text-zinc-500">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            aria-label="Search SMB Hub"
            className="hidden sm:flex lg:hidden w-8 h-8 rounded-full bg-[#F7F7F8] border border-[#E5E5E8] items-center justify-center text-zinc-800 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* centre: the segmented capsule */}
        {me ? (
          <nav aria-label="Workspace Navigation" className="flex items-center gap-1 bg-[#F7F7F8]/95 p-1 rounded-full border border-[#E5E5E8]/90 shrink-0">
            {tabs.map(({ href, label, icon: Icon, active, extra }) => (
              <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={active ? TAB_ON : TAB_OFF}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline">{label}</span>
                {extra}
              </Link>
            ))}
          </nav>
        ) : (
          <nav aria-label="Browse" className="hidden md:flex items-center gap-1 bg-[#F7F7F8]/95 p-1 rounded-full border border-[#E5E5E8]/90 shrink-0">
            {[
              { href: "/feed", label: "Home", icon: Home },
              { href: "/members", label: "People", icon: Users },
              { href: "/businesses", label: "Business Directory", icon: Building2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-label={label} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? TAB_ON : TAB_OFF}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            ))}
          </nav>
        )}

        {/* right: the smehub.ca menus (About, Explore, Help), then notifications, me, upgrade */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="relative hidden lg:block shrink-0">
            <button type="button" onClick={() => toggle("about")} aria-label="About" title="About" aria-expanded={open === "about"} className={open === "about" ? MENU_BTN_ON : MENU_BTN}>
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span className="sr-only">About</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open === "about" ? "rotate-180" : ""}`} />
            </button>
            {open === "about" && (
              <div className={`${POPOVER} w-[min(42.5rem,calc(100vw-2rem))] p-4 grid grid-cols-[1fr_1fr_1.35fr] gap-4`}>
                <MegaColumn title="About SMB Hub" items={ABOUT_MENU} />
                <MegaColumn title="SMB resources" items={RESOURCES_MENU} />
                <MegaColumn title="Province-wide resources" items={PROVINCE_MENU} dense />
              </div>
            )}
          </div>

          <div className="relative hidden lg:block shrink-0">
            <button type="button" onClick={() => toggle("explore")} aria-label="Explore" title="Explore" aria-expanded={open === "explore"} className={open === "explore" ? MENU_BTN_ON : MENU_BTN}>
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="sr-only">Explore</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open === "explore" ? "rotate-180" : ""}`} />
            </button>
            {open === "explore" && (
              <div className={`${POPOVER} w-[min(32.5rem,calc(100vw-2rem))] p-4 grid grid-cols-[1.2fr_1fr] gap-4`}>
                <MegaColumn title="Explore the Hub" items={EXPLORE_MENU} />
                <div className="flex flex-col gap-4">
                  <MegaColumn title="Policies & help" items={POLICY_MENU} />
                  <Link href="/membership-plans" className="mt-auto rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3 hover:border-amber-300 transition-colors">
                    <span className="flex items-center gap-1.5 text-xs font-display font-bold text-amber-900">
                      <Crown className="w-3.5 h-3.5 text-amber-600" /> Membership plans
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] leading-snug text-amber-800/80">More connections, company pages and featured offers.</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link href="/help" aria-label="Help" title="Help" className={`hidden lg:inline-flex ${pathname.startsWith("/help") ? MENU_BTN_ON : MENU_BTN}`}>
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="sr-only">Help</span>
          </Link>

          <div className="h-4 w-px bg-[#E5E5E8] mx-0.5 hidden sm:block shrink-0" />

          <ThemeToggle className="w-8 h-8 rounded-full flex items-center justify-center border border-[#E5E5E8] bg-white text-zinc-800 hover:bg-zinc-50 transition-all shrink-0" />
          {isStaff && (
            <Link href="/admin" aria-label="Team" title="Team" className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center border border-[#E5E5E8] bg-white text-zinc-800 hover:bg-zinc-50 transition-all shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </Link>
          )}

          {me ? (
            <>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggle("notes")}
                aria-expanded={open === "notes"}
                aria-label={unreadNow > 0 ? `Notifications, ${unreadNow} unread` : "Notifications"}
                title="Notifications"
                className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                  pathname.startsWith("/notifications") || open === "notes"
                    ? "bg-[#18181B] text-white border-[#18181B]"
                    : "bg-white text-zinc-800 hover:text-zinc-950 border-[#E5E5E8] hover:bg-zinc-50"
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadNow > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[0.5938rem] font-bold leading-4 text-center ring-2 ring-white">
                    {unreadNow > 9 ? "9+" : unreadNow}
                  </span>
                )}
              </button>
              {open === "notes" && (
                <div className={`${POPOVER} w-80 p-3 -right-24 sm:right-0`}>
                  <div className="flex items-center justify-between px-2 pb-2.5 border-b border-[#E5E5E8]">
                    <span className="font-display font-bold text-xs text-zinc-900">Notifications</span>
                    {unreadNow > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUnreadNow(0);
                          setOpen(null);
                          markNotificationsRead().then(() => router.refresh()).catch(() => {});
                        }}
                        className="text-[0.75rem] font-medium text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-[#F5F5F6] max-h-72 overflow-y-auto">
                    {notes.length === 0 && <p className="p-2.5 text-xs text-zinc-500">Nothing new yet. Likes, comments and invitations show up here.</p>}
                    {notes.map((n) => (
                      <Link key={n.id} href={n.href} className="block p-2.5 hover:bg-[#F5F5F6]/60 rounded-xl transition-colors">
                        <p className="text-xs text-zinc-900">
                          {n.unread && <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 align-middle" />}
                          <span className="font-semibold">{n.actor}</span> {n.text}
                        </p>
                        <span className="text-[0.6562rem] text-zinc-400 mt-1 block">{n.ago}</span>
                      </Link>
                    ))}
                  </div>
                  <Link href="/notifications" className="mt-1 block rounded-xl px-2 py-2 text-center text-[0.75rem] font-semibold text-zinc-800 hover:bg-[#F5F5F6]">
                    See all notifications
                  </Link>
                </div>
              )}
            </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => toggle("me")}
                  aria-expanded={open === "me"}
                  className="h-8 pl-1 pr-2.5 rounded-full border border-[#E5E5E8] bg-white hover:bg-zinc-50 flex items-center gap-1.5 whitespace-nowrap transition-all"
                >
                  <AvatarImg person={me} size={24} />
                  <span className="hidden sm:inline text-[0.8438rem] font-medium text-zinc-800">Me</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
                </button>
                {open === "me" && (
                  <div className={`${POPOVER} w-60 p-2`}>
                    <Link href={`/members/${me.id}`} className="block px-3 py-2 border-b border-[#F5F5F6] mb-1 rounded-t-xl hover:bg-[#F5F5F6]/60">
                      <span className="block text-xs font-display font-bold text-zinc-900 truncate">{me.full_name}</span>
                      <span className="block text-[0.75rem] text-zinc-500 truncate">{me.headline || "View your profile"}</span>
                    </Link>
                    <Link href="/profile/edit" className={MENU_ROW}>
                      <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Edit profile &amp; headline</span>
                    </Link>
                    <Link href="/profile/views" className={MENU_ROW}>
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Who viewed your profile</span>
                    </Link>
                    <Link href="/settings" className={MENU_ROW}>
                      <Settings className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Settings &amp; privacy</span>
                    </Link>
                    <Link href="/feed?saved=1" className={MENU_ROW}>
                      <Bookmark className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Saved bookmarks</span>
                    </Link>
                    <Link href="/businesses/mine" className={MENU_ROW}>
                      <Store className="w-3.5 h-3.5 text-zinc-400" />
                      <span>My business listings</span>
                    </Link>
                    <Link href="/help" className={MENU_ROW}>
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Help</span>
                    </Link>
                    {isStaff && (
                      <Link href="/admin" className={MENU_ROW}>
                        <Shield className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Admin panel</span>
                      </Link>
                    )}
                    <Link href="/membership-plans" className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-amber-700 hover:bg-amber-50 text-left">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>Upgrade to SMB Elite</span>
                    </Link>
                    <div className="my-1 border-t border-[#F5F5F6]" />
                    <span className="flex items-center gap-2 px-3 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50">
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <SignOutButton className="flex-1 py-2 text-left" />
                    </span>
                  </div>
                )}
              </div>
              <Link
                href="/membership-plans"
                aria-label="Upgrade plan"
                className="hidden sm:inline-flex h-8 px-2.5 xl:px-3.5 rounded-full bg-gradient-to-b from-amber-50 to-amber-100/80 border border-amber-300/80 hover:border-amber-400 text-amber-900 text-[0.8438rem] font-semibold whitespace-nowrap items-center gap-1.5 shadow-[0_1px_0.125rem_rgba(180,83,9,0.08)] transition-all shrink-0"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden xl:inline">
                  Upgrade<span className="hidden 2xl:inline"> plan</span>
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-zinc-800 hover:bg-zinc-100 border border-[#E5E5E8] transition-all">
                Sign in
              </Link>
              <Link href="/auth/sign-up" className="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all">
                Join now
              </Link>
            </>
          )}
          <button
            type="button"
            className="lg:hidden w-8 h-8 rounded-full border border-[#E5E5E8] bg-white flex items-center justify-center text-zinc-800"
            aria-label="Menu"
            aria-expanded={mobile}
            onClick={() => setMobile((m) => !m)}
          >
            {mobile ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="lg:hidden max-h-[calc(100vh-3.875rem)] overflow-y-auto border-t border-[#E5E5E8] bg-white p-4 space-y-4 fade-in">
          <button
            type="button"
            onClick={() => {
              setMobile(false);
              setPalette(true);
            }}
            className="flex w-full items-center gap-2 h-9 px-3.5 rounded-full bg-[#F7F7F8] border border-[#E5E5E8] text-[0.875rem] text-zinc-500"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            Search SMB Hub...
          </button>
          {me && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/network", label: `Network${requests ? ` (${requests})` : ""}` },
                { href: "/messages", label: `Messaging${messages ? ` (${messages})` : ""}` },
                { href: "/notifications", label: `Notifications${unreadNow ? ` (${unreadNow})` : ""}` },
                { href: "/membership-plans", label: "Upgrade" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="rounded-xl border border-[#E5E5E8] px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-[#F5F5F6]">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
          {[
            { title: "Explore", items: EXPLORE_MENU },
            { title: "About", items: ABOUT_MENU },
            { title: "Resources for founders", items: RESOURCES_MENU },
            { title: "Province-wide resources", items: PROVINCE_MENU },
            { title: "Good to know", items: POLICY_MENU },
          ].map((col) => (
            <MenuColumn key={col.title} title={col.title} items={col.items} />
          ))}
        </div>
      )}

      {palette && <CommandPalette onClose={() => setPalette(false)} signedIn={!!me} />}
    </header>
  );
}

/** One titled column of links inside the About and Explore menus. */
function MegaColumn({ title, items, dense = false }: { title: string; items: NavItem[]; dense?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="px-2 pb-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-zinc-400">{title}</p>
      <ul className={dense ? "grid grid-cols-1 gap-px" : "grid gap-0.5"}>
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className={`block rounded-lg px-2 ${dense ? "py-1 text-[0.8125rem]" : "py-1.5 text-[0.8438rem]"} text-zinc-800 hover:bg-[#F5F5F6] hover:text-zinc-950 truncate transition-colors`}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MenuColumn({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-1 pb-1 text-[0.75rem] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="block rounded-xl px-2 py-1.5 text-sm text-zinc-800 hover:bg-[#F5F5F6]">
          {i.label}
        </Link>
      ))}
    </div>
  );
}

type Command = { type: string; label: string; run: () => void };

/** ⌘K: search everything, or jump straight to a page or an action. */
export function CommandPalette({ onClose, signedIn }: { onClose: () => void; signedIn: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => input.current?.focus(), 40);
  }, []);

  const go = (href: string) => () => {
    onClose();
    router.push(href);
  };
  const term = q.trim();
  const all: Command[] = [
    ...(signedIn
      ? [
          {
            type: "Action",
            label: "Create a new post or share a win",
            run: () => {
              onClose();
              if (window.location.pathname === "/feed") window.dispatchEvent(new CustomEvent(COMPOSE_EVENT, { detail: "win" }));
              else router.push("/feed?compose=win");
            },
          },
        ]
      : []),
    { type: "Page", label: "People: find members and SMB advisors", run: go("/members") },
    { type: "Page", label: "Groups: topic circles for Canadian owners", run: go("/groups") },
    { type: "Page", label: "Business listings", run: go("/businesses") },
    { type: "Page", label: "Editorial insights and news", run: go("/blog") },
    { type: "Page", label: "Membership plans", run: go("/membership-plans") },
    ...(signedIn
      ? [
          { type: "Page", label: "Saved bookmarks", run: go("/feed?saved=1") },
          { type: "Page", label: "Edit profile & headline", run: go("/profile/edit") },
        ]
      : []),
  ];
  const shown = [
    ...(term ? [{ type: "Search", label: `Search posts, people and businesses for "${term}"`, run: go(`/search?q=${encodeURIComponent(term)}`) }] : []),
    ...(term ? all.filter((c) => `${c.type} ${c.label}`.toLowerCase().includes(term.toLowerCase())) : all),
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/40 flex items-start justify-center pt-20 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Search SMB Hub"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E5E5E8] shadow-popover overflow-hidden fade-in">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            shown[0]?.run();
          }}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5E5E8]"
        >
          <Search className="w-4 h-4 text-blue-600" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to founders, posts, groups, or actions..."
            aria-label="Search"
            className="flex-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none bg-transparent"
          />
          <button type="button" onClick={onClose} className="px-2 py-0.5 rounded bg-[#F5F5F6] text-[0.6562rem] font-mono text-zinc-500">
            ESC
          </button>
        </form>
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {shown.length === 0 && <p className="p-4 text-xs text-center text-zinc-400">No matching pages or actions.</p>}
          {shown.map((c) => (
            <button key={c.label} type="button" onClick={c.run} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#F5F5F6] transition-colors">
              <span className="text-xs font-medium text-zinc-900 truncate">{c.label}</span>
              <span className="shrink-0 text-[0.6562rem] font-semibold px-2 py-0.5 rounded bg-[#F5F5F6] text-zinc-500">{c.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
