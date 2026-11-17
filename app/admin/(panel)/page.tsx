import Link from "next/link";
import { AUTHOR_FIELDS, requireStaff, timeAgo, type Author } from "@/lib/hub";
import { PersonLine } from "@/components/hub";

const DAYS = 14;

export default async function AdminOverview() {
  const { supabase } = await requireStaff();
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const count = (table: string) => supabase.from(table).select("*", { count: "exact", head: true });

  const [members, posts, comments, groups, suspended, openReports, signups, recentPosts, newest] = await Promise.all([
    count("profiles"),
    count("posts"),
    count("comments"),
    count("groups"),
    count("profiles").eq("status", "suspended"),
    count("reports").eq("status", "open"),
    supabase.from("profiles").select("created_at").gte("created_at", since),
    supabase.from("posts").select("created_at").gte("created_at", since),
    supabase.from("profiles").select(`${AUTHOR_FIELDS}, created_at`).order("created_at", { ascending: false }).limit(6),
  ]);

  // bucket the last 14 days
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(Date.now() - (DAYS - 1 - i) * 86400000);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-CA", { month: "short", day: "numeric" }), signups: 0, posts: 0 };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const r of signups.data ?? []) { const d = byKey.get(String(r.created_at).slice(0, 10)); if (d) d.signups++; }
  for (const r of recentPosts.data ?? []) { const d = byKey.get(String(r.created_at).slice(0, 10)); if (d) d.posts++; }
  const peak = Math.max(1, ...days.map((d) => Math.max(d.signups, d.posts)));

  const stats = [
    { label: "Members", value: members.count ?? 0, href: "/admin/members" },
    { label: "Posts", value: posts.count ?? 0, href: "/admin/posts" },
    { label: "Comments", value: comments.count ?? 0, href: "/admin/posts" },
    { label: "Groups", value: groups.count ?? 0, href: "/admin/groups" },
    { label: "Open reports", value: openReports.count ?? 0, href: "/admin/reports", alert: (openReports.count ?? 0) > 0 },
    { label: "Suspended", value: suspended.count ?? 0, href: "/admin/members?status=suspended" },
  ];
  const newMembers = (newest.data ?? []) as (Author & { created_at: string })[];

  return (
    <>
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`panel p-5 transition-shadow hover:shadow-lg ${s.alert ? "border-primary/40" : ""}`}>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`font-display text-4xl font-bold ${s.alert ? "text-primary" : ""}`}>{s.value.toLocaleString("en-CA")}</p>
          </Link>
        ))}
      </div>

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Last {DAYS} days</h2>
          <p className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-foreground" /> New members</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Posts</span>
          </p>
        </div>
        <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label={`New members and posts per day for the last ${DAYS} days`}>
          {days.map((d) => (
            <div key={d.key} className="flex h-full flex-1 items-end justify-center gap-0.5" title={`${d.label}: ${d.signups} new members, ${d.posts} posts`}>
              <div className="w-1/2 rounded-t bg-foreground" style={{ height: `${Math.max(2, (d.signups / peak) * 100)}%` }} />
              <div className="w-1/2 rounded-t bg-primary" style={{ height: `${Math.max(2, (d.posts / peak) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{days[0].label}</span>
          <span>{days[DAYS - 1].label}</span>
        </div>
      </section>

      <section className="panel divide-y">
        <h2 className="px-5 py-3 text-[15px] font-semibold">Newest members</h2>
        {newMembers.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <PersonLine person={m} size={38} />
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(m.created_at)}</span>
          </div>
        ))}
        {newMembers.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">No members yet.</p>}
      </section>
    </>
  );
}
