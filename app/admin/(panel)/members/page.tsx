import Link from "next/link";
import { cleanTerm, MEMBER_TYPES, requireStaff, type Profile } from "@/lib/hub";
import { Pager } from "@/components/hub";
import { AvatarImg, SubmitButton } from "@/components/hub-client";
import { adminUpdateMember } from "@/app/(hub)/actions";

const SIZE = 25;
const select = "rounded-lg border border-input bg-white px-2 py-1.5 text-sm";

export default async function AdminMembers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q = "", status = "", page: p } = await searchParams;
  const page = Number(p) || 1;
  const { supabase, profile: me } = await requireStaff();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .range((page - 1) * SIZE, page * SIZE - 1);
  const term = cleanTerm(q);
  if (term) query = query.or(`full_name.ilike.%${term}%,headline.ilike.%${term}%`);
  if (status === "suspended" || status === "active") query = query.eq("status", status);
  const { data } = await query;
  const members = (data ?? []) as Profile[];

  return (
    <>
      <h1 className="text-2xl font-bold">Members</h1>
      <form className="panel flex flex-wrap gap-2 p-3">
        <input name="q" defaultValue={q} placeholder="Search by name or headline" aria-label="Search members" className="field min-w-[180px] flex-1" />
        <select name="status" defaultValue={status} aria-label="Status" className="rounded-xl border border-input bg-white px-3 text-sm">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <SubmitButton tone="dark">Filter</SubmitButton>
      </form>

      <section className="panel divide-y">
        {members.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No members match.</p>}
        {members.map((m) => (
          <form key={m.id} action={adminUpdateMember.bind(null, m.id)} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Link href={`/members/${m.id}`} className="flex min-w-[200px] flex-1 items-center gap-3">
              <AvatarImg person={m} size={38} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold hover:underline">{m.full_name || "Member"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  Joined {new Date(m.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </span>
            </Link>
            <select name="member_type" defaultValue={m.member_type} aria-label="Plan" className={select}>
              {Object.entries(MEMBER_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={m.status} aria-label="Status" className={`${select} ${m.status === "suspended" ? "border-primary text-primary" : ""}`}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              name="role"
              defaultValue={m.role}
              aria-label="Role"
              disabled={me.role !== "admin" || m.id === me.id}
              className={`${select} disabled:opacity-50`}
            >
              <option value="member">Member</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
            <SubmitButton tone="outline" className="!px-3 !py-1.5">
              Save
            </SubmitButton>
          </form>
        ))}
      </section>
      <Pager page={page} hasMore={members.length === SIZE} base={`/admin/members?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`} />
    </>
  );
}
