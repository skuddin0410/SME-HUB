/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, Ellipsis, Globe, Link2, MessageSquareText, Pencil, SquareArrowOutUpRight } from "lucide-react";
import { AUTHOR_FIELDS, fetchPosts, getLinks, getViewer, MEMBER_TYPES, PAGE_SIZE, type Author, type Profile } from "@/lib/hub";
import { Empty, Pager, PostCard, TierBadge } from "@/components/hub";
import { TwoCol } from "@/components/rails";
import { ConnectButton } from "@/components/network-client";
import { AvatarImg, Cover, SubmitButton } from "@/components/hub-client";
import { blockMember } from "@/app/(hub)/actions";

type Listing = { slug: string; name: string; category: string; logo_url: string | null };

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const page = Number((await searchParams).page) || 1;
  const viewer = await getViewer();
  const { supabase, userId } = viewer;

  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  const member = data as Profile | null;
  if (!member) notFound();
  const isMe = id === userId;

  const [links, posts, listingRows, countRow, otherRows] = await Promise.all([
    getLinks(),
    fetchPosts(supabase, userId, { authorId: id, page }),
    supabase.from("companies").select("slug, name, category, logo_url").eq("owner_id", id).order("created_at").limit(4),
    supabase.rpc("connection_count", { member: id }),
    supabase.from("profiles").select(AUTHOR_FIELDS).neq("id", id).order("created_at", { ascending: false }).limit(8),
  ]);
  const link = links.get(id) ?? "none";
  const listings = (listingRows.data ?? []) as Listing[];
  const connections = typeof countRow.data === "number" ? countRow.data : null;
  const others = ((otherRows.data ?? []) as Author[]).filter((p) => p.id !== userId).slice(0, 5);
  const site = member.website && (member.website.startsWith("http") ? member.website : `https://${member.website}`);

  const solid = "press inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-4 text-base font-semibold text-white transition-colors hover:bg-primary/90";
  const outline = "press inline-flex h-8 items-center gap-1.5 rounded-full border border-primary px-4 text-base font-semibold text-primary transition-colors hover:bg-primary/10 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary))]";
  const round = "press flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-foreground/50 text-foreground/70 transition-colors hover:bg-muted hover:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.5)] [&::-webkit-details-marker]:hidden";
  const section = "panel p-6";

  return (
    <TwoCol
      aside={
        others.length > 0 && (
          <section className="panel px-6 pb-2 pt-5">
            <h2 className="text-xl font-semibold">More profiles for you</h2>
            <ul className="mt-2 divide-y">
              {others.map((p) => (
                <li key={p.id} className="flex gap-2 py-4">
                  <Link href={`/members/${p.id}`} className="shrink-0">
                    <AvatarImg person={p} size={48} />
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/members/${p.id}`} className="block truncate text-base font-semibold leading-tight hover:underline">
                      {p.full_name || "Member"}
                    </Link>
                    <p className="line-clamp-2 text-xs leading-snug">{p.headline || MEMBER_TYPES[p.member_type]}</p>
                    <div className="mt-2">
                      <ConnectButton otherId={p.id} initial={links.get(p.id) ?? "none"} signedIn={!!userId} variant="quiet" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      }
    >
      <section className="panel">
        <Cover seed={member.id} className="aspect-[4/1] min-h-[120px] rounded-t-lg" />
        <div className="relative px-6 pb-6">
          <span className="absolute -top-[112px] left-6 hidden rounded-full border-4 border-white bg-white sm:block">
            <AvatarImg person={member} size={152} />
          </span>
          <span className="absolute -top-[60px] left-4 rounded-full border-4 border-white bg-white sm:hidden">
            <AvatarImg person={member} size={104} />
          </span>
          <div className="flex h-14 items-start justify-end pt-4">
            {isMe && (
              <Link href="/profile/edit" aria-label="Edit profile" title="Edit profile" className="press flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:bg-muted">
                <Pencil className="h-5 w-5" />
              </Link>
            )}
          </div>

          <div className="grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,1fr)_232px]">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="text-2xl font-semibold leading-tight">{member.full_name || "Member"}</h1>
                <TierBadge type={member.member_type} />
                {member.status === "suspended" && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">Suspended</span>}
              </div>
              {member.headline && <p className="mt-1 text-base leading-snug">{member.headline}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                {member.location && <span>{member.location}</span>}
                {member.location && <span aria-hidden="true">·</span>}
                <details className="relative">
                  <summary className="cursor-pointer list-none font-semibold text-primary hover:underline [&::-webkit-details-marker]:hidden">Contact info</summary>
                  <div className="panel absolute left-0 top-full z-20 mt-2 w-72 animate-rise space-y-3 p-4 text-sm text-foreground shadow-xl">
                    <p className="flex items-start gap-3">
                      <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block font-semibold">Profile</span>
                        <Link href={`/members/${id}`} className="block truncate text-primary hover:underline">
                          /members/{id.slice(0, 8)}
                        </Link>
                      </span>
                    </p>
                    {site && (
                      <p className="flex items-start gap-3">
                        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block font-semibold">Website</span>
                          <a href={site} target="_blank" rel="noreferrer nofollow" className="block truncate text-primary hover:underline">
                            {member.website.replace(/^https?:\/\//, "")}
                          </a>
                        </span>
                      </p>
                    )}
                    <p className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="block font-semibold">Joined</span>
                        {new Date(member.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "long" })}
                      </span>
                    </p>
                  </div>
                </details>
              </div>
              {site && (
                <a href={site} target="_blank" rel="noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  {member.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                </a>
              )}
              {connections !== null && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {connections >= 500 ? "500+" : connections} {connections === 1 ? "connection" : "connections"}
                </p>
              )}
            </div>

            {listings.length > 0 && (
              <ul className="space-y-2">
                {listings.slice(0, 2).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/businesses/${c.slug}`} className="group flex items-center gap-2">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                        </span>
                      )}
                      <span className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-primary group-hover:underline">{c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isMe ? (
              <>
                <Link href="/profile/edit" className={solid}>
                  Edit profile
                </Link>
                <Link href="/businesses/mine" className={outline}>
                  My business listings
                </Link>
              </>
            ) : (
              <>
                {link === "connected" ? (
                  <Link href={`/messages?with=${id}`} className={solid}>
                    <MessageSquareText className="h-4 w-4" />
                    Message
                  </Link>
                ) : (
                  <ConnectButton otherId={id} initial={link} signedIn={!!userId} variant="solid" />
                )}
                {site && (
                  <a href={site} target="_blank" rel="noreferrer nofollow" className={outline}>
                    Visit my website
                  </a>
                )}
                {userId && (
                  <details className="relative">
                    <summary aria-label="More actions" className={round}>
                      <Ellipsis className="h-5 w-5" />
                    </summary>
                    <div className="panel absolute left-0 top-full z-20 mt-1 w-56 animate-rise p-1.5 shadow-xl">
                      <form action={blockMember.bind(null, id)}>
                        <SubmitButton tone="ghost">Block {member.full_name.split(" ")[0] || "member"}</SubmitButton>
                      </form>
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
        {member.member_type !== "owner" && (
          <Link href="/membership-plans" className="group flex items-center justify-between rounded-b-lg border-t px-6 py-3 text-sm transition-colors hover:bg-muted/60">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-amber-500" />
              {MEMBER_TYPES[member.member_type]} member
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </section>

      {member.bio && (
        <section className={section}>
          <h2 className="text-xl font-semibold">About</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{member.bio}</p>
        </section>
      )}

      {listings.length > 0 && (
        <section className={section}>
          <h2 className="text-xl font-semibold">Businesses</h2>
          <ul className="mt-1 divide-y">
            {listings.map((c) => (
              <li key={c.slug}>
                <Link href={`/businesses/${c.slug}`} className="group flex items-center gap-3 py-3">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <Building2 className="h-6 w-6" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-base font-semibold leading-tight group-hover:text-primary group-hover:underline">{c.name}</span>
                    {c.category && <span className="block text-sm text-muted-foreground">{c.category}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel px-6 py-5">
        <h2 className="text-xl font-semibold">Activity</h2>
        <p className="text-sm text-muted-foreground">{isMe ? "Your posts" : `Posts by ${member.full_name.split(" ")[0] || "this member"}`}</p>
      </section>
      {posts.length === 0 && (
        <Empty title={isMe ? "You have not posted yet" : "Nothing posted yet"}>
          {isMe ? "Head to the feed and share your first update." : "When this member posts, it will show up here."}
        </Empty>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewer={viewer} />
      ))}
      <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={`/members/${id}`} />
    </TwoCol>
  );
}
