import Link from "next/link";
import { requireCms, fmtDate, type CmsEvent } from "@/lib/cms";
import { MEMBER_TYPES } from "@/lib/hub";
import { Badge, Card, PageHeader, Person, PLAN_TONE, Stat } from "@/components/cms/ui";
import { ActivityList, peopleFor } from "@/components/cms/activity";

export const metadata = { title: { absolute: "Dashboard · SMB Hub CMS" } };

type Overview = Record<string, number> & {
  plans: Record<string, number>;
  kinds: Record<string, number>;
  series: { day: string; signups: number; posts: number; comments: number; reactions: number }[];
};

/** Thirty days of one measure as bars: one hue, a tooltip on each bar, the total in the title. */
function DailyBars({ title, data, field }: { title: string; data: Overview["series"]; field: "signups" | "posts" | "comments" | "reactions" }) {
  const values = data.map((d) => d[field]);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const W = 300;
  const H = 72;
  const gap = 2;
  const bw = (W - gap * (values.length - 1)) / values.length;
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between text-[0.8438rem]">
        <span className="font-semibold text-zinc-800">{title}</span>
        <span className="tabular-nums text-zinc-500">{total.toLocaleString("en-CA")} in 30 days</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-[4.5rem] w-full" role="img" aria-label={`${title}: ${total} in the last 30 days`}>
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke="#E4E4E7" />
        {data.map((d, i) => {
          const h = d[field] ? Math.max(3, (d[field] / max) * (H - 4)) : 0;
          const x = i * (bw + gap);
          return (
            <g key={d.day}>
              {/* a full-height hit area so each day is easy to hover */}
              <rect x={x} y={0} width={bw + gap} height={H} fill="transparent">
                <title>{`${fmtDate(d.day)}: ${d[field]}`}</title>
              </rect>
              {h > 0 && <path d={`M${x},${H} v${-(h - 2)} q0,-2 2,-2 h${bw - 4} q2,0 2,2 v${h - 2} z`} fill="#2563EB" pointerEvents="none" />}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[0.6875rem] text-zinc-400">
        <span>{fmtDate(data[0]?.day)}</span>
        <span>Today</span>
      </div>
    </figure>
  );
}

export default async function CmsDashboard() {
  const { supabase } = await requireCms();
  const [{ data: ov, error }, { data: ev }, { data: reports }, { data: newest }] = await Promise.all([
    supabase.rpc("cms_overview"),
    supabase.from("cms_events").select("*").order("at", { ascending: false }).limit(14),
    supabase
      .from("reports")
      .select("id, reason, created_at, post_id, profile_id, reporter:profiles!reports_reporter_id_fkey(id, full_name, avatar_url)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("profiles").select("id, full_name, avatar_url, headline, member_type, created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  if (error) throw new Error(error.message);
  const o = ov as Overview;
  const events = (ev ?? []) as CmsEvent[];
  const people = await peopleFor(supabase, events);

  return (
    <>
      <PageHeader title="Dashboard" description="Everything happening on SMB Hub, updated live." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Members" value={o.members} hint={`${o.signed_in_7d} signed in this week`} href="/cms/members" />
        <Stat label="Posts" value={o.posts} hint={`${o.comments} comments`} href="/cms/posts" />
        <Stat label="Reactions" value={o.reactions} hint={`${o.reposts} reposts · ${o.saves} saves`} />
        <Stat label="Connections" value={o.connections} hint={`${o.pending_connections} pending`} href="/cms/connections" />
        <Stat label="Groups" value={o.groups} hint={`${o.group_members} memberships`} href="/cms/groups" />
        <Stat label="Open reports" value={o.open_reports} tone={o.open_reports ? "rose" : "zinc"} hint="Need a decision" href="/cms/reports" />
        <Stat label="Business listings" value={o.companies} hint={`${o.reviews} reviews`} href="/cms/businesses" />
        <Stat label="Messages" value={o.messages} hint="Content stays private" href="/cms/messages" />
        <Stat label="Suspended" value={o.suspended} tone={o.suspended ? "amber" : "zinc"} href="/cms/members?status=suspended" />
        <Stat label="Unconfirmed emails" value={o.unconfirmed} hint="Signed up, link not clicked" href="/cms/members?confirmed=no" />
        <Stat label="Admins" value={o.admins} href="/cms/staff" />
        <Stat label="Active members" value={o.active} />
      </div>

      <Card title="Last 30 days">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <DailyBars title="New members" data={o.series} field="signups" />
          <DailyBars title="Posts" data={o.series} field="posts" />
          <DailyBars title="Comments" data={o.series} field="comments" />
          <DailyBars title="Reactions" data={o.series} field="reactions" />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          flush
          title="Live activity"
          actions={
            <Link href="/cms/activity" className="text-[0.8438rem] font-semibold text-blue-600 hover:underline">
              See all
            </Link>
          }
        >
          <ActivityList events={events} people={people} />
        </Card>

        <div className="flex flex-col gap-5">
          <Card
            flush
            title="Open reports"
            actions={
              <Link href="/cms/reports" className="text-[0.8438rem] font-semibold text-blue-600 hover:underline">
                Review
              </Link>
            }
          >
            {(reports ?? []).length === 0 ? (
              <p className="px-4 py-6 text-center text-[0.875rem] text-zinc-500">No open reports.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(reports ?? []).map((r) => (
                  <li key={r.id} className="px-4 py-3 text-[0.875rem]">
                    <p className="line-clamp-2 text-zinc-900">“{r.reason || "No reason given"}”</p>
                    <p className="mt-0.5 text-[0.8125rem] text-zinc-500">
                      {r.post_id ? "Post" : "Member"} · {fmtDate(r.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card flush title="Newest members">
            <ul className="divide-y divide-zinc-100">
              {(newest ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.875rem]">
                  <div className="min-w-0 flex-1">
                    <Person person={m} sub={m.headline || `Joined ${fmtDate(m.created_at)}`} />
                  </div>
                  <Badge tone={PLAN_TONE[m.member_type]}>{MEMBER_TYPES[m.member_type as keyof typeof MEMBER_TYPES]}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Members by plan">
            <ul className="grid gap-2 text-[0.875rem]">
              {Object.entries(MEMBER_TYPES).map(([k, label]) => {
                const n = o.plans[k] ?? 0;
                return (
                  <li key={k} className="grid grid-cols-[6.875rem_1fr_2.5rem] items-center gap-3">
                    <span className="text-zinc-700">{label}</span>
                    <span className="h-2 rounded-full bg-zinc-100">
                      <span className="block h-2 rounded-full bg-blue-600" style={{ width: `${o.members ? (n / o.members) * 100 : 0}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-zinc-900">{n}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
