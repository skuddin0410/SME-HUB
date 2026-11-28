import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { openJobs } from "@/lib/jobs";
import { JobsList } from "@/components/jobs/jobs-list";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import { MapleStrip } from "@/components/maple/dock";

export const metadata = pageMeta({ title: "Jobs at Canadian small businesses", description: "Real jobs from Canadian small business owners you can look up. Search full-time, part-time, contract and seasonal work, or post a job.", path: "/jobs" });
export const dynamic = "force-dynamic";

/** Update 43: SME Hub Jobs. */
export default async function JobsPage() {
  const { supabase, userId } = await getViewer();
  const jobs = await openJobs(supabase);
  let saved: string[] = [];
  let applied: string[] = [];
  let mineOpen = 0;
  if (userId && jobs) {
    const [{ data: s }, { data: a }, { count }] = await Promise.all([
      supabase.from("job_saves").select("job_id").eq("user_id", userId),
      supabase.from("job_applications").select("job_id").eq("applicant_id", userId),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("posted_by", userId).eq("status", "open").gt("closes_at", new Date().toISOString()),
    ]);
    saved = ((s ?? []) as { job_id: string }[]).map((x) => x.job_id);
    applied = ((a ?? []) as { job_id: string }[]).map((x) => x.job_id);
    mineOpen = count ?? 0;
  }
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <MapleStrip page="jobs" />
        <JobsList jobs={jobs ?? []} saved={saved} applied={applied} signedIn={!!userId} mineOpen={mineOpen} />
      </div>
    </div>
  );
}
