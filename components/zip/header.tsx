"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { CommandPalette, PALETTE_EVENT, type NavNote } from "@/components/site-nav";
import { markNotificationsRead } from "@/app/(hub)/actions";
import { ZipAv } from "@/components/zip/bits";
import { SignOutButton } from "@/components/hub-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { ABOUT_MENU, POLICY_MENU, PROVINCE_MENU, RESOURCES_MENU, type NavItem } from "@/lib/site";

type Me = { id: string; full_name: string; avatar_url: string | null; headline?: string | null } | null;

/** The guide's "Explore the Hub" list, limited to the pages this site has built. */
const HUB_MENU: NavItem[] = [
  { label: "Groups", href: "/groups" },
  { label: "Events", href: "/events" },
  { label: "Members", href: "/members" },
  { label: "Business Directory", href: "/businesses" },
  { label: "My Businesses", href: "/businesses/mine" },
  { label: "SMB Advisors", href: "/smb-advisor" },
  { label: "Membership plans", href: "/membership-plans" },
  { label: "Blog", href: "/blog" },
  { label: "News", href: "/news" },
  { label: "Courses", href: "/courses" },
  { label: "Small Business Podcast", href: "/podcast" },
];

const TEAM_MENU: [string, NavItem[]][] = [
  ["Community", [{ label: "Moderation", href: "/moderation" }]],
  [
    "Settings",
    [
      { label: "Profiles and directory", href: "/profilesettings" },
      { label: "Feed", href: "/feedsettings" },
      { label: "Groups", href: "/groupsettings" },
      { label: "Member blogs", href: "/blogsettings" },
      { label: "Hashtags", href: "/hashtagsettings" },
      { label: "Billing", href: "/admin/billing" },
    ],
  ],
  ["Business Directory", [{ label: "Business Profiles", href: "/admin/businesses" }]],
];

function Chev() {
  return <Ic n="down" s={12} style={{ opacity: 0.55 }} />;
}

function Col({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="col">
      <h3>{title}</h3>
      {items.map((l) => (
        <Link key={l.href} href={l.href} className="mlink">
          {l.label}
        </Link>
      ))}
    </div>
  );
}

