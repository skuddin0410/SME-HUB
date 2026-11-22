import Link from "next/link";
import { requireStaff } from "@/lib/hub";
import { SubmitButton } from "@/components/hub-client";
import { GroupSettingsForm } from "@/components/group-client";
import { getGroupSettings } from "@/lib/groups-server";
import { adminDeleteGroup } from "@/app/(hub)/actions";
import { decideGroupApproval } from "@/app/(hub)/group-actions";

type Group = {
  id: string;
  slug: string;
  name: string;
  is_private: boolean;
  status: string;
  category: string;
  created_at: string;
  group_members: { count: number }[];
  posts: { count: number }[];
};

export default async function AdminGroups() {
  const { supabase } = await requireStaff();
  const settings = await getGroupSettings();
  const { data } = await supabase
    .from("groups")
    .select("id, slug, name, is_private, status, category, created_at, group_members(count), posts(count)")
    .order("created_at", { ascending: false });
  const groups = (data ?? []) as unknown as Group[];
  const pending = groups.filter((g) => g.status === "pending");

  return (
    <>
      <h1 className="text-2xl font-bold">Groups</h1>

      <section className="panel">
        <h2 className="px-4 py-3 text-base font-semibold">Waiting for approval ({pending.length})</h2>
        {pending.length === 0 && <p className="border-t px-4 py-4 text-sm text-muted-foreground">Nothing is waiting.</p>}
        {pending.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{g.name}</p>
              <p className="text-xs text-muted-foreground">{g.category}, public group</p>
            </div>
            <div className="flex gap-2">
              <form action={decideGroupApproval.bind(null, g.id, false)}>
                <SubmitButton tone="danger" className="!px-3 !py-1.5">
                  Decline
                </SubmitButton>
              </form>
              <form action={decideGroupApproval.bind(null, g.id, true)}>
                <SubmitButton className="!px-3 !py-1.5">Approve</SubmitButton>
              </form>
            </div>
          </div>
        ))}
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-base font-semibold">Group settings</h2>
        <GroupSettingsForm s={settings} />
      </section>

      <section className="panel divide-y">
        <h2 className="px-4 py-3 text-base font-semibold">All groups</h2>
        {groups.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No groups yet.</p>}
        {groups.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Link href={`/groups/${g.slug}`} className="text-sm font-semibold hover:underline">
                {g.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {g.is_private ? "Private" : "Public"}, {g.category}, {g.status}, {g.group_members[0]?.count ?? 0} members, {g.posts[0]?.count ?? 0} posts,
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
