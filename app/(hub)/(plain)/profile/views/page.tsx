import Link from "next/link";
import { requireUser, MEMBER_TYPES } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { AvatarImg } from "@/components/hub-client";

export const metadata = pageMeta({ title: "Who viewed your profile", description: "Members who looked at your SMB Hub profile in the last 30 days.", path: "/profile/views", index: false });

type Viewer = { viewer_id: string | null; last_at: string; shown: boolean };

export default async function ViewsPage() {
  const { supabase, userId } = await requireUser();
  const [viewers, days] = await Promise.all([supabase.rpc("my_profile_viewers"), supabase.rpc("my_profile_view_days")]);
  const rows = (viewers.data ?? []) as Viewer[];
  const series = (days.data ?? []) as { day: string; views: number }[];
  const ids = rows.filter((r) => r.viewer_id).map((r) => r.viewer_id as string);
  const people = ids.length ? ((await supabase.from("profiles").select("id, full_name, headline, avatar_url, member_type").in("id", ids)).data ?? []) : [];
  const byId = new Map(people.map((p) => [p.id as string, p]));
  const total = series.reduce((n, d) => n + d.views, 0);
  const max = Math.max(1, ...series.map((d) => d.views));
  const hidden = rows.filter((r) => !r.shown).length;
  const private_ = !!(await supabase.from("profile_details").select("private_browsing").eq("user_id", userId).maybeSingle()).data?.private_browsing;

  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-bold">Who viewed your profile</h1>

      <section className="panel p-6" aria-labelledby="trend">
        <h2 id="trend" className="text-xl font-semibold">{total} {total === 1 ? "view" : "views"} in the last 30 days</h2>
        <div role="img" aria-label={`Profile views per day for the last 30 days, ${total} in total`} className="mt-4 flex h-24 items-end gap-0.5">
          {series.map((d) => (
            <span key={d.day} title={`${d.day}: ${d.views}`} className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(d.views ? 8 : 2, (d.views / max) * 100)}%`, opacity: d.views ? 1 : 0.25 }} />
          ))}
        </div>
      </section>

      <section className="panel p-6" aria-labelledby="who">
        <h2 id="who" className="text-xl font-semibold">Recent viewers</h2>
        {private_ && <p className="mt-2 text-sm text-muted-foreground">Private browsing is on, so viewers are not shown. Change it in <Link href="/settings" className="font-semibold text-primary hover:underline">settings</Link>.</p>}
        {!private_ && rows.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No one has viewed your profile yet. Post in the feed or join a group to get noticed.</p>}
        <ul className="mt-1 divide-y">
          {rows.filter((r) => r.shown && r.viewer_id).map((r) => {
            const p = byId.get(r.viewer_id as string);
            if (!p) return null;
            return (
              <li key={r.viewer_id} className="flex items-center gap-3 py-3">
                <Link href={`/members/${p.id}`}><AvatarImg person={p} size={48} /></Link>
                <span className="min-w-0 flex-1">
                  <Link href={`/members/${p.id}`} className="block truncate font-semibold hover:underline">{p.full_name || "Member"}</Link>
                  <span className="block truncate text-sm text-muted-foreground">{p.headline || MEMBER_TYPES[p.member_type as keyof typeof MEMBER_TYPES]}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.last_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
              </li>
            );
          })}
        </ul>
        {hidden > 0 && (
          <div className="mt-3 rounded-xl bg-muted p-4 text-sm">
            <p className="font-semibold">{hidden} more {hidden === 1 ? "member" : "members"} viewed your profile</p>
            <p className="mt-1 text-muted-foreground">Free members see the two most recent viewers. Upgrade to see everyone.</p>
            <Link href="/membership-plans" className="mt-2 inline-block font-semibold text-primary hover:underline">See membership plans</Link>
          </div>
        )}
      </section>
    </div>
  );
}
