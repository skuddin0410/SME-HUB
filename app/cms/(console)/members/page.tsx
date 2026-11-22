import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { requireCms, pageOf, cleanSearch, fmtDate, timeAgo, CMS_PAGE, type CmsUser } from "@/lib/cms";
import { MEMBER_TYPES } from "@/lib/hub";
import { Badge, Card, Empty, Filters, INPUT, PageHeader, Pager, Person, PLAN_TONE, SELECT, TABLE, TD, TH } from "@/components/cms/ui";

export const metadata = { title: "Members" };


type Params = { q?: string; status?: string; role?: string; plan?: string; confirmed?: string; page?: string; deleted?: string };

export default async function CmsMembers({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const { supabase } = await requireCms();
  const pick = (v: string | undefined, ok: string[]) => (v && ok.includes(v) ? v : "");
  const params = {
    q: cleanSearch(sp.q),
    status: pick(sp.status, ["active", "suspended"]),
    role: pick(sp.role, ["member", "admin"]),
    plan: pick(sp.plan, Object.keys(MEMBER_TYPES)),
    confirmed: pick(sp.confirmed, ["yes", "no"]),
  };
  const { data, error } = await supabase.rpc("cms_users", {
    p_search: params.q,
    p_status: params.status,
    p_role: params.role,
    p_plan: params.plan,
    p_confirmed: params.confirmed,
    p_limit: CMS_PAGE,
    p_offset: (page - 1) * CMS_PAGE,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as CmsUser[];
  const total = rows[0]?.total ?? 0;

  return (
    <>
      <PageHeader title="Members" description="Every account on the hub, with its email, plan, status and activity." />
      {sp.deleted && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[0.875rem] text-emerald-800">The account was deleted.</p>}
      <Filters reset="/cms/members">
        <label className="sr-only" htmlFor="m-q">Search</label>
        <input id="m-q" name="q" defaultValue={params.q} placeholder="Name, email, headline or city" className={`${INPUT} min-w-[13.75rem] flex-1`} />
        <select name="plan" defaultValue={params.plan} aria-label="Plan" className={SELECT}>
          <option value="">Any plan</option>
          {Object.entries(MEMBER_TYPES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select name="status" defaultValue={params.status} aria-label="Status" className={SELECT}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select name="role" defaultValue={params.role} aria-label="Role" className={SELECT}>
          <option value="">Any role</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <select name="confirmed" defaultValue={params.confirmed} aria-label="Email confirmed" className={SELECT}>
          <option value="">Email: any</option>
          <option value="yes">Confirmed</option>
          <option value="no">Not confirmed</option>
        </select>
      </Filters>

      <Card flush>
        {rows.length === 0 ? (
          <Empty>No members match these filters.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>Member</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Plan</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} text-right`}>Posts</th>
                  <th className={`${TH} text-right`}>Connections</th>
                  <th className={TH}>Joined</th>
                  <th className={TH}>Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/70">
                    <td className={`${TD} max-w-[17.5rem]`}>
                      <Person person={m} sub={m.headline || m.location || undefined} />
                    </td>
                    <td className={TD}>
                      <span className="flex items-center gap-1.5">
                        {m.email_confirmed_at ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Email confirmed" />
                        ) : (
                          <CircleDashed className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label="Email not confirmed" />
                        )}
                        <a href={`mailto:${m.email}`} className="truncate text-zinc-800 hover:underline">{m.email}</a>
                      </span>
                      {m.provider !== "email" && <span className="text-[0.7812rem] capitalize text-zinc-500">via {m.provider}</span>}
                    </td>
                    <td className={TD}>
                      <Badge tone={PLAN_TONE[m.member_type]}>{MEMBER_TYPES[m.member_type]}</Badge>
                    </td>
                    <td className={TD}>
                      <span className="flex flex-wrap gap-1">
                        {m.status === "suspended" ? <Badge tone="rose">Suspended</Badge> : <Badge tone="green">Active</Badge>}
                        {m.role === "admin" && <Badge tone="violet">Admin</Badge>}
                      </span>
                    </td>
                    <td className={`${TD} text-right tabular-nums`}>{m.posts}</td>
                    <td className={`${TD} text-right tabular-nums`}>{m.connections}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(m.created_at)}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{timeAgo(m.last_sign_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={total} path="/cms/members" params={params} />
      <p className="text-[0.8125rem] text-zinc-500">
        Tip: open a member to edit their profile, change plan or status, or delete the account. <Link href="/cms/staff" className="font-semibold text-blue-600 hover:underline">Manage admins</Link>
      </p>
    </>
  );
}
