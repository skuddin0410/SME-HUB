import Link from "next/link";
import { Building2, Home, Search, Users, UsersRound } from "lucide-react";
import { getViewer } from "@/lib/hub";
import { CONTACT, EVENTS } from "@/lib/site";
import { NavLink } from "@/components/hub-client";
import { Logo, SiteNav } from "@/components/site-nav";

export const dynamic = "force-dynamic";

const FOOTER_LINKS = [
  ["Home", "/feed"],
  ["About us", "/about"],
  ["Members", "/members"],
  ["Groups", "/groups"],
  ["Membership plans", "/membership-plans"],
  ["Help", "/help"],
  ["Community guidelines", "/policies/community-guidelines"],
  ["Discrimination policy", "/policies/discrimination-policy"],
  ["Terms and conditions", "/policies/terms"],
];

/** Shell shared by every hub page: top navigation, footer, mobile tab bar. */
export default async function HubShell({ children }: { children: React.ReactNode }) {
  const { supabase, userId, profile, isStaff } = await getViewer();

  const none = Promise.resolve({ count: 0 });
  const [unread, requests, inbox] = await Promise.all([
    userId
      ? supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null)
      : none,
    userId
      ? supabase
          .from("connections")
          .select("requester_id", { count: "exact", head: true })
          .eq("addressee_id", userId)
          .eq("status", "pending")
      : none,
    userId
      ? supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null)
      : none,
  ]);

  const tabs = [
    { href: "/feed", label: "Home", icon: Home },
    { href: "/members", label: "Members", icon: Users },
    { href: "/groups", label: "Groups", icon: UsersRound },
    { href: "/businesses", label: "Businesses", icon: Building2 },
    { href: "/search", label: "Search", icon: Search },
  ];

  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      <SiteNav
        me={profile ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url } : null}
        isStaff={isStaff}
        requests={requests.count ?? 0}
        messages={inbox.count ?? 0}
        unread={unread.count ?? 0}
      />

      {profile?.status === "suspended" && (
        <p className="bg-rose-600 px-3 py-2 text-center text-sm text-white">
          Your account is suspended. You can browse, but you cannot post or comment.
        </p>
      )}

      {children}

      <footer className="mt-8 border-t bg-white">
        <div className="mx-auto grid max-w-[1260px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              A place for small business owners and entrepreneurs to connect and trade experience, tools and advice, from
              financing to expansion.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Explore</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {FOOTER_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-primary hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">CanadianSME Events</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {EVENTS.map((e) => (
                <li key={e.href}>
                  <a href={e.href} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Contact</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{CONTACT.address}</li>
              {CONTACT.phones.map((p) => (
                <li key={p}>
                  <a href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-primary hover:underline">
                    {p}
                  </a>
                </li>
              ))}
              {CONTACT.emails.map((e) => (
                <li key={e}>
                  <a href={`mailto:${e}`} className="hover:text-primary hover:underline">
                    {e}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
          All rights reserved. © {new Date().getFullYear()} Cmarketing Inc.
        </p>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-white/90 backdrop-blur-xl lg:hidden" aria-label="Quick links">
        {tabs.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} variant="bottom">
            <Icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