/** The header from the design guide: logo, search pill, nav pills, About / Explore / Help, then notifications, Me and Upgrade. */
export function ZipHeader({
  me,
  isStaff,
  requests,
  unread,
  notes = [],
}: {
  me: Me;
  isStaff: boolean;
  requests: number;
  unread: number;
  messages?: number;
  notes?: NavNote[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<null | "about" | "explore" | "team" | "notes" | "me">(null);
  const [palette, setPalette] = useState(false);
  const [unreadNow, setUnreadNow] = useState(unread);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => setUnreadNow(unread), [unread]);
  useEffect(() => setOpen(null), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === "Escape") {
        setOpen(null);
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

  const toggle = (k: NonNullable<typeof open>) => setOpen((o) => (o === k ? null : k));
  const links = me
    ? [
        { href: "/feed", label: "Home", icon: "home", on: pathname === "/feed" },
        { href: "/network", label: "Network", icon: "users", on: pathname.startsWith("/network") || pathname.startsWith("/members") },
        { href: "/businesses", label: "Business Directory", icon: "building", on: pathname.startsWith("/businesses") },
      ]
    : [
        { href: "/", label: "Home", icon: "home", on: pathname === "/" || pathname === "/feed" },
        { href: "/members", label: "People", icon: "users", on: pathname.startsWith("/members") },
        { href: "/businesses", label: "Business Directory", icon: "building", on: pathname.startsWith("/businesses") },
      ];

  return (
    <header className="top">
      <div ref={bar} className="wrap hd">
        <div className="lgroup">
          <Link className="logo" href={me ? "/feed" : "/"} aria-label="SMB Hub home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="on-light" src="/brand/zip-logo.webp" alt="SMB Hub" width={125} height={32} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="on-dark" src="/brand/smb-hub-logo-on-dark.png" alt="SMB Hub" width={125} height={32} />
          </Link>
          <button type="button" className="spill" onClick={() => setPalette(true)} aria-label="Search SMB Hub">
            <Ic n="search" />
            <span style={{ flex: "1 1 auto", textAlign: "left", fontSize: 13 }}>Search</span>
            <kbd aria-hidden="true">⌘K</kbd>
          </button>
        </div>

        <nav className="pillnav" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={l.on ? "page" : undefined}>
              <Ic n={l.icon} />
              {l.label}
              {l.href === "/network" && requests > 0 && <span className="dot" style={{ position: "static", marginLeft: 2 }}>{requests > 99 ? "99+" : requests}</span>}
            </Link>
          ))}
        </nav>

        <div className="hright">
          <button type="button" className="tbtn" aria-expanded={open === "about"} onClick={() => toggle("about")}>
            <Ic n="info" />
            About
            <Chev />
          </button>
          <button type="button" className="tbtn" aria-expanded={open === "explore"} onClick={() => toggle("explore")}>
            <Ic n="grid" />
            Explore
            <Chev />
          </button>
          {me && isStaff && (
            <button type="button" className="tbtn teambtn" aria-label="Team menu" aria-expanded={open === "team"} onClick={() => toggle("team")}>
              <Ic n="lock" />
              <span className="tlab">Team</span>
              <Chev />
            </button>
          )}
          <Link className="tbtn" href="/help">
            <Ic n="help" />
            Help
          </Link>
          <span className="vdiv" aria-hidden="true" />
          {me ? (
            <>
              <div className="menuwrap">
                <button
                  type="button"
                  className="iconbtn"
                  aria-label="Notifications"
                  aria-expanded={open === "notes"}
                  onClick={() => {
                    const opening = open !== "notes";
                    toggle("notes");
                    if (opening && unreadNow > 0) {
                      setUnreadNow(0);
                      void markNotificationsRead();
                    }
                  }}
                >
                  <Ic n="bell" s={18} />
                  {unreadNow > 0 && <span className="dot">{unreadNow > 99 ? "99+" : unreadNow}</span>}
                </button>
                {open === "notes" && (
                  <div className="menu" style={{ minWidth: 300 }}>
                    {notes.length === 0 && <div className="note muted">You are all caught up.</div>}
                    {notes.map((n) => (
                      <Link key={n.id} href={n.href} className="note" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
                        <b>{n.actor}</b> {n.text} <span className="small muted">{n.ago}</span>
                      </Link>
                    ))}
                    <Link href="/notifications" className="note" style={{ display: "block", textAlign: "center", fontWeight: 600, color: "inherit", textDecoration: "none" }}>
                      See all notifications
                    </Link>
                  </div>
                )}
              </div>
              <div className="menuwrap">
                <button type="button" className="me" aria-expanded={open === "me"} onClick={() => toggle("me")}>
                  <ZipAv name={me.full_name} src={me.avatar_url} size="s" />
                  <span>Me</span>
                  <Chev />
                </button>
                {open === "me" && (
                  <div className="menu" style={{ minWidth: 240 }}>
                    <Link href={`/members/${me.id}`}>
                      <b style={{ display: "block" }}>{me.full_name}</b>
                      <span className="muted small">{me.headline || "View your profile"}</span>
                    </Link>
                    <Link href="/profile/edit">Edit profile &amp; headline</Link>
                    <Link href="/network/connections">My connections and invitations</Link>
                    <Link href="/profile/views">Who viewed your profile</Link>
                    <Link href="/settings">Settings &amp; privacy</Link>
                    <Link href="/blocked">Blocked members</Link>
                    <Link href="/feed?saved=1">Saved bookmarks</Link>
                    <Link href="/businesses/mine">My business listings</Link>
                    {isStaff && <Link href="/admin">Admin panel</Link>}
                    <Link href="/billing">Plan and billing</Link>
                    <ThemeToggle label className="themerow" />
                    <SignOutButton className="signout" />
                  </div>
                )}
              </div>
              <Link className="tbtn up" href="/membership-plans">
                <Ic n="crown" />
                Upgrade<span className="upx"> plan</span>
              </Link>
            </>
          ) : (
            <>
              <ThemeToggle className="iconbtn" />
              <Link className="hbtn in" href="/auth/login">
                Sign in
              </Link>
              <Link className="hbtn join" href="/auth/sign-up">
                Join now
              </Link>
            </>
          )}
        </div>

        {open === "about" && (
          <div className="mega">
            <Col title="About SMB Hub" items={ABOUT_MENU} />
            <Col title="SMB resources" items={RESOURCES_MENU} />
            <Col title="Province-wide resources" items={PROVINCE_MENU} />
          </div>
        )}
        {open === "explore" && (
          <div className="mega">
            <Col title="Explore the Hub" items={HUB_MENU} />
            <div className="col">
              <h3>Policies &amp; help</h3>
              {POLICY_MENU.map((l) => (
                <Link key={l.href} href={l.href} className="mlink">
                  {l.label}
                </Link>
              ))}
              <Link href="/membership-plans" className="promo">
                <b>Membership plans</b>More connections, company pages and featured offers.
              </Link>
            </div>
          </div>
        )}
        {open === "team" && (
          <div className="mega teammega">
            {TEAM_MENU.map(([t, items]) => (
              <Col key={t} title={t} items={items} />
            ))}
          </div>
        )}
      </div>
      {palette && <CommandPalette onClose={() => setPalette(false)} signedIn={!!me} />}
    </header>
  );
}
