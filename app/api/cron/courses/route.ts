import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { courseMail, siteUrl } from "@/lib/courses-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 864e5;
const REASON = "you take or teach a course on SME Hub";
type Lesson = { id: string; course_id: string; title: string; drip_days: number; position: number; section: { position: number } | null };

/**
 * The once-a-day course emails: drip lessons that just opened, "pick up where you left off" reminders
 * (after 7 days, at most twice per course, never once it's finished) and one digest a day of new work for each instructor.
 * Run it daily with: Authorization: Bearer <CRON_SECRET> (a server setting). Each email is sent once.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const site = siteUrl();
  const now = Date.now();
  const out = { drip: 0, reminders: 0, digests: 0 };
  const emailOf = async (id: string) => {
    const { data } = await db.auth.admin.getUserById(id);
    const { data: p } = await db.from("profiles").select("full_name").eq("id", id).maybeSingle();
    return data.user?.email ? { email: data.user.email, name: (p as { full_name?: string } | null)?.full_name ?? "" } : null;
  };

  const [{ data: courses }, { data: lessons }, { data: en }] = await Promise.all([
    db.from("courses").select("id, slug, title, status"),
    db.from("lessons").select("id, course_id, title, drip_days, position, section:course_sections(position)"),
    db.from("enrolments").select("member_id, course_id, enrolled_at, completed_at, last_opened_at, reminders_sent, last_reminder_at, last_lesson_id"),
  ]);
  const C = new Map(((courses ?? []) as { id: string; slug: string; title: string; status: string }[]).map((c) => [c.id, c]));
  const L = new Map<string, Lesson[]>();
  for (const l of (lessons ?? []) as unknown as Lesson[]) L.set(l.course_id, [...(L.get(l.course_id) ?? []), l]);
  for (const v of L.values()) v.sort((a, b) => (a.section?.position ?? 0) - (b.section?.position ?? 0) || a.position - b.position);

  for (const e of (en ?? []) as { member_id: string; course_id: string; enrolled_at: string; completed_at: string | null; last_opened_at: string | null; reminders_sent: number; last_reminder_at: string | null }[]) {
    const c = C.get(e.course_id);
    if (!c || e.completed_at) continue;
    const t0 = new Date(e.enrolled_at).getTime();
    // drip lessons that opened in the last two days
    for (const l of (L.get(c.id) ?? []).filter((x) => x.drip_days > 0)) {
      const opens = t0 + l.drip_days * DAY;
      if (opens > now || opens < now - 2 * DAY) continue;
      const { data: claimed } = await db.rpc("course_mail_claim", { p_member: e.member_id, cid: c.id, p_kind: "lesson-open", p_ref: l.id });
      if (!claimed) continue;
      await courseMail("course-lesson-open", await emailOf(e.member_id), { drip_course: c.title, drip_lesson: l.title, drip_url: `${site}/courses/${c.slug}/learn/${l.id}`, reason: REASON, unsubscribe_url: `${site}/settings` });
      out.drip++;
    }
    // reminders
    const lastSeen = new Date(e.last_opened_at ?? e.enrolled_at).getTime();
    const lastRem = e.last_reminder_at ? new Date(e.last_reminder_at).getTime() : 0;
    if (e.reminders_sent >= 2 || now - lastSeen < 7 * DAY || now - lastRem < 7 * DAY) continue;
    const ls = L.get(c.id) ?? [];
    let done = 0;
    let next: Lesson | null = null;
    for (const l of ls) {
      const { data: d } = await db.rpc("course_lesson_done", { p_member: e.member_id, p_lesson: l.id });
      if (d) done++;
      else next ??= l;
    }
    if (!ls.length || done === ls.length) continue;
    await courseMail("course-reminder", await emailOf(e.member_id), {
      course_title: c.title, course_pct: Math.round((100 * done) / ls.length), done_lessons: done, course_lessons: ls.length, next_lesson: next?.title ?? "",
      continue_url: next ? `${site}/courses/${c.slug}/learn/${next.id}` : `${site}/courses/${c.slug}`, reason: REASON, unsubscribe_url: `${site}/settings`,
    }, `course-reminder-${e.member_id}-${c.id}-${e.reminders_sent + 1}`);
    await db.from("enrolments").update({ reminders_sent: e.reminders_sent + 1, last_reminder_at: new Date().toISOString() }).eq("member_id", e.member_id).eq("course_id", c.id);
    out.reminders++;
  }

  // one email a day per instructor with new work to grade
  const { data: subs } = await db.from("submissions").select("id, course_id, lesson_id, body, submitted_at, member:profiles!submissions_member_id_fkey(full_name, avatar_url), lesson:lessons(title)").is("mailed_at", null).is("graded_at", null).order("submitted_at", { ascending: false });
  const rows = (subs ?? []) as unknown as { id: string; course_id: string; body: string; member: { full_name: string; avatar_url: string | null } | null; lesson: { title: string } | null }[];
  if (rows.length) {
    const { data: ins } = await db.from("course_instructors").select("course_id, member_id").in("course_id", [...new Set(rows.map((r) => r.course_id))]);
    const byInst = new Map<string, typeof rows>();
    for (const i of (ins ?? []) as { course_id: string; member_id: string }[]) byInst.set(i.member_id, [...(byInst.get(i.member_id) ?? []), ...rows.filter((r) => r.course_id === i.course_id)]);
    for (const [inst, list] of byInst) {
      const r = list[0];
      const c = C.get(r.course_id);
      await courseMail("course-submission", await emailOf(inst), {
        learner_name: r.member?.full_name ?? "A learner", learner_photo_url: r.member?.avatar_url ?? "", asg_title: r.lesson?.title ?? "", course_title: c?.title ?? "",
        sub_excerpt: r.body.slice(0, 200), to_grade: list.length, grade_url: `${site}/courses/teaching?grade=${r.id}`, reason: REASON, unsubscribe_url: `${site}/settings`,
      }, `course-submission-${inst}-${new Date().toISOString().slice(0, 10)}`);
      out.digests++;
    }
    await db.from("submissions").update({ mailed_at: new Date().toISOString() }).in("id", rows.map((r) => r.id));
  }
  return NextResponse.json({ ok: true, ...out });
}
