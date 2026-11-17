import Link from "next/link";
import { Bell, Home, Search, UserPlus, Users, UsersRound } from "lucide-react";
import { AUTHOR_FIELDS, getViewer, type Author } from "@/lib/hub";
import { AvatarImg, BrandLogo, NavLink, SignOutButton } from "@/components/hub-client";
import { GroupLine, PersonLine, TierBadge } from "@/components/hub";

export const dynamic = "force-dynamic";

type GroupRow = { slug: string; name: string; is_private: boolean; group_members: { count: number }[] };

const CSME_LINKS = [
  { label: "CanadianSME Magazine", href: "https://canadiansme.ca/" },
  { label: "Small Business Expo", href: "https://smeexpo.ca/" },
  { label: "Small Business Summit", href: "https://smesummit.ca/" },
  { label: "Small Business Awards", href: "https://smeawards.ca/" },
  { label: "Small Business Podcast", href: "https://smbpodcast.ca/" },
];

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, profile, isStaff } = await getViewer();

  const none = Promise.resolve({ count: 0 });
  const [unread, requests, connections, posts, people, groups] = await Promise.all([
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
    supabase.from("profiles").select(AUTHOR_FIELDS).order("created_at", { ascending: false }).limit(5),
    supabase.from("groups").select("slug, name, is_private, group_members(count)").order("created_at", { ascending: false }).limit(4),
  ]);
  const newMembers = ((people.data ?? []) as Author[]).filter((p) => p.id !== userId).slice(0, 4);
  const newGroups = (groups.data ?? []) as unknown as GroupRow[];

  const nav = [
    { href: "/feed", label: "Home", icon: Home, badge: 0, guest: true },
    { href: "/members", label: "Members", icon: Users, badge: 0, guest: true },
    { href: "/groups", label: "Groups", icon: UsersRound, badge: 0, guest: true },
    { href: "/network", label: "Network", icon: UserPlus, badge: requests.count ?? 0, guest: false },
    { href: "/notifications", label: "Alerts", icon: Bell, badge: unread.count ?? 0, guest: false },
  ].filter((n) => n.guest || userId);

  const card = "panel p-4";
  const railTitle = "mb-3 font-display text-[15px] font-semibold";

  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      <header className="sticky top-0 z-30" style={{ background: "hsl(var(--ink))" }}>
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <BrandLogo />
          <form action="/search" className="relative hidden max-w-xs flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              name="q"
              placeholder="Search people, groups and posts"
              aria-label="Search"
              className="w-full rounded-full bg-white/10 py-2 pl-9 pr-4 text-sm text-white outline-none transition placeholder:text-white/50 focus:bg-white/15 focus:ring-2 focus:ring-white/30"
            />
          </form>
          <nav className="ml-auto hidden items-center lg:flex" aria-label="Main">
            {nav.map(({ href, label, icon: Icon, badge }) => (
              <NavLink key={href} href={href} label={label} badge={badge}>
                <Icon className="h-5 w-5" />
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <Link href="/search" className="rounded-full p-2 text-white/70 md:hidden" aria-label="Search">
              <Search className="h-5 w-5" />
            </Link>
            {profile ? (
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center rounded-full ring-2 ring-white/20 transition hover:ring-white/50 [&::-webkit-details-marker]:hidden">
                  <AvatarImg person={profile} size={34} />
                </summary>
                <div className="panel absolute right-0 mt-2 w-56 animate-rise p-1.5 text-sm">
                  <p className="truncate px-3 py-2 font-semibold">{profile.full_name}</p>
                  {[
                    { href: `/members/${userId}`, label: "View profile" },
                    { href: "/profile/edit", label: "Edit profile" },
                    ...(isStaff ? [{ href: "/admin", label: "Admin panel" }] : []),
                  ].map((l) => (
                    <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 hover:bg-muted">
                      {l.label}
                    </Link>
                  ))}
                  <SignOutButton className="block w-full rounded-lg px-3 py-2 text-left text-primary hover:bg-muted" />
                </div>
              </details>
            ) : (
              <>
                <Link href="/auth/login" className="press rounded-full px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/10">
                  Sign in
                </Link>
                <Link href="/auth/sign-up" className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {profile?.status === "suspended" && (
        <p className="bg-primary px-3 py-2 text-center text-sm text-white">
          Your account is suspended. You can browse, but you cannot post or comment.
        </p>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {profile ? (
              <div className="panel overflow-hidden">
                <div className="h-14" style={{ background: "hsl(var(--ink))" }} />
                <div className="-mt-8 px-4 pb-4">
                  <Link href={`/members/${userId}`} className="inline-block rounded-full ring-4 ring-white">
                    <AvatarImg person={profile} size={64} />
                  </Link>
                  <Link href={`/members/${userId}`} className="mt-2 block font-display text-lg font-semibold leading-tight hover:underline">
                    {profile.full_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{profile.headline || "Add a headline to your profile"}</p>
                  <div className="mt-2">
                    <TierBadge type={profile.member_type} />
                  </div>
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
            ) : (
              <div className="rounded-2xl p-5 text-white" style={{ background: "hsl(var(--ink))" }}>
                <p className="font-display text-xl font-bold leading-snug">Where Canadian small business owners meet.</p>
                <p className="mt-2 text-sm text-white/70">
                  Ask questions, share what is working and find the people who can help you grow.
                </p>
                <Link href="/auth/sign-up" className="press mt-4 block rounded-full bg-primary py-2.5 text-center text-sm font-semibold">
                  Join free
                </Link>
                <Link href="/auth/login" className="mt-2 block text-center text-sm text-white/70 hover:text-white">
                  I already have an account
                </Link>
              </div>
            )}
            <p className="px-1 text-xs text-muted-foreground">CanadianSME Hub, by Cmarketing Inc.</p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-4">{children}</main>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {newMembers.length > 0 && (
              <section className={card}>
                <h2 className={railTitle}>New on the Hub</h2>
                <div className="space-y-3">
                  {newMembers.map((p) => (
                    <PersonLine key={p.id} person={p} size={38} />
                  ))}
                </div>
                <Link href="/members" className="mt-3 block text-sm font-semibold text-primary hover:underline">
                  See all members
                </Link>
              </section>
            )}
            {newGroups.length > 0 && (
              <section className={card}>
                <h2 className={railTitle}>Groups to explore</h2>
                <div className="space-y-3">
                  {newGroups.map((g) => (
                    <GroupLine key={g.slug} group={{ ...g, members: g.group_members[0]?.count ?? 0 }} />
                  ))}
                </div>
                <Link href="/groups" className="mt-3 block text-sm font-semibold text-primary hover:underline">
                  Browse groups
                </Link>
              </section>
            )}
            <section className={card}>
              <h2 className={railTitle}>From CanadianSME</h2>
              <ul className="space-y-2 text-sm">
                {CSME_LINKS.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary hover:underline">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-white lg:hidden" aria-label="Main">
        {nav.map(({ href, label, icon: Icon, badge }) => (
          <NavLink key={href} href={href} label={label} badge={badge} variant="bottom">
            <Icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
