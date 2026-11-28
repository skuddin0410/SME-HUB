"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { mail, people, type Person } from "@/lib/apps/mail";
import { siteUrl } from "@/lib/courses-mail";
import { oneJob } from "@/lib/jobs";
import { payText, whereText } from "@/lib/jobs-shared";
import { checkSite, domainOf } from "@/lib/safety/server";
import { safetyPlain } from "@/lib/safety/client";

/** Update 43: SME Hub Jobs. The database checks every rule (who can post, plan limits, Ontario rules, scams) again. */

type Done = { ok?: boolean; error?: string; id?: string; held?: boolean; safety?: string };
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => {
  const s = String(v ?? "").replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : NaN;
};
const refresh = () => {
  revalidatePath("/jobs", "layout");
};

export type JobInput = {
  company: string; title: string; type: string; where: string; big: boolean; from: string; to: string; per: string; desc: string;
  how: string; email: string; url: string; vacancy: "yes" | "no" | ""; ai: "yes" | "no" | ""; featured: boolean;
};

export async function postJob(input: JobInput): Promise<Done> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to post a job." };
  if (!isId(input.company)) return { error: "Choose your business page." };
  const from = num(input.from), to = num(input.to);
  if (Number.isNaN(from) || Number.isNaN(to)) return { error: "Pay should be a number, like 22 or 52000." };
  const url = str(input.url, 300);
  // links are checked with Google Web Risk as well as the team's list (the database checks the list again)
  if (input.how === "url" && url) {
    const site = await checkSite(domainOf(url));
    if (site.blocked) return { error: "That link is on our list of unsafe sites, so it can’t be used." };
  }
  const { data, error } = await v.supabase.rpc("post_job", {
    p_company: input.company, p_title: str(input.title, 120), p_type: input.type, p_where: input.where, p_big: !!input.big,
    p_from: from, p_to: to, p_per: input.per, p_desc: str(input.desc, 5000), p_how: input.how, p_email: str(input.email, 200), p_url: url,
    p_vacancy: input.vacancy === "" ? null : input.vacancy === "yes", p_ai: input.ai === "" ? null : input.ai === "yes", p_featured: !!input.featured,
  });
  if (error) {
    if (error.message.includes("safety: ")) return { safety: error.message };
    return { error: safetyPlain(error.message) ?? error.message };
  }
  const r = data as { id: string; held: boolean };
  refresh();
  return { ok: true, id: r.id, held: r.held };
}

export async function closeJob(id: string): Promise<Done> {
  const v = await getViewer();
  if (!v.userId || !isId(id)) return { error: "Not allowed." };
  const { error } = await v.supabase.rpc("job_set_status", { p_job: id, p_status: "closed" });
  if (error) return { error: "That didn’t save. Try again." };
  refresh();
  return { ok: true };
}

/** The team: approve a held job, or remove one (held or reported). */
export async function teamJob(id: string, action: "open" | "removed"): Promise<Done> {
  const v = await getViewer();
  if (!v.userId || !v.isStaff || !isId(id) || !["open", "removed"].includes(action)) return { error: "Not allowed." };
  const { error } = await v.supabase.rpc("job_set_status", { p_job: id, p_status: action });
  if (error) return { error: "That didn’t save. Try again." };
  refresh();
  revalidatePath("/moderation");
  return { ok: true };
}

export async function saveJob(id: string, on: boolean): Promise<Done> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to save jobs." };
  if (!isId(id)) return { error: "That job isn’t here any more." };
  const { error } = on
    ? await v.supabase.from("job_saves").upsert({ job_id: id, user_id: v.userId }, { ignoreDuplicates: true })
    : await v.supabase.from("job_saves").delete().eq("job_id", id).eq("user_id", v.userId);
  return error ? { error: "That didn’t save. Try again." } : { ok: true };
}

export async function reportJob(id: string, reason: string): Promise<Done> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to report a job." };
  if (!isId(id)) return { error: "That job isn’t here any more." };
  const { error } = await v.supabase.rpc("report_job", { p_job: id, p_reason: str(reason, 300) });
  if (error) return { error: error.message.includes("lot of reports") ? error.message : "Your report didn’t send. Try again." };
  revalidatePath("/moderation");
  return { ok: true };
}

export async function viewJob(id: string) {
  if (!isId(id)) return;
  const v = await getViewer();
  await v.supabase.rpc("job_view", { p_job: id });
}

async function managers(jobPostedBy: string) {
  return (await people([jobPostedBy])).get(jobPostedBy) ?? null;
}

