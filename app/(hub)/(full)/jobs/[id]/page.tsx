import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { oneJob } from "@/lib/jobs";
import { ageText, payText, whereText } from "@/lib/jobs-shared";
import { BizLogo } from "@/components/jobs/bits";
import { JobActions, ReportJob } from "@/components/jobs/job-actions";
import { Ic } from "@/components/zip/ic";
import { LinkedText } from "@/components/zip/short-link";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getViewer();
  const j = await oneJob(supabase, id).catch(() => null);
  return j ? { title: `${j.title} at ${j.biz.name}`, description: j.desc.slice(0, 160) } : { title: "Job" };
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Toronto" });

/** Update 43: one job. */
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, profile } = await getViewer();
  const j = await oneJob(supabase, id);
  const live = j && j.status === "open" && new Date(j.closes).getTime() > Date.now();
  if (!j || (!live && j.postedBy !== userId)) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="jxjob"><div className="jxempty"><b>This job has closed or was removed.</b><Link className="btn sm ghost" href="/jobs">See all jobs</Link></div></div>
      </div></div>
    );
  }
  const own = !!userId && j.postedBy === userId;
  const { data: revs } = await supabase.from("company_reviews").select("rating, status").eq("company_id", j.biz.id).limit(500);
  const shown = ((revs ?? []) as { rating: number; status?: string }[]).filter((r) => !r.status || r.status === "published");
  const avg = shown.length ? (shown.reduce((n, r) => n + r.rating, 0) / shown.length).toFixed(1) : null;
  let applied = false;
  let saved = false;
  let connections: { id: string; name: string }[] = [];
  let email = "";
  if (userId) {
    const [{ data: a }, { data: s }, { data: c }, u] = await Promise.all([
      supabase.from("job_applications").select("id").eq("job_id", j.id).eq("applicant_id", userId).maybeSingle(),
      supabase.from("job_saves").select("job_id").eq("job_id", j.id).eq("user_id", userId).maybeSingle(),
      supabase.from("connections").select("requester_id, requester:profiles!connections_requester_id_fkey(id, full_name), addressee:profiles!connections_addressee_id_fkey(id, full_name)").eq("status", "accepted").limit(500),
      supabase.auth.getUser(),
    ]);
    applied = !!a;
    saved = !!s;
    connections = ((c ?? []) as unknown as { requester_id: string; requester: { id: string; full_name: string }; addressee: { id: string; full_name: string } }[])
      .map((x) => (x.requester_id === userId ? x.addressee : x.requester)).filter(Boolean).map((p) => ({ id: p.id, name: p.full_name })).sort((x, y) => x.name.localeCompare(y.name));
    email = u.data.user?.email ?? "";
  }
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="jxjob">
          <Link className="jxback" href="/jobs">← All jobs</Link>
          <div className="jxjgrid">
            <article className="jxjmain">
              <header className="jxjh">
                <BizLogo b={j.biz} />
                <div>
                  <p className="jxeye">{j.featured ? <><Ic n="spark" s={12} />Featured job</> : "Job"} · posted {ageText(j.created).toLowerCase()}{j.status === "held" ? " · being checked by the team" : j.status === "closed" ? " · closed" : ""}</p>
                  <h1>{j.title}</h1>
                  <p className="jxbiz"><Link href={`/businesses/${j.biz.slug}`}>{j.biz.name}</Link> · {whereText(j)}</p>
                </div>
              </header>
              <dl className="jxfacts">
                <div><dt>Pay</dt><dd>{payText(j)}</dd></div>
                <div><dt>Type</dt><dd>{j.type}</dd></div>
                <div><dt>Where</dt><dd>{j.where === "remote" ? "Remote" : j.where === "hybrid" ? "Hybrid" : "On site"}</dd></div>
                <div><dt>Closes</dt><dd>{day(j.closes)}</dd></div>
              </dl>
              <JobActions
                job={{ id: j.id, title: j.title, biz: j.biz.name }}
                me={userId && profile ? { id: userId, name: profile.full_name || "Member", email, avatar: profile.avatar_url } : null}
                own={own} applied={applied} saved={saved} connections={connections} how={j.how} email={j.email} url={j.url}
              />
              <section><h2>About the job</h2><p style={{ whiteSpace: "pre-line" }}><LinkedText text={j.desc} /></p></section>
              {j.big && j.vacancy !== null && (
                <section className="jxlaw">
                  <h2>Required details</h2>
                  <ul>
                    <li>{j.vacancy ? "This is an existing job that needs filling now." : "This is not for an existing opening."}</li>
                    <li>{j.ai ? "This employer uses AI to screen or rank applications." : "This employer doesn’t use AI to screen or rank applications."}</li>
                    <li>If you’re interviewed, you’ll hear whether you got the job within 45 days.</li>
                  </ul>
                </section>
              )}
            </article>
            <aside className="jxjside">
              <div className="jxbox">
                <BizLogo b={j.biz} size="s" />
                <b>{j.biz.name}</b>
                <span className="jxmut">{[j.biz.category, [j.biz.city, j.biz.prov].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</span>
                {avg && <span className="jxmut">{avg} ★ from {shown.length} review{shown.length === 1 ? "" : "s"}</span>}
                {j.biz.about && <p>{j.biz.about.slice(0, 240)}</p>}
                <Link className="btn sm ghost" href={`/businesses/${j.biz.slug}`}>View business page</Link>
              </div>
              <div className="jxbox jxsafe">
                <Ic n="lock" s={16} />
                <div><b>Never pay to apply</b><span>If anyone asks for money, a deposit or your banking details before you’re hired, stop and <ReportJob id={j.id} signedIn={!!userId} />.</span></div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
