import Link from "next/link";
import { Bookmark, ChevronRight, Facebook, Instagram, Linkedin, MessageCircle, Store, Twitter, UsersRound, Youtube } from "lucide-react";
import { AUTHOR_FIELDS, getViewer, type Author } from "@/lib/hub";
import { SOCIAL } from "@/lib/site";
import { profileStrength } from "@/lib/profile-extra";
import { BLOG } from "@/lib/content";
import { AvatarImg, GroupLogo, Thumb } from "@/components/hub-client";
import { ComposeLink, JoinGroupButton } from "@/components/feed-client";

type GroupRow = { id: string; slug: string; name: string; is_private: boolean; group_members: { count: number }[] };

const SOCIALS = [
  { label: "Facebook", href: SOCIAL.facebook, icon: Facebook },
  { label: "X", href: SOCIAL.x, icon: Twitter },
  { label: "YouTube", href: SOCIAL.youtube, icon: Youtube },
  { label: "Instagram", href: SOCIAL.instagram, icon: Instagram },
  { label: "LinkedIn", href: SOCIAL.linkedin, icon: Linkedin },
];

// design: docs/design/feed.html
const SHOW_ALL = "mt-3.5 pt-2.5 border-t border-[#E5E5E8] w-full flex items-center justify-between text-xs font-semibold text-zinc-800 hover:text-blue-600 transition-colors";
const QUICK_ROW = "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-800 hover:bg-[#F5F5F6] hover:text-zinc-900 transition-colors";

/** Right rail: identity card with profile strength and counts (the profile card sits on the right, unlike LinkedIn). */
export async function ProfileCard() {
  const { supabase, userId, profile } = await getViewer();
  if (!profile || !userId) return <FoundingCard />;

  const [connections, posts, details, businesses, recs] = await Promise.all([
    supabase.rpc("connection_count", { member: userId }),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase.from("profile_details").select("helps_with, needs").eq("user_id", userId).maybeSingle(),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    supabase.from("recommendations").select("id", { count: "exact", head: true }).eq("subject_id", userId).eq("hidden", false),
  ]);
  const strength = profileStrength({ ...profile, helps_with: details.data?.helps_with, needs: details.data?.needs, has_business: (businesses.count ?? 0) > 0, recommendations: recs.count ?? 0 });
  const done = strength.percent;

  return (
    <>
      <div className="panel overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-zinc-800 via-zinc-800 to-zinc-700" />
        <div className="px-4 pb-4">
          <div className="-mt-8 mb-3 flex items-end justify-between">
            <Link href={`/members/${userId}`} className="relative">
              <span className="block w-16 h-16 rounded-2xl overflow-hidden border-[0.1875rem] border-white shadow-sm bg-zinc-100 [&_img]:!rounded-none [&_span]:!rounded-none">
                <AvatarImg person={profile} size={58} />
              </span>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Online now" />
            </Link>
            <Link href="/profile/edit" className="text-[0.75rem] font-medium px-2.5 py-1 rounded-lg bg-[#F5F5F6] hover:bg-[#E5E5E8] text-zinc-800 transition-colors">
              Edit
            </Link>
          </div>

          <div>
            <Link href={`/members/${userId}`} className="block font-display font-bold text-[1rem] text-zinc-900 leading-snug hover:underline">
              {profile.full_name}
            </Link>
            <Link href="/profile/edit" className="mt-0.5 block text-left text-xs text-zinc-500 hover:text-blue-600 transition-colors">
              {profile.headline || "+ Add a headline"}
            </Link>
          </div>

          {done < 100 && (
            <div className="mt-4 p-3 rounded-xl bg-[#F5F5F6]/80 border border-[#E5E5E8]/90">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-zinc-800">Profile strength</span>
                <span className="font-display font-bold text-blue-600">{done}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-200/80 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500" style={{ width: `${done}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[0.75rem] text-zinc-500">
                  {strength.next} (+{strength.step}%)
                </span>
                <Link href="/profile/edit" className="text-[0.75rem] font-semibold text-blue-600 hover:underline">
                  Complete →
                </Link>
              </div>
            </div>
          )}

          <div className="mt-3.5 pt-3.5 border-t border-[#E5E5E8] grid grid-cols-2 divide-x divide-[#E5E5E8]">
            <Link href="/network/connections" className="pr-3 text-left group">
              <span className="block text-[0.75rem] text-zinc-500 group-hover:text-zinc-900 transition-colors">Connections</span>
              <span className="flex items-baseline justify-between mt-0.5">
                <span className="font-display font-bold text-sm text-blue-600">{(connections.data as number | null) ?? 0}</span>
                <span className="text-[0.6562rem] text-zinc-400 group-hover:text-blue-600">Grow</span>
              </span>
            </Link>
            <Link href="/profile/views" className="col-span-2 mt-3 border-t border-[#E5E5E8] pt-3 text-[0.75rem] font-semibold text-blue-600 hover:underline">
              Who viewed your profile →
            </Link>
            <ComposeLink className="pl-3 text-left group">
              <span className="block text-[0.75rem] text-zinc-500 group-hover:text-zinc-900 transition-colors">Your posts</span>
              <span className="flex items-baseline justify-between mt-0.5">
                <span className="font-display font-bold text-sm text-zinc-900">{posts.count ?? 0}</span>
                <span className="text-[0.6562rem] text-zinc-400 group-hover:text-blue-600">+ New</span>
              </span>
            </ComposeLink>
          </div>
        </div>
      </div>
    </>
  );
}

