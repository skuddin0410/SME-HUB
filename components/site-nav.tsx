"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Bookmark,
  Building2,
  ChevronDown,
  Crown,
  Edit3,
  HelpCircle,
  Home,
  Landmark,
  LayoutGrid,
  LogOut,
  Maximize2,
  Menu,
  MessageSquare,
  Newspaper,
  Search,
  Shield,
  Store,
  Users,
  X,
} from "lucide-react";
import { markNotificationsRead } from "@/app/(hub)/actions";
import { ABOUT_MENU, EXPLORE_MENU, POLICY_MENU, RESOURCES_MENU, type NavItem } from "@/lib/site";
import { AvatarImg, SignOutButton } from "@/components/hub-client";
import { MAPLE_STAR } from "@/lib/brand";


/** The SMB Hub mark: red maple-star tile and wordmark (design: docs/design/feed.html). */
export function Logo({ href = "/feed" }: { onDark?: boolean; href?: string; large?: boolean }) {
  return (
    <Link href={href} aria-label="SMB Hub home" className="flex items-center gap-2.5 shrink-0 whitespace-nowrap group">
      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 flex items-center justify-center ring-1 ring-black/5 group-hover:scale-105 transition-transform">
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={MAPLE_STAR} />
        </svg>
      </span>
      <span className="hidden sm:inline font-display font-extrabold text-[16px] tracking-tight text-zinc-900">SMB HUB</span>
    </Link>
  );
}

export type NavNote = { id: string; actor: string; text: string; href: string; ago: string; unread: boolean };
type Me = { id: string; full_name: string; avatar_url: string | null; headline?: string | null } | null;

