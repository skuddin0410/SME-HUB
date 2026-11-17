import Link from "next/link";
import { requireStaff } from "@/lib/hub";
import { SubmitButton } from "@/components/hub-client";
import { adminDeleteGroup } from "@/app/(hub)/actions";

type Group = {
  id: string;
  slug: string;
  name: string;
  is_private: boolean;
  created_at: string;
  group_members: { count: number }[];
  posts: { count: number }[];
};

export default async function AdminGroups() {
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("groups")
    .select("id, slug, name, is_private, created_at, group_members(count), posts(count)")
    .order("created_at", { ascending: false });
  const groups = (data ?? []) as unknown as Group[];

  return (
    <>
      <h1 className="text-2xl font-bold">Groups</h1>
      <section className="panel divide-y">
        {groups.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No groups yet.</p>}
        {groups.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Link href={`/groups/${g.slug}`} className="text-sm font-semibold hover:underline">
                {g.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {g.is_private ? "Private" : "Public"}, {g.group_members[0]?.count ?? 0} members, {g.posts[0]?.count ?? 0} posts,
                created {new Date(g.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
            <form action={adminDeleteGroup.bind(null, g.id)}>
              <SubmitButton tone="danger" className="!px-3 !py-1.5">
                Delete group
              </SubmitButton>
            </form>
          </div>
        ))}
      </section>
    </>
  );
}
