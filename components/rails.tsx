/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChevronRight, Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { AUTHOR_FIELDS, getViewer, type Author } from "@/lib/hub";
import { ARTICLES, SOCIAL } from "@/lib/site";
import { AvatarImg, Cover } from "@/components/hub-client";
import { GroupLine, TierBadge } from "@/components/hub";

type GroupRow = { slug: string; name: string; is_private: boolean; group_members: { count: number }[] };
type Company = { id: string; name: string; category: string; logo_url: string | null };

const SOCIALS = [
  { label: "Facebook", href: SOCIAL.facebook, icon: Facebook },
  { label: "X", href: SOCIAL.x, icon: Twitter },
  { label: "YouTube", href: SOCIAL.youtube, icon: Youtube },
  { label: "Instagram", href: SOCIAL.instagram, icon: Instagram },
  { label: "LinkedIn", href: SOCIAL.linkedin, icon: Linkedin },
];

const card = "panel p-3";
const railTitle = "mb-3 text-base font-semibold";
const seeAll = "mt-3 inline-flex items-center gap-1 rounded px-1 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/** Identity card: cover, photo, name, headline, location. Sits at the top of the left rail. */
export async function ProfileCard() {
  const { supabase, userId, profile } = await getViewer();
  if (!profile || !userId) {
    return (
      <div className="cover overflow-hidden rounded-lg p-4 text-white">
        <p className="text-lg font-semibold leading-snug">Where Canadian small business owners meet.</p>
        <p className="mt-1.5 text-xs text-white/85">Ask questions, share what is working and find the people who can help you grow.</p>
        <Link href="/auth/sign-up" className="press mt-3 block rounded-full bg-white py-1.5 text-center text-sm font-semibold text-primary">
          Join free
        </Link>
        <Link href="/auth/login" className="mt-2 block text-center text-xs text-white/85 hover:text-white hover:underline">
          I already have an account
        </Link>
      </div>
    );
  }

  const [connections, posts] = await Promise.all([
    supabase.from("connections").select("requester_id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
  ]);
  const filled = [profile.full_name, profile.headline, profile.bio, profile.location, profile.website, profile.avatar_url].filter(Boolean).length;
  const done = Math.round((filled / 6) * 100);
  const row = "flex items-center justify-between rounded px-3 py-1 text-xs font-semibold transition-colors hover:bg-muted";

  return (
    <>
      <div className="panel overflow-hidden">
        <Cover seed={profile.id} className="h-14" />
        <div className="-mt-9 px-3 pb-3">
          <Link href={`/members/${userId}`} className="relative inline-block rounded-full ring-2 ring-white">
            <AvatarImg person={profile} size={72} />
          </Link>
          <Link href={`/members/${userId}`} className="mt-1 block truncate text-xl font-semibold leading-tight hover:underline">
            {profile.full_name}
          </Link>
          <p className="text-xs">{profile.headline || "Add a headline"}</p>
          {profile.location && <p className="mt-1 text-xs text-muted-foreground">{profile.location}</p>}
          <div className="mt-2">
            <TierBadge type={profile.member_type} />
          </div>
          {done < 100 && (
            <Link href="/profile/edit" className="mt-3 block rounded border border-dashed border-foreground/50 px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-muted">
              <span className="flex items-center justify-between">
                Profile strength <span className="text-primary">{done}%</span>
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${done}%` }} />
              </span>
            </Link>
          )}
        </div>
      </div>

      <div className="panel py-2">
        <Link href="/network" className={row}>
          <span>
            Connections
            <span className="block font-normal text-muted-foreground">Grow your network</span>
          </span>
          <span className="text-base text-primary">{connections.count ?? 0}</span>
        </Link>
        <Link href={`/members/${userId}`} className={row}>
          <span className="py-1">Your posts</span>
          <span className="text-base text-primary">{posts.count ?? 0}</span>
        </Link>
      </div>

      <div className="panel py-2">
        {[
          ["Messages", "/messages"],
          ["Groups", "/groups"],
          ["My business listings", "/businesses/mine"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className={`${row} py-1.5`}>
            {label}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </>
  );
}

export function ArticlesCard() {
  return (
    <section className={card}>
      <h2 className={railTitle}>Recent Articles</h2>
      <ul className="space-y-3">
        {ARTICLES.map((a) => (
          <li key={a.href}>
            <a href={a.href} target="_blank" rel="noreferrer" className="group flex items-center gap-3">
              <img src={a.image} alt="" loading="lazy" className="cover h-11 w-11 shrink-0 rounded object-cover" />
              <span className="line-clamp-2 text-xs font-semibold leading-snug transition-colors group-hover:text-primary group-hover:underline">{a.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function BusinessCard() {
  const { supabase } = await getViewer();
  const { data } = await supabase.from("companies").select("id, name, category, logo_url").order("created_at", { ascending: false }).limit(5);
  const businesses = (data ?? []) as Company[];
  if (businesses.length === 0) return null;
  return (
    <section className={card}>
      <h2 className={railTitle}>Business List</h2>
      <ul className="space-y-3">
        {businesses.map((b) => (
          <li key={b.id}>
            <Link href={`/businesses?q=${encodeURIComponent(b.name)}`} className="group flex items-center gap-3">
              {b.logo_url ? (
                <img src={b.logo_url} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded bg-muted object-cover" />
              ) : (
                <span className="cover flex h-11 w-11 shrink-0 items-center justify-center rounded font-semibold text-white">{b.name.charAt(0)}</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold group-hover:text-primary group-hover:underline">{b.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{b.category}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/businesses" className={seeAll}>
        Show all <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

export function SocialCard() {
  return (
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
  );
}

export async function ActiveMembersCard() {
  const { supabase, userId } = await getViewer();
  const { data } = await supabase.from("profiles").select(AUTHOR_FIELDS).order("created_at", { ascending: false }).limit(11);
  const members = ((data ?? []) as Author[]).filter((p) => p.id !== userId).slice(0, 10);
  if (members.length === 0) return null;
  return (
    <section className={card}>
      <h2 className={railTitle}>Recently Active Members</h2>
      <div className="grid grid-cols-5 gap-2.5">
        {members.map((m) => (
          <Link key={m.id} href={`/members/${m.id}`} title={m.full_name} className="transition-transform duration-150 hover:scale-110">
            <AvatarImg person={m} size={44} />
          </Link>
        ))}
      </div>
      <Link href="/members" className={seeAll}>
        Show all <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

export async function GroupsCard() {
  const { supabase } = await getViewer();
  const { data } = await supabase.from("groups").select("slug, name, is_private, group_members(count)").order("created_at", { ascending: false }).limit(4);
  const groups = (data ?? []) as unknown as GroupRow[];
  if (groups.length === 0) return null;
  return (
    <section className={card}>
      <h2 className={railTitle}>Groups to Explore</h2>
      <div className="space-y-3">
        {groups.map((g) => (
          <GroupLine key={g.slug} group={{ ...g, members: g.group_members[0]?.count ?? 0 }} />
        ))}
      </div>
      <Link href="/groups" className={seeAll}>
        Show all <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
