import "server-only";
import { getViewer } from "@/lib/hub";
import { type Job, type JobBiz, type JobType } from "@/lib/jobs-shared";

/** Update 43: SME Hub Jobs from the database (open jobs of published business pages, plus business-page jobs). */

type DB = Awaited<ReturnType<typeof getViewer>>["supabase"];
const SELECT = "id, title, job_type, work_where, team_big, pay_from, pay_to, pay_per, description, apply_how, apply_email, apply_url, existing_vacancy, ai_used, featured_until, status, closes_at, created_at, views, posted_by, company:companies!jobs_company_id_fkey(id, slug, name, logo_url, city, province, category, about, description, status)";

type Row = {
  id: string; title: string; job_type: JobType; work_where: Job["where"]; team_big: boolean; pay_from: number | null; pay_to: number | null; pay_per: Job["per"];
  description: string; apply_how: Job["how"]; apply_email: string | null; apply_url: string | null; existing_vacancy: boolean | null; ai_used: boolean | null;
  featured_until: string | null; status: Job["status"]; closes_at: string; created_at: string; views: number; posted_by: string;
  company: { id: string; slug: string; name: string; logo_url: string | null; city: string; province: string; category: string; about: string; description: string; status: string } | null;
};

const biz = (c: NonNullable<Row["company"]>): JobBiz => ({ id: c.id, slug: c.slug, name: c.name, logo: c.logo_url, city: c.city ?? "", prov: (c.province ?? "").toUpperCase(), category: c.category ?? "", about: c.about || c.description || "" });

function toJob(r: Row, refs: number): Job | null {
  if (!r.company) return null;
  return {
    id: r.id, title: r.title, type: r.job_type, where: r.work_where, big: r.team_big, from: r.pay_from === null ? null : Number(r.pay_from), to: r.pay_to === null ? null : Number(r.pay_to),
    per: r.pay_per, desc: r.description, how: r.apply_how, email: r.apply_email, url: r.apply_url, vacancy: r.existing_vacancy, ai: r.ai_used,
    featured: !!r.featured_until && new Date(r.featured_until).getTime() > Date.now(), status: r.status, closes: r.closes_at, created: r.created_at, views: r.views,
    biz: biz(r.company), refs, postedBy: r.posted_by,
  };
}

async function refsFor(supabase: DB, ids: string[]) {
  const out = new Map<string, number>();
  if (!ids.length) return out;
  const { data } = await supabase.rpc("job_counts", { p_ids: ids });
  for (const r of (data ?? []) as { job_id: string; refs: number }[]) out.set(r.job_id, r.refs);
  return out;
}

const PAGE_TYPE: Record<string, JobType> = { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract", seasonal: "Seasonal", internship: "Part-time" };

/** Every open job, newest first; null when migration 0079 isn't applied yet. */
export async function openJobs(supabase: DB): Promise<Job[] | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase.from("jobs").select(SELECT).eq("status", "open").gt("closes_at", nowIso).order("created_at", { ascending: false }).limit(500);
  if (error) return null;
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.company?.status === "published");
  const refs = await refsFor(supabase, rows.map((r) => r.id));
  const jobs = rows.map((r) => toJob(r, refs.get(r.id) ?? 0)).filter((j): j is Job => !!j);
  // jobs added on a business page's Jobs tab show here too
  const { data: page } = await supabase
    .from("business_jobs")
    .select("id, title, description, job_type, location, created_at, company:companies!business_jobs_company_id_fkey(id, slug, name, logo_url, city, province, category, about, description, status)")
    .eq("open", true)
    .order("created_at", { ascending: false })
    .limit(200);
  for (const p of (page ?? []) as unknown as { id: string; title: string; description: string; job_type: string; location: string; created_at: string; company: Row["company"] }[]) {
    if (!p.company || p.company.status !== "published") continue;
    jobs.push({
      id: `b_${p.id}`, title: p.title, type: PAGE_TYPE[p.job_type] ?? "Full-time", where: /remote/i.test(p.location) ? "remote" : "onsite", big: false, from: null, to: null, per: "hour",
      desc: p.description, how: "hub", email: null, url: null, vacancy: null, ai: null, featured: false, status: "open", closes: "", created: p.created_at, views: 0,
      biz: biz(p.company), refs: 0, postedBy: "", fromPage: true, payText: "Pay on the business page",
    });
  }
  return jobs;
}

export async function oneJob(supabase: DB, id: string): Promise<Job | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.from("jobs").select(SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const refs = await refsFor(supabase, [id]);
  return toJob(data as unknown as Row, refs.get(id) ?? 0);
}

/** The jobs this member posted or manages, with their applicants. */
export async function myJobs(supabase: DB, userId: string) {
  const { data: teams } = await supabase.from("business_team").select("company_id").eq("user_id", userId).in("role", ["owner", "manager"]);
  const companies = ((teams ?? []) as { company_id: string }[]).map((t) => t.company_id);
  const filter = companies.length ? `posted_by.eq.${userId},company_id.in.(${companies.join(",")})` : `posted_by.eq.${userId}`;
  const { data, error } = await supabase.from("jobs").select(SELECT).or(filter).neq("status", "removed").order("created_at", { ascending: false }).limit(100);
  if (error) return null;
  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.id);
  const refs = await refsFor(supabase, ids);
  const { data: apps } = ids.length
    ? await supabase.from("job_applications").select("id, job_id, note, cv_name, cv_path, share_profile, referral_id, created_at, applicant:profiles!job_applications_applicant_id_fkey(id, full_name, headline, avatar_url)").in("job_id", ids).order("created_at", { ascending: false })
    : { data: [] };
  type App = { id: string; job_id: string; note: string; cv_name: string | null; cv_path: string | null; share_profile: boolean; referral_id: string | null; created_at: string; applicant: { id: string; full_name: string | null; headline: string | null; avatar_url: string | null } | null };
  const byJob = new Map<string, App[]>();
  for (const a of (apps ?? []) as unknown as App[]) byJob.set(a.job_id, [...(byJob.get(a.job_id) ?? []), a]);
  return rows.map((r) => ({ job: toJob(r, refs.get(r.id) ?? 0)!, apps: byJob.get(r.id) ?? [] })).filter((x) => x.job);
}

/** Published pages this member can post jobs for (owner or manager). */
export async function postableBusinesses(supabase: DB, userId: string): Promise<JobBiz[]> {
  const { data } = await supabase
    .from("business_team")
    .select("role, company:companies!business_team_company_id_fkey(id, slug, name, logo_url, city, province, category, about, description, status)")
    .eq("user_id", userId)
    .in("role", ["owner", "manager"]);
  return ((data ?? []) as unknown as { company: Row["company"] }[]).filter((t) => t.company?.status === "published").map((t) => biz(t.company!));
}
