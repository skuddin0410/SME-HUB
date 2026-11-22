/* eslint-disable @next/next/no-img-element */
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, Ellipsis, Globe, Link2, MessageSquareText, Pencil, SquareArrowOutUpRight } from "lucide-react";
import { AUTHOR_FIELDS, DEGREE_LABEL, fetchPosts, getDegrees, getLinks, getViewer, MEMBER_TYPES, PAGE_SIZE, type Author, type Profile } from "@/lib/hub";
import { absolute, jsonLd, pageMeta } from "@/lib/seo";
import { DEMO_IMAGES, demoAvatar } from "@/lib/demo";
import { Empty, Pager, PostCard, TierBadge } from "@/components/hub";
import { TwoCol } from "@/components/rails";
import { ConnectButton } from "@/components/network-client";
import { AvatarImg, Cover, SubmitButton } from "@/components/hub-client";
import { blockMember } from "@/app/(hub)/actions";
import { FollowButton, IntroButton, RecActions, RecommendForm, RequestRecButton, type Candidate } from "@/components/profile-extras";
import { PROFILE_TYPES, RELATIONSHIPS, SOCIAL_NETWORKS } from "@/lib/profile-extra";

type Details = { helps_with: string[]; needs: string[]; availability: string[]; social_links: Record<string, string> };
type Rec = { id: string; author_id: string; relationship: keyof typeof RELATIONSHIPS; body: string; hidden: boolean; created_at: string; author: { id: string; full_name: string; headline: string } | null };

type Listing = { slug: string; name: string; category: string; logo_url: string | null };

const valid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

// one read shared by the page and its search-engine tags
const getMember = cache(async (id: string) => {
  const { supabase } = await getViewer();
  const { data } = await supabase.from("profiles").select("id, full_name, headline, bio, location, website, avatar_url, member_type, profile_type, role, status, created_at").eq("id", id).maybeSingle();
  return data as (Profile & { profile_type: keyof typeof PROFILE_TYPES }) | null;
});