export function ArticlesCard() {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-500">Recent Articles</h3>
        <span className="text-[0.6562rem] font-medium px-1.5 py-0.5 rounded bg-[#F5F5F6] text-zinc-600">CA Editorial</span>
      </div>
      <div className="space-y-2.5">
        {BLOG.slice(0, 6).map((a) => (
          <Link key={a.slug} href={`/blog/${a.slug}`} className="w-full flex items-center gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-[#F5F5F6] text-left group transition-colors">
            <Thumb src={a.image} className="w-10 h-10 rounded-lg shrink-0 border border-[#E5E5E8]" />
            <span className="min-w-0 flex-1">
              <span className="text-xs font-medium text-zinc-900 group-hover:text-blue-600 leading-snug line-clamp-2 transition-colors">{a.title}</span>
              <span className="text-[0.6562rem] text-zinc-400 mt-0.5 block">CanadianSME Magazine</span>
            </span>
          </Link>
        ))}
      </div>
      <Link href="/blog" className={SHOW_ALL.replace("mt-3.5", "mt-3")}>
        <span>See all articles</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/** Right rail, top: the newest members, with a link to everyone. */
export async function ActiveMembersCard() {
  const { supabase, userId } = await getViewer();
  const { data } = await supabase.from("profiles").select(AUTHOR_FIELDS).order("created_at", { ascending: false }).limit(11);
  const members = ((data ?? []) as Author[]).filter((p) => p.id !== userId).slice(0, 10);
  if (members.length === 0) return null;
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <h3 className="font-display font-bold text-[0.875rem] text-zinc-900">Newest Members</h3>
        </div>
        <span className="text-[0.75rem] text-zinc-400">Say hello</span>
      </div>
      <div className="grid grid-cols-5 gap-2.5">
        {members.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            title={`${m.full_name}${m.headline ? ` • ${m.headline}` : ""}`}
            className="relative group focus:outline-none rounded-full [&_img]:ring-1 [&_img]:ring-[#E5E5E8] [&_img]:transition-all group-hover:[&_img]:ring-2 group-hover:[&_img]:ring-blue-600 hover:scale-105 transition-transform"
          >
            <AvatarImg person={m} size={40} />
          </Link>
        ))}
      </div>
      <Link href="/members" className={SHOW_ALL}>
        <span>Show all</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export async function GroupsCard() {
  const { supabase, userId } = await getViewer();
  const [{ data }, mine] = await Promise.all([
    supabase.from("groups").select("id, slug, name, is_private, group_members(count)").order("created_at", { ascending: false }).limit(4),
    userId ? supabase.from("group_members").select("group_id").eq("user_id", userId) : Promise.resolve({ data: [] as { group_id: string }[] }),
  ]);
  const groups = (data ?? []) as unknown as GroupRow[];
  if (groups.length === 0) return null;
  const joined = new Set(((mine.data ?? []) as { group_id: string }[]).map((m) => m.group_id));
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-[0.875rem] text-zinc-900">Groups to Explore</h3>
        <span className="text-[0.6562rem] font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F6] text-zinc-600">Canada</span>
      </div>
      <div className="space-y-2.5">
        {groups.map((g) => {
          const members = g.group_members[0]?.count ?? 0;
          return (
            <div key={g.id} className="flex items-center justify-between gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-[#F5F5F6]/70 transition-colors">
              <Link href={`/groups/${g.slug}`} className="flex items-center gap-2.5 min-w-0">
                <GroupLogo seed={g.slug} name={g.name} size={36} className="!rounded-xl border border-[#E5E5E8]" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-zinc-900 truncate">{g.name}</span>
                  <span className="block text-[0.75rem] text-zinc-500">
                    {members} {members === 1 ? "member" : "members"}
                    {g.is_private ? " • private" : ""}
                  </span>
                </span>
              </Link>
              {g.is_private ? (
                <Link href={`/groups/${g.slug}`} className="shrink-0 px-2.5 py-1 rounded-lg text-[0.75rem] font-semibold bg-[#F5F5F6] hover:bg-zinc-900 text-zinc-800 hover:text-white transition-all">
                  View
                </Link>
              ) : (
                <JoinGroupButton groupId={g.id} initial={joined.has(g.id)} signedIn={!!userId} />
              )}
            </div>
          );
        })}
      </div>
      <Link href="/groups" className={SHOW_ALL}>
        <span>Show all</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/** Right rail, top: SMB Hub's social accounts. */
export function SocialCard() {
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-[0.875rem] text-zinc-900">Follow Us on Social Media</span>
        <span className="text-[0.6562rem] font-medium text-zinc-400">@canadiansme</span>
      </div>
      <div className="flex items-center justify-between gap-1.5">
        {SOCIALS.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="w-9 h-9 rounded-full bg-[#F5F5F6] hover:bg-zinc-900 text-zinc-600 hover:text-white flex items-center justify-center transition-colors"
          >
            <Icon className="w-4 h-4" />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Profile-style pages: a wide main column and one right column. */
export function TwoCol({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="max-w-[96rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <main className="lg:col-span-9 flex min-w-0 flex-col gap-4">{children}</main>
      <aside className="lg:col-span-3 hidden space-y-4 lg:block">{aside}</aside>
    </div>
  );
}

/** Left rail for visitors: what the Hub is, and how to join. */
export function VisitorCard() {
  return (
    <div className="panel overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-zinc-800 via-zinc-800 to-zinc-700" />
      <div className="p-4 space-y-2">
        <p className="font-display font-bold text-[1rem] text-zinc-900 leading-snug">Where Canadian business owners meet.</p>
        <p className="text-xs text-zinc-500">Ask questions, share what is working and find the people who can help you grow.</p>
        <Link href="/auth/sign-up" className="block w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold text-center shadow-sm transition-colors">
          Join free
        </Link>
        <Link href="/auth/login" className="block text-center text-[0.75rem] font-medium text-blue-600 hover:underline">
          I already have an account
        </Link>
      </div>
    </div>
  );
}

/** Left rail for members: Messages, Groups, My businesses, Saved bookmarks. */
export async function QuickLinks() {
  const { supabase, userId } = await getViewer();
  if (!userId) return <VisitorCard />;
  const [inbox, saved] = await Promise.all([
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null),
    supabase.from("saved_posts").select("post_id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const unread = inbox.count ?? 0;
  return (
    <div className="panel p-1.5">
      <Link href="/messages" className={QUICK_ROW}>
        <span className="flex items-center gap-2.5">
          <MessageCircle className="w-4 h-4 text-zinc-400" />
          <span>Messages</span>
        </span>
        <span className="flex items-center gap-1.5">
          {unread > 0 && <span className="px-1.5 rounded-full text-[0.6562rem] font-semibold bg-rose-50 text-rose-600">{unread}</span>}
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        </span>
      </Link>
      <Link href="/groups" className={QUICK_ROW}>
        <span className="flex items-center gap-2.5">
          <UsersRound className="w-4 h-4 text-zinc-400" />
          <span>Groups</span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
      </Link>
      <Link href="/businesses/mine" className={QUICK_ROW}>
        <span className="flex items-center gap-2.5">
          <Store className="w-4 h-4 text-zinc-400" />
          <span>My business listings</span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
      </Link>
      <Link href="/feed?saved=1" className={QUICK_ROW}>
        <span className="flex items-center gap-2.5">
          <Bookmark className="w-4 h-4 text-zinc-400" />
          <span>Saved bookmarks</span>
        </span>
        <span className="text-[0.75rem] font-semibold text-zinc-400">{saved.count ?? 0}</span>
      </Link>
    </div>
  );
}

/** Right rail for visitors: the Founding Member offer. */
export function FoundingCard() {
  return (
    <div className="rounded-2xl bg-zinc-950 p-5 text-white dark:bg-[#262C3A]">
      <span className="inline-block rounded-md bg-[#D42A2A] px-2 py-0.5 text-[0.75rem] font-semibold">Founding Member</span>
      <p className="mt-3 font-display text-lg font-bold leading-snug">Be one of the first 500 members.</p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-white/80">Join now and keep a permanent Founding Member badge on your profile.</p>
      <Link href="/auth/sign-up" className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-4 text-[0.875rem] font-semibold text-zinc-900 hover:bg-zinc-100">
        Claim my badge
      </Link>
    </div>
  );
}
