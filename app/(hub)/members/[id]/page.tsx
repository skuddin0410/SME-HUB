import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Globe, MapPin } from "lucide-react";
import { fetchPosts, getViewer, PAGE_SIZE, type Profile } from "@/lib/hub";
import { ConnectControl, Empty, Pager, PostCard, TierBadge, type Link_ } from "@/components/hub";
import { AvatarImg, Cover, SubmitButton } from "@/components/hub-client";
import { blockMember } from "@/app/(hub)/actions";

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

  const [linkRes, posts] = await Promise.all([
    userId && !isMe
      ? supabase
          .from("connections")
          .select("requester_id, status")
          .or(`and(requester_id.eq.${userId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${userId})`)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    fetchPosts(supabase, userId, { authorId: id, page }),
  ]);
  const link = linkRes.data as Link_;
  const site = member.website && (member.website.startsWith("http") ? member.website : `https://${member.website}`);
  const fact = "inline-flex items-center gap-1.5";

  return (
    <>
      <section className="panel overflow-hidden">
        <Cover seed={member.id} className="h-36" />
        <div className="px-5 pb-5">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <span className="relative rounded-full ring-4 ring-white">
              <AvatarImg person={member} size={112} />
            </span>
            <div className="flex flex-wrap justify-end gap-2 pb-1">
              {isMe ? (
                <Link href="/profile/edit" className="press rounded-full border border-input bg-white px-4 py-2 text-sm font-semibold hover:bg-muted">
                  Edit profile
                </Link>
              ) : (
                <>
                  <ConnectControl viewer={viewer} otherId={id} link={link} />
                  {userId && (
                    <form action={blockMember.bind(null, id)}>
                      <SubmitButton tone="ghost">Block</SubmitButton>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{member.full_name || "Member"}</h1>
            <TierBadge type={member.member_type} />
            {member.status === "suspended" && (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">Suspended</span>
            )}
          </div>
          {member.headline && <p className="mt-0.5 text-[15px]">{member.headline}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            {member.location && (
              <span className={fact}>
                <MapPin className="h-3.5 w-3.5" />
                {member.location}
              </span>
            )}
            {site && (
              <a href={site} target="_blank" rel="noreferrer nofollow" className={`${fact} text-primary hover:underline`}>
                <Globe className="h-3.5 w-3.5" />
                {member.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span className={fact}>
              <CalendarDays className="h-3.5 w-3.5" />
              Joined {new Date(member.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "long" })}
            </span>
          </div>
          {member.bio && (
            <div className="mt-4 border-t pt-4">
              <h2 className="mb-1 text-[15px] font-semibold">About</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{member.bio}</p>
            </div>
          )}
        </div>
      </section>

      <h2 className="mt-2 text-lg font-semibold">Posts</h2>
      {posts.length === 0 && (
        <Empty title={isMe ? "You have not posted yet" : "Nothing posted yet"}>
          {isMe ? "Head to the feed and share your first update." : "When this member posts, it will show up here."}
        </Empty>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewer={viewer} />
      ))}
      <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={`/members/${id}`} />
    </>
  );
}
