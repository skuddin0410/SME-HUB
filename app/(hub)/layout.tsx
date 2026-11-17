/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Building2, Facebook, Home, Instagram, Linkedin, Search, Twitter, Users, UsersRound, Youtube } from "lucide-react";
import { AUTHOR_FIELDS, getViewer, type Author } from "@/lib/hub";
import { ARTICLES, CONTACT, EVENTS, SOCIAL } from "@/lib/site";
import { AvatarImg, Cover, NavLink } from "@/components/hub-client";
import { Logo, SiteNav } from "@/components/site-nav";
import { GroupLine, TierBadge } from "@/components/hub";

export const dynamic = "force-dynamic";

type GroupRow = { slug: string; name: string; is_private: boolean; group_members: { count: number }[] };
type Company = { id: string; slug: string; name: string; category: string; logo_url: string | null };

const SOCIALS = [
  { label: "Facebook", href: SOCIAL.facebook, icon: Facebook },
  { label: "X", href: SOCIAL.x, icon: Twitter },
  { label: "YouTube", href: SOCIAL.youtube, icon: Youtube },
  { label: "Instagram", href: SOCIAL.instagram, icon: Instagram },
  { label: "LinkedIn", href: SOCIAL.linkedin, icon: Linkedin },
];

const FOOTER_LINKS = [
  ["Home", "/feed"],
  ["About us", "/about"],
  ["Members", "/members"],
  ["Groups", "/groups"],
  ["Membership plans", "/membership-plans"],
  ["Help", "/help"],
];

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, profile, isStaff } = await getViewer();

  const none = Promise.resolve({ count: 0 });
  const [unread, requests, connections, posts, people, groups, companies] = await Promise.all([
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
      ? supabase.from("connections").select("requester_id", { count: "exact", head: true }).eq("status", "accepted")
      : none,
    userId ? supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId) : none,
    supabase.from("profiles").select(AUTHOR_FIELDS).order("created_at", { ascending: false }).limit(11),
    supabase.from("groups").select("slug, name, is_private, group_members(count)").order("created_at", { ascending: false }).limit(4),
    supabase.from("companies").select("id, slug, name, category, logo_url").order("created_at", { ascending: false }).limit(5),
  ]);
  const members = ((people.data ?? []) as Author[]).filter((p) => p.id !== userId).slice(0, 10);
  const newGroups = (groups.data ?? []) as unknown as GroupRow[];
  const businesses = (companies.data ?? []) as Company[];

  const filled = profile
    ? [profile.full_name, profile.headline, profile.bio, profile.location, profile.website, profile.avatar_url].filter(Boolean).length
    : 0;
  const done = Math.round((filled / 6) * 100);

  const card = "panel p-5";
  const railTitle = "mb-4 font-display text-xl font-semibold";
  const seeAll = "mt-4 inline-block rounded-lg bg-muted px-3 py-1.5 text-xs font-bold tracking-wide transition-colors hover:bg-primary/10 hover:text-primary";
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
        unread={unread.count ?? 0}
      />

      {profile?.status === "suspended" && (
        <p className="bg-rose-600 px-3 py-2 text-center text-sm text-white">
          Your account is suspended. You can browse, but you cannot post or comment.
        </p>
      )}

      <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-7 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="hidden space-y-6 lg:block">
          {profile && (
            <div className="panel overflow-hidden">
              <Cover seed={profile.id} className="h-16" />
              <div className="-mt-8 px-5 pb-5">
                <Link href={`/members/${userId}`} className="relative inline-block rounded-full ring-4 ring-white">
                  <AvatarImg person={profile} size={64} />
                </Link>
                <Link href={`/members/${userId}`} className="mt-2 block font-display text-lg font-semibold leading-tight hover:underline">
                  {profile.full_name}
                </Link>
                <p className="text-sm text-muted-foreground">{profile.headline || "Add a headline to your profile"}</p>
                <div className="mt-2">
                  <TierBadge type={profile.member_type} />
                </div>
                {done < 100 && (
                  <Link href="/profile/edit" className="mt-4 block rounded-xl bg-muted p-3 transition-colors hover:bg-primary/10">
                    <span className="flex items-center justify-between text-xs font-semibold">
                      Profile strength <span className="text-primary">{done}%</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${done}%` }} />
                    </span>
                  </Link>
                )}
                <dl className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-center">
                  <Link href="/network" className="rounded-lg py-1 hover:bg-muted">
                    <dd className="font-display text-xl font-bold">{connections.count ?? 0}</dd>
                    <dt className="text-xs text-muted-foreground">Connections</dt>
                  </Link>
                  <Link href={`/members/${userId}`} className="rounded-lg py-1 hover:bg-muted">
                    <dd className="font-display text-xl font-bold">{posts.count ?? 0}</dd>
                    <dt className="text-xs text-muted-foreground">Posts</dt>
                  </Link>
                </dl>
              </div>
            </div>
          )}

          <section className={card}>
            <h2 className={railTitle}>Recent Articles</h2>
            <ul className="space-y-4">
              {ARTICLES.map((a) => (
                <li key={a.href}>
                  <a href={a.href} target="_blank" rel="noreferrer" className="group flex items-center gap-3">
                    <img
                      src={a.image}
                      alt=""
                      loading="lazy"
                      className="cover h-11 w-11 shrink-0 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="line-clamp-2 text-sm leading-snug transition-colors group-hover:text-primary">{a.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {businesses.length > 0 && (
            <section className={card}>
              <h2 className={railTitle}>Business List</h2>
              <ul className="space-y-4">
                {businesses.map((b) => (
                  <li key={b.id}>
                    <Link href={`/businesses?q=${encodeURIComponent(b.name)}`} className="group flex items-center gap-3">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-muted object-cover" />
                      ) : (
                        <span className="cover flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-semibold text-white">
                          {b.name.charAt(0)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold transition-colors group-hover:text-primary">{b.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{b.category}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/businesses" className={seeAll}>
                See all
              </Link>
            </section>
          )}
        </aside>

        <main className="flex min-w-0 flex-col gap-4">{children}</main>

        <aside className="hidden space-y-6 lg:block">
          <section className={card}>
            <h2 className={railTitle}>Follow Us on Social Media</h2>
            <div className="flex gap-2">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="press flex h-10 w-10 items-center justify-center rounded-full border text-foreground/70 transition-colors hover:border-primary hover:bg-primary hover:text-white"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </section>

          {members.length > 0 && (
            <section className={card}>
              <h2 className={railTitle}>Recently Active Members</h2>
              <div className="grid grid-cols-5 gap-2.5">
                {members.map((m) => (
                  <Link key={m.id} href={`/members/${m.id}`} title={m.full_name} className="transition-transform duration-200 hover:scale-110">
                    <AvatarImg person={m} size={44} />
                  </Link>
                ))}
              </div>
              <Link href="/members" className={seeAll}>
                See all
              </Link>
            </section>
          )}

          {newGroups.length > 0 && (
            <section className={card}>
              <h2 className={railTitle}>Groups to Explore</h2>
              <div className="space-y-3">
                {newGroups.map((g) => (
                  <GroupLine key={g.slug} group={{ ...g, members: g.group_members[0]?.count ?? 0 }} />
                ))}
              </div>
              <Link href="/groups" className={seeAll}>
                See all
              </Link>
            </section>
          )}
        </aside>
      </div>

      <footer className="mt-8 border-t bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
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
                  <Link href={href} className="hover:text-primary">
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
                  <a href={e.href} target="_blank" rel="noreferrer" className="hover:text-primary">
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
                  <a href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-primary">
                    {p}
                  </a>
                </li>
              ))}
              {CONTACT.emails.map((e) => (
                <li key={e}>
                  <a href={`mailto:${e}`} className="hover:text-primary">
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
