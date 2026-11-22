import Link from "next/link";
import { Lock } from "lucide-react";
import { getViewer } from "@/lib/hub";
import { Empty, PageTitle } from "@/components/hub";
import { GroupLogo } from "@/components/hub-client";
import { CreateGroupForm, GroupCover } from "@/components/group-client";
import { getGroupSettings } from "@/lib/groups-server";
import { GROUP_SORTS } from "@/lib/groups";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Groups", description: "Join groups on SMB Hub to talk with other Canadian business owners about your industry, city or topic.", path: "/groups" });

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_private: boolean;
  category: string;
  cover: string;
  join_mode: string;
  status: string;
  created_by: string;
  group_members: { count: number }[];
  host: { full_name: string | null } | null;
};

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; sort?: string }> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const { supabase, userId } = viewer;
  const s = await getGroupSettings();
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N} '-]/gu, "").slice(0, 60);
  const cat = s.types.includes(sp.cat ?? "") ? sp.cat! : "";
  const sort = GROUP_SORTS.some((o) => o.value === sp.sort) ? sp.sort! : "name";

  let query = supabase
    .from("groups")
    .select("id, slug, name, description, is_private, category, cover, join_mode, status, created_by, group_members(count), host:profiles!groups_created_by_fkey(full_name)")
    .in("status", ["active", "pending"]);
  if (cat) query = query.eq("category", cat);
  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  const { data } = await query.order(sort === "new" ? "created_at" : "name", { ascending: sort !== "new" });
  const all = (data ?? []) as unknown as Group[];
  const mine = all.filter((g) => g.status === "pending" && g.created_by === userId);
  const groups = all.filter((g) => g.status === "active");
  if (sort === "members") groups.sort((a, b) => (b.group_members[0]?.count ?? 0) - (a.group_members[0]?.count ?? 0));

  const { data: invites } = userId ? await supabase.from("group_invites").select("group_id").eq("user_id", userId) : { data: [] };
  const invitedTo = new Set((invites ?? []).map((i) => i.group_id as string));
  const waiting = groups.filter((g) => invitedTo.has(g.id));
  const plan = (viewer.profile as { plan?: string } | null)?.plan ?? "free";
  const list = s.layout === "list";

  return (
    <>
      <PageTitle title="Groups" />
      <form role="search" className="panel flex flex-wrap items-center gap-2 p-3">
        <input name="q" defaultValue={q} placeholder="Search groups" aria-label="Search groups" className="field min-w-0 flex-1" />
        <select name="cat" defaultValue={cat} aria-label="Group type" className="field w-auto">
          <option value="">All types</option>
          {s.types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort groups" className="field w-auto">
          {GROUP_SORTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button className="press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>

      {mine.length > 0 && (
        <section className="panel border-amber-300 bg-amber-50 p-4 text-sm">
          <h2 className="font-semibold">Waiting for team approval</h2>
          <p className="mt-1 text-muted-foreground">{mine.map((g) => g.name).join(", ")}</p>
        </section>
      )}
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
        <Empty title={q || cat ? "No groups match" : "No groups yet"}>
          {q || cat ? "Try another word or type." : "Start the first one for your industry, your city or a topic you care about."}
        </Empty>
      )}
      <div className={list ? "flex flex-col gap-3" : "grid gap-4 sm:grid-cols-2"}>
        {groups.map((g) => {
          const count = g.group_members[0]?.count ?? 0;
          return (
            <Link key={g.id} href={`/groups/${g.slug}`} className={`panel lift group flex overflow-hidden ${list ? "items-center" : "flex-col"}`}>
              <GroupCover cover={g.cover} className={list ? "hidden h-full min-h-24 w-28 shrink-0 sm:block" : "h-20"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3 px-4 pt-4">
                  <GroupLogo seed={g.slug} name={g.name} size={48} />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold group-hover:underline">{g.name}</h2>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      {g.is_private && <Lock className="h-3 w-3" />}
                      {g.is_private ? "Private" : "Public"}
                      {s.card.cat && <span>, {g.category}</span>}
                      {s.card.count && (
                        <span>
                          , {count} {count === 1 ? "member" : "members"}
                        </span>
                      )}
                    </p>
                    {s.card.host && g.host?.full_name && <p className="text-xs text-muted-foreground">Hosted by {g.host.full_name}</p>}
                  </div>
                </div>
                {s.card.desc && <p className="line-clamp-2 px-4 pb-3 pt-3 text-sm text-muted-foreground">{g.description || "Open the group to see what members are talking about."}</p>}
                {s.card.act && <p className="px-4 pb-4 text-sm font-semibold text-primary">{g.join_mode === "open" ? "Join group" : g.join_mode === "request" ? "Request to join" : "By invitation"}</p>}
              </div>
            </Link>
          );
        })}
      </div>

      {userId ? (
        <details className="panel p-4">
          <summary className="cursor-pointer text-[1rem] font-semibold">Start a new group</summary>
          <CreateGroupForm s={s} canPrivate={plan !== "free" || s.create_private === "all"} />
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