/** Apply on SME Hub. The CV is already in the member's own folder of the private job-cvs bucket. */
export async function applyJob(input: { job: string; note: string; cvPath: string | null; cvName: string | null; share: boolean }): Promise<Done> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to apply." };
  if (!isId(input.job)) return { error: "This job has closed." };
  const note = str(input.note, 3000);
  if (!note) return { error: "Add a short note so the owner knows why you’re a good fit." };
  const { data: appId, error } = await v.supabase.rpc("apply_job", { p_job: input.job, p_note: note, p_cv_path: input.cvPath, p_cv_name: input.cvName ? str(input.cvName, 200) : null, p_share: !!input.share });
  if (error) return { error: error.message.length < 160 ? error.message : "Your application didn’t send. Try again." };
  const job = await oneJob(v.supabase, input.job);
  if (job) {
    const site = siteUrl();
    const [owner, me] = [await managers(job.postedBy), (await people([v.userId])).get(v.userId)];
    const { data: app } = await v.supabase.from("job_applications").select("referral_id").eq("id", appId as string).maybeSingle();
    const cv = input.cvName ? `Attached: ${str(input.cvName, 120)} (open it from My job posts)` : "No CV attached";
    if (owner) {
      await mail("job-application", owner, {
        applicant_name: me?.name ?? "A member", applicant_email: me?.email ?? "", job_title: job.title, biz_name: job.biz.name, cv_note: cv, note,
        recommended: !!(app as { referral_id?: string | null } | null)?.referral_id, mine_url: `${site}/jobs/mine`, message_url: `${site}/messages?with=${v.userId}`,
      }, { once: `job-app-${appId}` });
    }
    if (me) {
      await mail("job-application-copy", me, {
        job_title: job.title, biz_name: job.biz.name, sent_at: new Date().toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }) + " ET",
        cv_note: input.cvName ? `Attached: ${str(input.cvName, 120)}` : "No CV attached", note, job_url: `${site}/jobs/${job.id}`,
      }, { once: `job-app-copy-${appId}` });
    }
  }
  refresh();
  return { ok: true };
}

/** "I know someone": a connection, or a name and email. We email them the job and tell the owner. */
export async function referJob(input: { job: string; member: string | null; name: string; email: string; note: string }): Promise<Done> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to recommend someone." };
  if (!isId(input.job) || (input.member !== null && input.member !== "" && !isId(input.member))) return { error: "This job has closed." };
  const member = input.member || null;
  const { data: refId, error } = await v.supabase.rpc("refer_job", { p_job: input.job, p_member: member, p_name: str(input.name, 120), p_email: str(input.email, 200).toLowerCase(), p_note: str(input.note, 1000) });
  if (error) return { error: error.message.length < 160 ? error.message : "That didn’t send. Try again." };
  const job = await oneJob(v.supabase, input.job);
  let personName = str(input.name, 120);
  if (job) {
    const site = siteUrl();
    const ids = [v.userId, job.postedBy, ...(member ? [member] : [])];
    const ppl = await people(ids);
    const me = ppl.get(v.userId);
    const to: Person | null = member ? ppl.get(member) ?? null : { id: "", email: str(input.email, 200).toLowerCase(), name: personName, first: personName.split(/\s+/)[0] ?? "", headline: "", avatar: null };
    if (member) personName = to?.name ?? "a member";
    if (to) {
      await mail("job-referral", to, {
        referrer_name: me?.name ?? "A member", referrer_first: me?.first ?? "They", note: str(input.note, 1000), job_title: job.title, biz_name: job.biz.name,
        job_where: whereText(job), job_pay: payText(job), job_url: `${site}/jobs/${job.id}`,
      }, { once: `job-ref-${refId}` });
    }
    const owner = ppl.get(job.postedBy);
    if (owner) await mail("job-recommended", owner, { referrer_name: me?.name ?? "A member", person_name: personName || "someone", job_title: job.title, mine_url: `${site}/jobs/mine` }, { once: `job-recd-${refId}` });
  }
  refresh();
  return { ok: true };
}

/** A short-lived link to an applicant's CV, for the job's managers only (checked by the database's rules). */
export async function cvLink(appId: string): Promise<{ url?: string; error?: string }> {
  const v = await getViewer();
  if (!v.userId || !isId(appId)) return { error: "Not allowed." };
  const { data } = await v.supabase.from("job_applications").select("cv_path, job_id").eq("id", appId).maybeSingle();
  const row = data as { cv_path: string | null; job_id: string } | null;
  if (!row?.cv_path) return { error: "No CV with this application." };
  const { data: ok } = await v.supabase.rpc("job_counts", { p_ids: [row.job_id] });
  if (((ok ?? []) as { apps: number | null }[])[0]?.apps == null) return { error: "Not allowed." };
  const { serviceClient } = await import("@/lib/supabase/service");
  const db = serviceClient();
  if (!db) return { error: "CVs can’t be opened right now." };
  const { data: signed } = await db.storage.from("job-cvs").createSignedUrl(row.cv_path, 300, { download: true });
  return signed?.signedUrl ? { url: signed.signedUrl } : { error: "CVs can’t be opened right now." };
}
