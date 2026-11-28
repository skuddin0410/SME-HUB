import Link from "next/link";
import { requireUser } from "@/lib/hub";
import { myJobs } from "@/lib/jobs";
import { ageText, payText } from "@/lib/jobs-shared";
import { Applicant, CloseJob, type App } from "@/components/jobs/my-jobs";
import { Ic } from "@/components/zip/ic";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = { title: "My job posts", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Update 43: My job posts, with applicants. */
export default async function MyJobsPage() {
  const { supabase, userId, profile, isStaff } = await requireUser();
  const plan = String((profile as { plan?: string } | null)?.plan ?? "free");
  const paid = isStaff || plan === "plus" || plan === "advisor";
  const mine = (await myJobs(supabase, userId)) ?? [];
  const month = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit" }).format(d);
  const usedFeatured = mine.filter((m) => m.job.postedBy === userId && m.job.featured && month(new Date(m.job.created)) === month(new Date())).length;
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="jxjob">
          <Link className="jxback" href="/jobs">← All jobs</Link>
          <div className="jxhead">
            <div>
              <p className="jxeye"><Ic n="brief" s={13} /> Your account</p>
              <h1>My job posts</h1>
              <p className="jxsub">{paid ? `Unlimited jobs on your plan, with ${Math.max(0, 1 - usedFeatured)} featured job left this month.` : "Free members can have 1 job open at a time."}</p>
            </div>
            <div className="jxhb"><Link className="btn sm dark" href="/jobs/post"><Ic n="plus" s={14} />Post a job</Link></div>
          </div>
          {mine.length ? mine.map(({ job: j, apps }) => {
            const closed = j.status === "closed" || new Date(j.closes).getTime() <= Date.now();
            return (
              <article key={j.id} className={`jxmine${closed ? " closed" : ""}`}>
                <div className="jxmh">
                  <div>
                    <h2><Link href={`/jobs/${j.id}`}>{j.title}</Link></h2>
                    <p className="jxmut">{j.biz.name} · {payText(j)} · posted {ageText(j.created).toLowerCase()}</p>
                  </div>
                  <span className={`jxst ${closed ? "off" : "on"}`}>{j.status === "held" ? "Being checked" : closed ? "Closed" : "Open"}</span>
                  {j.featured && <span className="jxfeat"><Ic n="spark" s={11} />Featured</span>}
                  <span className="grow" />
                  {!closed && <CloseJob id={j.id} />}
                </div>
                <div className="jxstats">
                  <span><b>{j.views}</b> views</span>
                  <span><b>{apps.length}</b> applicants</span>
                  <span><b>{apps.filter((a) => a.referral_id).length}</b> recommended</span>
                </div>
                {j.how !== "hub" ? (
                  <p className="jxmut">People apply {j.how === "email" ? `by email to ${j.email}` : "on your website"}, so applications don’t show here.</p>
                ) : apps.length ? (
                  <ul className="jxapps">{apps.map((a) => <Applicant key={a.id} a={a as App} age={ageText(a.created_at)} />)}</ul>
                ) : (
                  <p className="jxmut">No applicants yet. Share the link or ask members in Hiring & People.</p>
                )}
              </article>
            );
          }) : (
            <div className="jxempty"><b>You haven’t posted a job yet</b><Link className="btn sm dark" href="/jobs/post">Post a job</Link></div>
          )}
        </div>
      </div>
    </div>
  );
}
