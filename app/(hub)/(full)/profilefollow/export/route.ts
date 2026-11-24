import { getViewer } from "@/lib/hub";
import { READY_NAMES, type ReadyKey } from "@/lib/ready-shared";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // a spreadsheet must never run a member's text as a formula
  return `"${s.replace(/"/g, '""')}"`;
};
const FILTERS = ["all", "founding", "week", "ready"];

/** The call list: the same rows as the Profile follow-up page, as a CSV file. Team only. */
export async function GET(req: Request) {
  const { supabase, isStaff } = await getViewer();
  if (!isStaff) return new Response("Team only", { status: 403 });
  const f = new URL(req.url).searchParams.get("f") ?? "all";
  const { data, error } = await supabase.rpc("team_profile_followup", { p_filter: FILTERS.includes(f) ? f : "all" });
  if (error) return new Response("Could not load the list", { status: 500 });
  type Row = { id: string; full_name: string; headline: string; location: string; founding_number: number | null; created_at: string; last_visit: string | null; missing: ReadyKey[]; ready_count: number; status: string };
  const head = ["Name", "Headline", "City", "Founding Member", "Joined", "Last visit", "Missing", "Steps ready", "Follow-up"];
  const lines = ((data ?? []) as Row[]).map((r) => [r.full_name, r.headline, r.location, r.founding_number != null ? "Yes" : "No", r.created_at.slice(0, 10), r.last_visit ? r.last_visit.slice(0, 10) : "", r.missing.map((k) => READY_NAMES[k]).join("; "), `${5 - r.missing.length} of 5`, r.status].map(cell).join(","));
  return new Response([head.map(cell).join(","), ...lines].join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="profile-follow-up-${f}.csv"`, "cache-control": "no-store" },
  });
}