const TAB_ON = "h-8 px-2.5 sm:px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap flex items-center gap-1.5 bg-[#18181B] text-white transition-all";
const TAB_OFF = "h-8 px-2.5 sm:px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap flex items-center gap-1.5 text-stone-600 hover:text-stone-900 hover:bg-white/70 transition-all";
const POPOVER = "absolute right-0 mt-2.5 bg-white rounded-2xl border border-[#E6E3DC] shadow-popover z-50 fade-in";
const MENU_ROW = "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-700 hover:bg-[#F4F2EE] text-left";
const FOCUS_KEY = "smbhub-focus";

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
  const [open, setOpen] = useState<null | "notes" | "explore" | "me">(null);
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const [focus, setFocus] = useState(false);
  const [unreadNow, setUnreadNow] = useState(unread);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => setUnreadNow(unread), [unread]);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  // focus mode survives reloads
  useEffect(() => {
    let on = false;
    try {
      on = localStorage.getItem(FOCUS_KEY) === "on";
    } catch {}
    setFocus(on);
    document.documentElement.dataset.focus = on ? "on" : "off";
  }, []);
  const toggleFocus = useCallback(() => {
    setFocus((f) => {
      const on = !f;
      document.documentElement.dataset.focus = on ? "on" : "off";
      try {
        localStorage.setItem(FOCUS_KEY, on ? "on" : "off");
      } catch {}
      return on;
    });
  }, []);

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

  const toggle = (name: "notes" | "explore" | "me") => setOpen((o) => (o === name ? null : name));
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
          <span className="px-1.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 leading-tight">{requests > 99 ? "99+" : requests}</span>
        ) : null,
    },
    {
      href: "/messages",
      label: "Messaging",
      icon: MessageSquare,
      active: pathname.startsWith("/messages"),
      extra: messages > 0 ? <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-label={`${messages} unread`} /> : null,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/[0.92] backdrop-blur-[16px] border-b border-[#E6E3DC]">
      <div ref={bar} className="max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 h-[62px] flex items-center justify-between gap-2 sm:gap-3">
        {/* left: brand and search */}
        <div className="flex items-center gap-3.5 shrink-0">
          <Logo />
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="hidden sm:flex items-center justify-between gap-2 w-[180px] lg:w-[220px] xl:w-[250px] h-9 px-3.5 rounded-full bg-[#F6F5F1] hover:bg-[#EFECE6] border border-[#E6E3DC] hover:border-stone-300 text-[13px] text-stone-500 transition-colors shrink-0"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">Search SMB Hub...</span>
            </span>
            <kbd className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium bg-white border border-[#E6E3DC] rounded-md text-stone-500">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            aria-label="Search SMB Hub"
            className="hidden w-8 h-8 rounded-full bg-[#F6F5F1] border border-[#E6E3DC] items-center justify-center text-stone-600 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* centre: the segmented capsule */}
        {me ? (
          <nav aria-label="Workspace Navigation" className="flex items-center gap-1 bg-[#F6F5F1]/95 p-1 rounded-full border border-[#E6E3DC]/90 shrink-0">
            {tabs.map(({ href, label, icon: Icon, active, extra }) => (
              <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={active ? TAB_ON : TAB_OFF}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">{label}</span>
                {extra}
              </Link>
            ))}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggle("notes")}
                aria-expanded={open === "notes"}
                className={pathname.startsWith("/notifications") ? TAB_ON.replace("sm:px-3.5", "sm:px-3") : TAB_OFF.replace("sm:px-3.5", "sm:px-3")}
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline">Notifications</span>
                {unreadNow > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" aria-label={`${unreadNow} unread`} />}
              </button>
              {open === "notes" && (
                <div className={`${POPOVER} w-80 p-3`}>
                  <div className="flex items-center justify-between px-2 pb-2.5 border-b border-[#E6E3DC]">
                    <span className="font-display font-bold text-xs text-zinc-900">Notifications</span>
                    {unreadNow > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUnreadNow(0);
                          setOpen(null);
                          markNotificationsRead().then(() => router.refresh()).catch(() => {});
                        }}
                        className="text-[11px] font-medium text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-[#F4F2EE] max-h-72 overflow-y-auto">
                    {notes.length === 0 && <p className="p-2.5 text-xs text-zinc-500">Nothing new yet. Likes, comments and invitations show up here.</p>}
                    {notes.map((n) => (
                      <Link key={n.id} href={n.href} className="block p-2.5 hover:bg-[#F4F2EE]/60 rounded-xl transition-colors">
                        <p className="text-xs text-zinc-800">
                          {n.unread && <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 align-middle" />}
                          <span className="font-semibold">{n.actor}</span> {n.text}
                        </p>
                        <span className="text-[10px] text-zinc-400 mt-1 block">{n.ago}</span>
                      </Link>
                    ))}
                  </div>
                  <Link href="/notifications" className="mt-1 block rounded-xl px-2 py-2 text-center text-[11px] font-semibold text-zinc-700 hover:bg-[#F4F2EE]">
                    See all notifications
                  </Link>
                </div>
              )}
            </div>
          </nav>
        ) : (
          <nav aria-label="Browse" className="hidden md:flex items-center gap-1 bg-[#F6F5F1]/95 p-1 rounded-full border border-[#E6E3DC]/90 shrink-0">
            {[
              { href: "/feed", label: "Home", icon: Home },
              { href: "/members", label: "People", icon: Users },
              { href: "/businesses", label: "Businesses", icon: Building2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={pathname === href ? TAB_ON : TAB_OFF}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        )}

        {/* right: focus, explore, me, upgrade */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onFeed && (
            <button
              type="button"
              onClick={toggleFocus}
              aria-pressed={focus}
              title="Toggle distraction-free Focus Mode"
              className={
                focus
                  ? "hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 transition-all shrink-0"
                  : "hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12.5px] font-medium whitespace-nowrap text-stone-600 hover:text-stone-900 border border-transparent hover:border-[#E6E3DC] hover:bg-stone-100/70 transition-all shrink-0"
              }
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Focus</span>
            </button>
          )}

          <div className="relative hidden sm:block shrink-0">
            <button
              type="button"
              onClick={() => toggle("explore")}
              aria-expanded={open === "explore"}
              className="h-8 px-2.5 rounded-full text-[12.5px] font-medium whitespace-nowrap flex items-center gap-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Explore</span>
              <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
            </button>
            {open === "explore" && (
              <div className={`${POPOVER} w-60 p-2`}>
                {[
                  { href: "/businesses", icon: Building2, tone: "bg-blue-50 text-blue-600", title: "Business Listings", sub: "Canadian small businesses" },
                  { href: "/resources", icon: Landmark, tone: "bg-emerald-50 text-emerald-600", title: "Funding & Grants", sub: "Programs and resources for founders" },
                  { href: "/blog", icon: Newspaper, tone: "bg-rose-50 text-rose-600", title: "Editorial Insights", sub: "Founder playbooks & news" },
                ].map(({ href, icon: Icon, tone, title, sub }) => (
                  <Link key={href} href={href} className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F4F2EE] text-left transition-colors">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-zinc-900">{title}</span>
                      <span className="block text-[10px] text-zinc-500">{sub}</span>
                    </span>
                  </Link>
                ))}
                <div className="mt-1 pt-2 px-2.5 pb-1 border-t border-[#F4F2EE] flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                  {[...EXPLORE_MENU.filter((i) => !["/businesses", "/blog"].includes(i.href)), ...ABOUT_MENU].map((i) => (
                    <Link key={i.href} href={i.href} className="hover:text-zinc-900">
                      {i.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#E6E3DC] mx-0.5 hidden sm:block shrink-0" />

          {me ? (
            <>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => toggle("me")}
                  aria-expanded={open === "me"}
                  className="h-8 pl-1 pr-2.5 rounded-full border border-[#E6E3DC] bg-white hover:bg-stone-50 flex items-center gap-1.5 whitespace-nowrap transition-all"
                >
                  <AvatarImg person={me} size={24} />
                  <span className="hidden sm:inline text-[12.5px] font-medium text-zinc-700">Me</span>
                  <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
                </button>
                {open === "me" && (
                  <div className={`${POPOVER} w-60 p-2`}>
                    <Link href={`/members/${me.id}`} className="block px-3 py-2 border-b border-[#F4F2EE] mb-1 rounded-t-xl hover:bg-[#F4F2EE]/60">
                      <span className="block text-xs font-display font-bold text-zinc-900 truncate">{me.full_name}</span>
                      <span className="block text-[11px] text-zinc-500 truncate">{me.headline || "View your profile"}</span>
                    </Link>
                    <Link href="/profile/edit" className={MENU_ROW}>
                      <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Edit profile &amp; headline</span>
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
                    <div className="my-1 border-t border-[#F4F2EE]" />
                    <span className="flex items-center gap-2 px-3 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50">
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <SignOutButton className="flex-1 py-2 text-left" />
                    </span>
                  </div>
                )}
              </div>
              <Link
                href="/membership-plans"
                className="hidden sm:inline-flex h-8 px-3.5 rounded-full bg-gradient-to-b from-amber-50 to-amber-100/80 border border-amber-300/80 hover:border-amber-400 text-amber-900 text-[12.5px] font-semibold whitespace-nowrap items-center gap-1.5 shadow-[0_1px_2px_rgba(180,83,9,0.08)] transition-all shrink-0"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Upgrade plan</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-zinc-700 hover:bg-stone-100 border border-[#E6E3DC] transition-all">
                Sign in
              </Link>
              <Link href="/auth/sign-up" className="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all">
                Join now
              </Link>
            </>
          )}
          <button
            type="button"
            className="md:hidden w-8 h-8 rounded-full border border-[#E6E3DC] bg-white flex items-center justify-center text-stone-600"
            aria-label="Menu"
            aria-expanded={mobile}
            onClick={() => setMobile((m) => !m)}
          >
            {mobile ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="md:hidden max-h-[calc(100vh-62px)] overflow-y-auto border-t border-[#E6E3DC] bg-white p-4 space-y-4 fade-in">
          <button
            type="button"
            onClick={() => {
              setMobile(false);
              setPalette(true);
            }}
            className="flex w-full items-center gap-2 h-9 px-3.5 rounded-full bg-[#F6F5F1] border border-[#E6E3DC] text-[13px] text-stone-500"
          >
            <Search className="w-3.5 h-3.5 text-stone-400" />
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
                <Link key={l.href} href={l.href} className="rounded-xl border border-[#E6E3DC] px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-[#F4F2EE]">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
          {[
            { title: "Explore", items: EXPLORE_MENU },
            { title: "About", items: ABOUT_MENU },
            { title: "Resources for founders", items: RESOURCES_MENU },
            { title: "Good to know", items: POLICY_MENU },
          ].map((col) => (
            <MenuColumn key={col.title} title={col.title} items={col.items} />
          ))}
        </div>
      )}

      {palette && <CommandPalette onClose={() => setPalette(false)} onFocus={onFeed ? toggleFocus : undefined} signedIn={!!me} />}
    </header>
  );
}

function MenuColumn({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="block rounded-xl px-2 py-1.5 text-sm text-zinc-700 hover:bg-[#F4F2EE]">
          {i.label}
        </Link>
      ))}
    </div>
  );
}

type Command = { type: string; label: string; run: () => void };

/** ⌘K: search everything, or jump straight to a page or an action. */
export function CommandPalette({ onClose, onFocus, signedIn }: { onClose: () => void; onFocus?: () => void; signedIn: boolean }) {
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
    ...(onFocus ? [{ type: "Action", label: "Toggle Focus Mode (collapse sidebars)", run: () => (onClose(), onFocus()) }] : []),
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
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E6E3DC] shadow-popover overflow-hidden fade-in">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            shown[0]?.run();
          }}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E6E3DC]"
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
          <button type="button" onClick={onClose} className="px-2 py-0.5 rounded bg-[#F4F2EE] text-[10px] font-mono text-zinc-500">
            ESC
          </button>
        </form>
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {shown.length === 0 && <p className="p-4 text-xs text-center text-zinc-400">No matching pages or actions.</p>}
          {shown.map((c) => (
            <button key={c.label} type="button" onClick={c.run} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#F4F2EE] transition-colors">
              <span className="text-xs font-medium text-zinc-800 truncate">{c.label}</span>
              <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F4F2EE] text-zinc-500">{c.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
