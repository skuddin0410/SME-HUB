import Link from "next/link";
import { requireUser } from "@/lib/hub";
import { postableBusinesses } from "@/lib/jobs";
import { JobGate, PostJobForm } from "@/components/jobs/post-form";
import { Ic } from "@/components/zip/ic";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = { title: "Post a job", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Update 43: Post a job. Only owners or managers of a published business page; Free has 1 open job at a time. */
export default async function PostJobPage() {
  const { supabase, userId, profile, isStaff } = await requireUser();
  const plan = String((profile as { plan?: string } | null)?.plan ?? "free");
  const paid = isStaff || plan === "plus" || plan === "advisor";
  const [businesses, { data: week }, { count: open }, { data: featured }] = await Promise.all([
    postableBusinesses(supabase, userId),
    supabase.rpc("my_welcome_week"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("posted_by", userId).in("status", ["open", "held"]).gt("closes_at", new Date().toISOString()),
    supabase.from("jobs").select("created_at").eq("posted_by", userId).not("featured_until", "is", null).gte("created_at", new Date(Date.now() - 40 * 86_400_000).toISOString()),
  ]);
  // one featured job per calendar month, Toronto time (the database checks this again)
  const month = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit" }).format(d);
  const featuredThisMonth = ((featured ?? []) as { created_at: string }[]).filter((r) => month(new Date(r.created_at)) === month(new Date())).length;
  const head = (
    <>
      <Link className="jxback" href="/jobs">← All jobs</Link>
      <div className="jxhead"><div><p className="jxeye"><Ic n="brief" s={13} /> SME Hub Jobs</p><h1>Post a job</h1><p className="jxsub">It goes live straight away on Jobs, your business page and the Hiring & People group.</p></div></div>
    </>
  );
  let body: React.ReactNode;
  if (!businesses.length) {
    body = <JobGate icon="store" title="Add your business page first" text="Jobs are posted by approved business pages, so applicants can see who’s hiring. It also keeps fake job ads out."><Link className="btn sm dark" href="/businesses/mine">Add my business</Link></JobGate>;
  } else if (week && !isStaff) {
    body = <JobGate icon="spark" title="Job posts unlock after your welcome week" text="To keep fake job ads out, new members can post jobs once their first week is over." />;
  } else if (!paid && (open ?? 0) >= 1) {
    body = <JobGate icon="lock" title="You already have a job open" text="Free members can have 1 job at a time. Close your other job, or upgrade to Plus for unlimited jobs and one featured job a month."><Link className="btn sm ghost" href="/jobs/mine">My job posts</Link><Link className="btn sm dark" href="/membership-plans">See Plus</Link></JobGate>;
  } else {
    body = <PostJobForm businesses={businesses} paid={paid} featuredLeft={isStaff || featuredThisMonth < 1} />;
  }
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}><div className="jxjob">{head}{body}</div></div></div>
  );
}
