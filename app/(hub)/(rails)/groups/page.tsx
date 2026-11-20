import Link from "next/link";
import { Lock } from "lucide-react";
import { getViewer } from "@/lib/hub";
import { Empty, PageTitle } from "@/components/hub";
import { Cover, GroupLogo, SubmitButton } from "@/components/hub-client";
import { createGroup } from "@/app/(hub)/actions";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Groups", description: "Join groups on SMB Hub to talk with other Canadian business owners about your industry, city or topic.", path: "/groups" });

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_private: boolean;
  group_members: { count: number }[];
};

export default async function GroupsPage() {
  const { supabase, userId } = await getViewer();
  const { data } = await supabase
    .from("groups")
    .select("id, slug, name, description, is_private, group_members(count)")
    .order("name");
  const groups = (data ?? []) as unknown as Group[];
  const { data: invites } = userId ? await supabase.from("group_invites").select("group_id").eq("user_id", userId) : { data: [] };
  const invitedTo = new Set((invites ?? []).map((i) => i.group_id as string));
  const waiting = groups.filter((g) => invitedTo.has(g.id));

  return (
    <>
      <PageTitle title="Groups" />
      {waiting.length > 0 && (
        <section className="panel border-primary/40 bg-primary/5">
          <h2 className="px-4 py-3 text-base font-semibold">You have been invited ({waiting.length})</h2>
          {waiting.map((g) => (
            <Link key={g.id} href={`/groups/${g.slug}`} className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm transition-colors hover:bg-primary/10">
              <span className="font-semibold">{g.name}</span>
              <span className="rounded-xl bg-primary px-4 py-1.5 font-semibold text-white">View invitation</span>
            </Link>
          ))}
        </section>
      )}
      {groups.length === 0 && (
        <Empty title="No groups yet">Start the first one for your industry, your city or a topic you care about.</Empty>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => {
          const count = g.group_members[0]?.count ?? 0;
          return (
            <Link key={g.id} href={`/groups/${g.slug}`} className="panel lift group flex flex-col overflow-hidden">
              <Cover seed={g.id} className="h-20" />
              <div className="flex items-start gap-3 px-4 pt-4">
                <GroupLogo seed={g.slug} name={g.name} size={48} />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold group-hover:underline">{g.name}</h2>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {g.is_private && <Lock className="h-3 w-3" />}
                    {g.is_private ? "Private group" : "Public group"}, {count} {count === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>
              <p className="line-clamp-2 px-4 pb-4 pt-3 text-sm text-muted-foreground">{g.description || "Open the group to see what members are talking about."}</p>
            </Link>
          );
        })}
      </div>

      {userId ? (
        <details className="panel p-4">
          <summary className="cursor-pointer text-[15px] font-semibold">Start a new group</summary>
          <form action={createGroup} className="mt-4 flex animate-rise flex-col gap-3">
            <input name="name" required maxLength={80} placeholder="Group name" aria-label="Group name" className="field" />
            <textarea name="description" rows={2} maxLength={500} placeholder="What is this group about?" aria-label="Description" className="field" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_private" className="h-4 w-4 accent-[hsl(var(--primary))]" /> Private: only members see the posts
            </label>
            <SubmitButton className="self-start">Create group</SubmitButton>
          </form>
        </details>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/sign-up" className="font-semibold text-primary hover:underline">
            Join free
          </Link>{" "}
          to start your own group.
        </p>
      )}
    </>
  );
}