const photo = (m: Profile) => m.avatar_url ?? (DEMO_IMAGES ? demoAvatar(m.id) : null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = valid(id) ? await getMember(id) : null;
  if (!member) return { title: "Member not found" };
  const name = member.full_name || "Member";
  return pageMeta({
    title: member.headline ? `${name} - ${member.headline}` : name,
    description: member.bio || [member.headline, member.location, `${name} is on SMB Hub, Canada's small business network.`].filter(Boolean).join(". "),
    path: `/members/${id}`,
    image: photo(member),
    type: "profile",
    index: member.status === "active",
  });
}

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  if (!valid(id)) notFound();
  const page = Number((await searchParams).page) || 1;
  const viewer = await getViewer();
  const { supabase, userId } = viewer;

  const member = await getMember(id);
  if (!member) notFound();
  const isMe = id === userId;

  // visiting someone else's profile counts as a view (the database skips private browsers and blocked pairs)
  if (userId && !isMe) await supabase.rpc("record_profile_view", { p_id: id });

  const [links, posts, listingRows, countRow, otherRows, mutualRow, detailRows, followerRow, followRow, recRows, askedRows, myRecRows] = await Promise.all([
    getLinks(),
    fetchPosts(supabase, userId, { authorId: id, page }),
    supabase.from("companies").select("slug, name, category, logo_url").eq("owner_id", id).order("created_at").limit(4),
    supabase.rpc("connection_count", { member: id }),
    supabase.from("profiles").select(AUTHOR_FIELDS).neq("id", id).order("created_at", { ascending: false }).limit(8),
    userId && !isMe ? supabase.rpc("mutual_connections", { other: id }) : null,
    supabase.rpc("get_profile_details", { p_ids: [id] }),
    supabase.rpc("follower_count", { member: id }),
    userId && !isMe ? supabase.from("follows").select("followee_id").eq("follower_id", userId).eq("followee_id", id).maybeSingle() : null,
    supabase.from("recommendations").select("id, author_id, relationship, body, hidden, created_at, author:profiles!recommendations_author_id_fkey(id, full_name, headline)").eq("subject_id", id).order("created_at", { ascending: false }).limit(20),
    isMe && userId ? supabase.from("recommendation_requests").select("requester_id, requester:profiles!recommendation_requests_requester_id_fkey(full_name)").eq("asked_id", userId) : null,
    userId && !isMe ? supabase.from("recommendation_requests").select("requester_id").eq("requester_id", userId).eq("asked_id", id).maybeSingle() : null,
  ]);
  const details = ((detailRows.data ?? [])[0] ?? null) as (Details & { user_id: string }) | null;
  const followers = typeof followerRow.data === "number" ? followerRow.data : null;
  const following = !!followRow?.data;
  const recs = ((recRows.data ?? []) as unknown as Rec[]).filter((r) => !r.hidden || isMe || r.author_id === userId);
  const alreadyAsked = !!myRecRows?.data;
  const requests = ((askedRows?.data ?? []) as unknown as { requester_id: string; requester: { full_name: string } | null }[]);
  const myRec = recs.find((r) => r.author_id === userId);
  const candidates: Candidate[] =
    userId && !isMe ? (((await supabase.rpc("intro_candidates", { p_target: id })).data ?? []) as Candidate[]) : [];
  const link = links.get(id) ?? "none";
  const listings = (listingRows.data ?? []) as Listing[];
  const connections = typeof countRow.data === "number" ? countRow.data : null;
  const others = ((otherRows.data ?? []) as Author[]).filter((p) => p.id !== userId).slice(0, 5);
  const degrees = await getDegrees(supabase, userId, [id, ...others.map((p) => p.id)]);
  const degree = degrees.get(id);
  const mutual = typeof mutualRow?.data === "number" ? mutualRow.data : 0;
  const site = member.website && (member.website.startsWith("http") ? member.website : `https://${member.website}`);

  const solid = "press inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-4 text-base font-semibold text-white transition-colors hover:bg-primary/90";
  const outline = "press inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary px-4 text-base font-semibold text-primary transition-colors hover:bg-primary/10 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary))]";
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
                      {degrees.get(p.id) && <span className="text-sm font-normal text-muted-foreground"> · {DEGREE_LABEL[degrees.get(p.id)!]}</span>}
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
      {member.status === "active" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@type": "ProfilePage",
            dateCreated: member.created_at,
            mainEntity: {
              "@type": "Person",
              name: member.full_name,
              description: member.bio || member.headline || undefined,
              jobTitle: member.headline || undefined,
              image: photo(member) ?? undefined,
              url: absolute(`/members/${id}`),
              homeLocation: member.location ? { "@type": "Place", name: member.location } : undefined,
              sameAs: site ? [site] : undefined,
              worksFor: listings.length ? listings.map((c) => ({ "@type": "Organization", name: c.name, url: absolute(`/businesses/${c.slug}`) })) : undefined,
            },
          })}
        />
      )}
      <section className="panel">
        <Cover seed={member.id} className="aspect-[4/1] min-h-[7.5rem] rounded-t-lg" />
        <div className="relative px-6 pb-6">
          <span className="absolute -top-[7rem] left-6 hidden rounded-full border-4 border-white bg-white sm:block">
            <AvatarImg person={member} size={152} />
          </span>
          <span className="absolute -top-[3.75rem] left-4 rounded-full border-4 border-white bg-white sm:hidden">
            <AvatarImg person={member} size={104} />
          </span>
          <div className="flex h-14 items-start justify-end pt-4">
            {isMe && (
              <Link href="/profile/edit" aria-label="Edit profile" title="Edit profile" className="press flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:bg-muted">
                <Pencil className="h-5 w-5" />
              </Link>
            )}
          </div>

          <div className="grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,1fr)_14.5rem]">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="text-2xl font-semibold leading-tight">{member.full_name || "Member"}</h1>
                {degree && <span className="text-sm text-muted-foreground">· {DEGREE_LABEL[degree]}</span>}
                <TierBadge type={member.member_type} />
                {member.profile_type && member.profile_type !== "owner" && <span className="rounded-full bg-muted px-2 py-0.5 text-[0.75rem] font-semibold">{PROFILE_TYPES[member.profile_type]}</span>}
                {member.status === "suspended" && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[0.75rem] font-semibold text-white">Suspended</span>}
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
              {followers !== null && followers > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {followers} {followers === 1 ? "follower" : "followers"}
                </p>
              )}
              {mutual > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {mutual} mutual {mutual === 1 ? "connection" : "connections"}
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
                <FollowButton otherId={id} initial={following} signedIn={!!userId} />
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


      {details && (details.helps_with.length > 0 || details.needs.length > 0 || details.availability.length > 0) && (
        <section className={section}>
          <h2 className="text-xl font-semibold">How I can help</h2>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            {details.helps_with.length > 0 && (
              <div>
                <dt className="font-semibold">Helps with</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">{details.helps_with.map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-1">{t}</span>)}</dd>
              </div>
            )}
            {details.needs.length > 0 && (
              <div>
                <dt className="font-semibold">Looking for</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">{details.needs.map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-1">{t}</span>)}</dd>
              </div>
            )}
            {details.availability.length > 0 && (
              <div>
                <dt className="font-semibold">Free to chat</dt>
                <dd className="mt-1.5 text-muted-foreground">{details.availability.join(", ")}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {details && Object.keys(details.social_links ?? {}).length > 0 && (
        <section className={section}>
          <h2 className="text-xl font-semibold">Find me online</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SOCIAL_NETWORKS.filter(([k]) => details.social_links[k]).map(([k, label]) => (
              <li key={k}>
                <a href={details.social_links[k]} target="_blank" rel="noreferrer nofollow" className="press inline-flex h-8 items-center rounded-xl border px-3 text-sm font-semibold hover:bg-muted">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isMe && userId && candidates.length > 0 && link !== "connected" && (
        <section className={section}>
          <h2 className="text-xl font-semibold">Get a warm introduction</h2>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">You and {member.full_name.split(" ")[0] || "this member"} both know someone. Ask them to make the introduction.</p>
          <IntroButton targetId={id} name={member.full_name.split(" ")[0] || "this member"} candidates={candidates} />
        </section>
      )}

      {(recs.length > 0 || (!isMe && link === "connected") || requests.length > 0) && (
        <section className={section}>
          <h2 className="text-xl font-semibold">Recommendations</h2>
          {isMe && requests.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{requests.map((r) => r.requester?.full_name ?? "A member").join(", ")} asked you for a recommendation.</p>}
          <ul className="mt-2 divide-y">
            {recs.map((r) => (
              <li key={r.id} className="py-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  <Link href={`/members/${r.author_id}`} className="font-semibold text-foreground hover:underline">{r.author?.full_name || "Member"}</Link>
                  <span>{RELATIONSHIPS[r.relationship]} · {new Date(r.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short" })}</span>
                  {r.hidden && <span className="rounded-full bg-muted px-2 py-0.5 text-[0.75rem] font-semibold">Hidden from your profile</span>}
                  <RecActions id={r.id} subjectId={id} hidden={r.hidden} isSubject={isMe} isAuthor={r.author_id === userId} />
                </p>
              </li>
            ))}
          </ul>
          {!isMe && link === "connected" && (
            <div className="mt-3 flex flex-wrap items-start gap-2">
              <RecommendForm subjectId={id} name={member.full_name.split(" ")[0] || "them"} existing={myRec ? { relationship: myRec.relationship, body: myRec.body } : undefined} />
              {!alreadyAsked && <RequestRecButton askedId={id} name={member.full_name.split(" ")[0] || "them"} />}
            </div>
          )}
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
