"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getViewer, requireUser } from "@/lib/hub";
import { getStripe } from "@/lib/stripe";
import { courseMail, memberEmail, siteUrl, teamInbox } from "@/lib/courses-mail";
import { courseTax, CTOPICS, CLEVELS, CLANGS, CTZS, dur, PROVINCES, provinceOf, slugify } from "@/lib/courses-shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (v: unknown) => {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("Not found");
  return v;
};
type R<T = object> = Promise<({ error?: string } & Partial<T>)>;
const msg = (e: { message: string } | null | undefined) => (e ? { error: e.message.replace(/^.*?: /, "") } : {});
const refresh = () => revalidatePath("/courses", "layout");
const why = (e: unknown) => ({ error: (e as Error).message || "Something went wrong. Try again." });
const REASON = "you take or teach a course on SME Hub";

async function courseInfo(courseId: string) {
  const { supabase } = await getViewer();
  const [{ data: c }, { data: ins }, { data: ls }] = await Promise.all([
    supabase.from("courses").select("id, slug, title").eq("id", courseId).maybeSingle(),
    supabase.from("course_instructors").select("member_id, profiles(full_name)").eq("course_id", courseId).order("position"),
    supabase.from("lessons").select("id, title, minutes, position, section:course_sections(position)").eq("course_id", courseId),
  ]);
  const lessons = ((ls ?? []) as unknown as { id: string; title: string; minutes: number; position: number; section: { position: number } | null }[])
    .sort((a, b) => (a.section?.position ?? 0) - (b.section?.position ?? 0) || a.position - b.position);
  const instructors = ((ins ?? []) as unknown as { member_id: string; profiles: { full_name: string } | null }[]);
  return { c: c as { id: string; slug: string; title: string } | null, lessons, instructors, names: instructors.map((i) => i.profiles?.full_name ?? "").filter(Boolean).join(" and ") };
}

async function mailCompleted(courseId: string) {
  const { supabase, userId } = await getViewer();
  const { data: u } = await supabase.auth.getUser();
  const { c, names } = await courseInfo(courseId);
  if (!c || !u.user?.email) return;
  if (!(await supabase.rpc("course_mail_claim", { p_member: userId, cid: courseId, p_kind: "completed", p_ref: "" })).data) return;
  await courseMail("course-completed", { email: u.user.email, name: u.user.user_metadata?.first_name as string }, {
    course_title: c.title, course_instructor: names, certificate_date: new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(new Date()),
    review_url: `${siteUrl()}/courses/${c.slug}#crrev`, reason: REASON, unsubscribe_url: `${siteUrl()}/settings`,
  }, `course-completed-${userId}-${courseId}`);
}

// ---------- learners ----------
export async function toggleSave(courseId: string): R<{ saved: boolean }> {
  id(courseId);
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("saved_courses").select("course_id").eq("member_id", userId).eq("course_id", courseId).maybeSingle();
  const res = data ? await supabase.from("saved_courses").delete().eq("member_id", userId).eq("course_id", courseId) : await supabase.from("saved_courses").insert({ member_id: userId, course_id: courseId });
  if (res.error) return msg(res.error);
  refresh();
  return { saved: !data };
}

export async function enrolFree(courseId: string): R<{ href: string }> {
  id(courseId);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.rpc("enrol_free", { cid: courseId });
  if (error) return msg(error);
  const { c, lessons, names } = await courseInfo(courseId);
  const { data: u } = await supabase.auth.getUser();
  if (c && u.user?.email && (await supabase.rpc("course_mail_claim", { p_member: userId, cid: courseId, p_kind: "enrolled", p_ref: "" })).data) {
    await courseMail("course-enrolled", { email: u.user.email, name: u.user.user_metadata?.first_name as string }, {
      course_title: c.title, course_instructor: names, course_lessons: lessons.length, course_length: dur(lessons.reduce((n, l) => n + l.minutes, 0)),
      course_url: `${siteUrl()}/courses/${c.slug}`, first_lesson: lessons[0]?.title ?? "", start_url: lessons[0] ? `${siteUrl()}/courses/${c.slug}/learn/${lessons[0].id}` : `${siteUrl()}/courses/${c.slug}`,
      reason: REASON, unsubscribe_url: `${siteUrl()}/settings`,
    }, `course-enrolled-${userId}-${courseId}`);
  }
  refresh();
  return { href: c && lessons[0] ? `/courses/${c.slug}/learn/${lessons[0].id}` : "/courses" };
}

export async function openLesson(lessonId: string) {
  id(lessonId);
  const { supabase, userId } = await getViewer();
  if (userId) await supabase.rpc("open_lesson", { p_lesson: lessonId });
}

export async function saveVideoPos(lessonId: string, sec: number) {
  id(lessonId);
  const { supabase, userId } = await getViewer();
  if (userId && Number.isFinite(sec)) await supabase.rpc("save_video_pos", { p_lesson: lessonId, p_sec: Math.max(0, Math.round(sec * 10) / 10) });
}

export async function markDone(lessonId: string): R<{ completed: boolean }> {
  id(lessonId);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("mark_lesson_done", { p_lesson: lessonId });
  if (error) return msg(error);
  if (data) {
    const { data: l } = await supabase.from("lessons").select("course_id").eq("id", lessonId).maybeSingle();
    if (l) await mailCompleted(l.course_id as string);
  }
  refresh();
  return { completed: !!data };
}

export async function submitAssignment(lessonId: string, body: string, filePath: string, fileName: string, fileSize: number): R<{ completed: boolean }> {
  id(lessonId);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("submit_assignment", { p_lesson: lessonId, p_body: String(body ?? "").slice(0, 10000), p_file_path: filePath ?? "", p_file_name: String(fileName ?? "").slice(0, 160), p_file_size: Math.max(0, Math.round(+fileSize || 0)) });
  if (error) return msg(error);
  if (data) {
    const { data: l } = await supabase.from("lessons").select("course_id").eq("id", lessonId).maybeSingle();
    if (l) await mailCompleted(l.course_id as string);
  }
  refresh();
  return { completed: !!data };
}

export async function feedbackSeen(subId: string) {
  id(subId);
  const { supabase, userId } = await getViewer();
  if (userId) await supabase.rpc("feedback_seen", { p_sub: subId });
}

export type QuizView = {
  pass_pct: number; limit: number; attempts: number; now: string; used: number; staff: boolean;
  questions: { q: string; o: string[] }[];
  done: { id: string; score: number; total: number; passed: boolean; wrong: number[]; timed_out: boolean; at: string }[];
  open: { id: string; answers: Record<string, number>; started_at: string; ends_at: string | null } | null;
};
export async function quizView(lessonId: string): R<{ quiz: QuizView }> {
  id(lessonId);
  const { supabase } = await getViewer();
  const { data, error } = await supabase.rpc("quiz_view", { p_lesson: lessonId });
  if (error) return msg(error);
  return { quiz: data as QuizView };
}
export async function quizStart(lessonId: string): R<{ quiz: QuizView }> {
  id(lessonId);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("quiz_start", { p_lesson: lessonId });
  if (error) return msg(error);
  return quizView(lessonId);
}
export async function quizAnswer(attemptId: string, q: number, option: number): R {
  id(attemptId);
  const { supabase } = await requireUser();
  return msg((await supabase.rpc("quiz_answer", { p_attempt: attemptId, p_q: q | 0, p_option: option | 0 })).error);
}
export async function quizSubmit(lessonId: string, attemptId: string): R<{ quiz: QuizView; passed: boolean; completed: boolean }> {
  id(lessonId);
  id(attemptId);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("quiz_submit", { p_attempt: attemptId });
  if (error) return msg(error);
  const r = data as { passed: boolean; completed: boolean };
  if (r.completed) {
    const { data: l } = await supabase.from("lessons").select("course_id").eq("id", lessonId).maybeSingle();
    if (l) await mailCompleted(l.course_id as string);
  }
  refresh();
  const v = await quizView(lessonId);
  return { ...v, passed: r.passed, completed: r.completed };
}

export async function setClassmates(show: boolean): R {
  const { supabase, userId } = await requireUser();
  const res = await supabase.from("course_prefs").upsert({ member_id: userId, hide_from_classmates: !show });
  refresh();
  return msg(res.error);
}

export async function saveReview(courseId: string, stars: number, text: string): R<{ updated: boolean }> {
  id(courseId);
  const { supabase, userId } = await requireUser();
  const s = Math.round(+stars);
  const body = String(text ?? "").trim();
  if (!(s >= 1 && s <= 5)) return { error: "Choose a star rating first" };
  if (body.length < 10) return { error: "Write at least a short sentence" };
  const { data: mine } = await supabase.from("course_reviews").select("id").eq("course_id", courseId).eq("member_id", userId).maybeSingle();
  const res = mine
    ? await supabase.from("course_reviews").update({ stars: s, body: body.slice(0, 2000) }).eq("id", mine.id as string)
    : await supabase.from("course_reviews").insert({ course_id: courseId, member_id: userId, stars: s, body: body.slice(0, 2000) });
  if (res.error) return { error: res.error.code === "42501" ? "You can review this course once you finish your first lesson." : res.error.message };
  refresh();
  return { updated: !!mine };
}
export async function deleteReview(courseId: string): R {
  id(courseId);
  const { supabase, userId } = await requireUser();
  const res = await supabase.from("course_reviews").delete().eq("course_id", courseId).eq("member_id", userId);
  refresh();
  return msg(res.error);
}
export async function reportReview(reviewId: string, reason: string, note: string): R<{ hidden: boolean }> {
  id(reviewId);
  const { supabase, userId } = await requireUser();
  const res = await supabase.from("reports").insert({ reporter_id: userId, course_review_id: reviewId, reason: String(reason || "Other").slice(0, 60), note: String(note ?? "").slice(0, 1000) });
  if (res.error) return msg(res.error);
  const { data } = await supabase.from("course_reviews").select("id").eq("id", reviewId).maybeSingle();
  refresh();
  return { hidden: !data };
}

// ---------- paid courses ----------
async function origin() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
/** Stripe Checkout for one course: one payment in CAD, with GST/HST for the buyer's province. Enrolment happens in the webhook. */
export async function buyCourse(courseId: string, prov: string): R<{ url: string }> {
  id(courseId);
  const { supabase, userId, profile } = await requireUser();
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return { error: "Payments are being set up. Please try again soon." };
  const { data: c } = await supabase.from("courses").select("id, slug, title, access, price, status, cover_url").eq("id", courseId).maybeSingle();
  if (!c || c.status !== "published" || c.access !== "paid" || !(c.price > 0)) return { error: "This course isn’t available" };
  const { data: had } = await supabase.from("enrolments").select("course_id").eq("member_id", userId).eq("course_id", courseId).maybeSingle();
  if (had) return { url: `/courses/${c.slug}` };
  const p = PROVINCES[prov] ? prov : provinceOf((profile as { location?: string } | null)?.location) ?? "ON";
  const t = courseTax(c.price as number, p);
  const base = await origin();
  const { data: u } = await supabase.auth.getUser();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "cad",
      line_items: [
        { quantity: 1, price_data: { currency: "cad", unit_amount: t.cents, product_data: { name: c.title as string, description: "SME Hub course · lifetime access" } } },
        { quantity: 1, price_data: { currency: "cad", unit_amount: t.tax, product_data: { name: t.label } } },
      ],
      client_reference_id: userId,
      customer_email: u.user?.email ?? undefined,
      payment_intent_data: { metadata: { kind: "course", course_id: courseId, user_id: userId } },
      metadata: { kind: "course", course_id: courseId, user_id: userId, price_cents: String(t.cents), tax_cents: String(t.tax), tax_label: t.label },
      success_url: `${base}/courses/${c.slug}?paid=1`,
      cancel_url: `${base}/courses/${c.slug}?paid=0`,
    });
    return session.url ? { url: session.url } : { error: "Payments are being set up. Please try again soon." };
  } catch (e) {
    return why(e);
  }
}

// ---------- instructors ----------
export async function gradeSubmission(subId: string, marks: number, feedback: string): R {
  id(subId);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("grade_submission", { p_sub: subId, p_marks: Math.round(+marks), p_feedback: String(feedback ?? "") });
  if (error) return msg(error);
  const { data: s } = await supabase.from("submissions").select("member_id, lesson_id, course_id, grade_marks, graded_by, lesson:lessons(title), course:courses(slug, title)").eq("id", subId).maybeSingle();
  const row = s as unknown as { member_id: string; lesson_id: string; course_id: string; grade_marks: number; lesson: { title: string } | null; course: { slug: string; title: string } | null } | null;
  if (row?.lesson && row.course) {
    const [{ data: a }, { data: me }] = await Promise.all([
      supabase.from("assignments").select("marks, pass_mark").eq("lesson_id", row.lesson_id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", (await getViewer()).userId!).maybeSingle(),
    ]);
    const to = await memberEmail(row.member_id);
    await courseMail("course-feedback", to, {
      asg_title: row.lesson.title, course_title: row.course.title, asg_marks: row.grade_marks, asg_total: a?.marks,
      asg_result: row.grade_marks >= ((a?.pass_mark as number) ?? 0) ? "Passed" : "Not passed yet", asg_feedback: String(feedback).trim(),
      course_instructor: me?.full_name ?? "", asg_url: `${siteUrl()}/courses/${row.course.slug}/learn/${row.lesson_id}`, reason: REASON, unsubscribe_url: `${siteUrl()}/settings`,
    });
  }
  refresh();
  return {};
}

export async function publishCourse(courseId: string): R {
  id(courseId);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("publish_course", { cid: courseId });
  if (error) return msg(error);
  const { c, instructors } = await courseInfo(courseId);
  if (c) {
    for (const i of instructors) {
      await courseMail("course-published", await memberEmail(i.member_id), { pub_course: c.title, pub_url: `${siteUrl()}/courses/${c.slug}`, grade_url: `${siteUrl()}/courses/teaching`, reason: REASON, unsubscribe_url: `${siteUrl()}/settings` }, `course-published-${c.id}-${i.member_id}`);
    }
  }
  refresh();
  return {};
}
export async function unpublishCourse(courseId: string): R {
  id(courseId);
  const { supabase } = await requireUser();
  const r = msg((await supabase.rpc("unpublish_course", { cid: courseId })).error);
  refresh();
  return r;
}
export async function askPublish(courseId: string): R {
  id(courseId);
  const { supabase, profile } = await requireUser();
  const { error } = await supabase.rpc("ask_publish_course", { cid: courseId });
  if (error) return msg(error);
  const { c } = await courseInfo(courseId);
  if (c) {
    await courseMail("team-course-publish", teamInbox(), {
      ask_instructor: (profile as { full_name?: string } | null)?.full_name ?? "An instructor", pub_course: c.title,
      editor_url: `${siteUrl()}/courses/edit/${c.id}`, admin_courses_url: `${siteUrl()}/courses/manage`, reason: "you're on the SME Hub team", unsubscribe_url: `${siteUrl()}/settings`,
    });
  }
  refresh();
  return {};
}
export async function deleteCourse(courseId: string): R {
  id(courseId);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("courses").delete().eq("id", courseId).select("id");
  if (error) return msg(error);
  if (!data?.length) return { error: "Only drafts with no enrolments can be deleted." };
  refresh();
  return {};
}

/** The team starts a new draft: one section with a welcome video lesson, as in the hand-off. */
export async function newCourse(): R<{ id: string }> {
  const { supabase } = await requireUser();
  const cid = crypto.randomUUID();
  const sid = crypto.randomUUID();
  const lid = crypto.randomUUID();
  const slug = `new-course-${cid.slice(0, 6)}`;
  let r = await supabase.from("courses").insert({ id: cid, slug, title: "", topic: CTOPICS[0] });
  if (r.error) return { error: r.error.code === "42501" ? "Only the Hub team can create courses" : r.error.message };
  r = await supabase.from("course_sections").insert({ id: sid, course_id: cid, title: "Getting started", position: 0 });
  if (!r.error) r = await supabase.from("lessons").insert({ id: lid, course_id: cid, section_id: sid, title: "Welcome", type: "video", minutes: 8, free_preview: true, position: 0 });
  if (!r.error) r = await supabase.from("lesson_content").insert({ lesson_id: lid, course_id: cid });
  if (r.error) return msg(r.error);
  refresh();
  return { id: cid };
}

const LINES = (v: string) => String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12);
const PARAS = (v: string) => String(v ?? "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
const int = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, parseInt(String(v), 10) || 0));

/** One field of a course, saved as the instructor types (the editor's "All changes saved"). */
export async function saveCourseField(courseId: string, field: string, value: string): R<{ slug: string }> {
  id(courseId);
  const { supabase } = await requireUser();
  const patch: Record<string, unknown> = {};
  switch (field) {
    case "title": {
      patch.title = String(value).slice(0, 80);
      const { data: c } = await supabase.from("courses").select("status").eq("id", courseId).maybeSingle();
      if (c?.status !== "published") {
        let s = slugify(String(value) || "course");
        const base = s;
        for (let n = 2; n < 50; n++) {
          const { data: hit } = await supabase.from("courses").select("id").eq("slug", s).neq("id", courseId).maybeSingle();
          if (!hit && !["my-learning", "saved", "teaching", "manage", "edit", "media", "new"].includes(s)) break;
          s = `${base}-${n}`;
        }
        patch.slug = s;
      }
      break;
    }
    case "topic": if (!(CTOPICS as readonly string[]).includes(value)) return { error: "Unknown topic" }; patch.topic = value; break;
    case "level": if (!(CLEVELS as readonly string[]).includes(value)) return { error: "Unknown level" }; patch.level = value; break;
    case "lang": if (!(CLANGS as readonly string[]).includes(value)) return { error: "Unknown language" }; patch.language = value; break;
    case "summary": patch.summary = String(value).slice(0, 300); break;
    case "desc": patch.description = PARAS(value); break;
    case "suits": case "outcomes": case "prereq": case "materials": patch[field] = LINES(value); break;
    case "price": patch.price = int(value, 0, 10000); break;
    case "access": if (!["free", "paid"].includes(value)) return {}; patch.access = value; break;
    case "order": if (!["seq", "any"].includes(value)) return {}; patch.order_rule = value; break;
    case "asg": if (!["submit", "pass"].includes(value)) return {}; patch.asg_rule = value; break;
    case "group": patch.group_id = value && UUID.test(value) ? value : null; break;
    case "cover": patch.cover_url = value; break;
    case "pvideo": patch.preview_video = value; if (!value) { patch.preview_captions = ""; patch.preview_poster = ""; } break;
    case "pvtt": patch.preview_captions = value; break;
    default: return { error: "Unknown field" };
  }
  if (field === "access" && value === "paid") {
    const { data: c } = await supabase.from("courses").select("price").eq("id", courseId).maybeSingle();
    if (!c?.price) patch.price = 29;
  }
  const { data, error } = await supabase.from("courses").update(patch).eq("id", courseId).select("slug").maybeSingle();
  if (error) return msg(error);
  if (!data) return { error: "Only this course’s instructors and the Hub team can edit it" };
  refresh();
  return { slug: data.slug as string };
}

async function courseOfLesson(lessonId: string) {
  const { supabase } = await getViewer();
  const { data } = await supabase.from("lessons").select("course_id, section_id, position, type").eq("id", lessonId).maybeSingle();
  return data as { course_id: string; section_id: string; position: number; type: string } | null;
}

/** Sections: add, rename, move, remove. */
export async function editSection(courseId: string, op: "add" | "title" | "move" | "remove", sectionId?: string, value?: string): R<{ id: string }> {
  id(courseId);
  const { supabase } = await requireUser();
  const { data: secs } = await supabase.from("course_sections").select("id, position, title").eq("course_id", courseId).order("position");
  const list = (secs ?? []) as { id: string; position: number; title: string }[];
  if (op === "add") {
    const sid = crypto.randomUUID();
    const r = await supabase.from("course_sections").insert({ id: sid, course_id: courseId, title: "New section", position: list.length });
    refresh();
    return r.error ? msg(r.error) : { id: sid };
  }
  const i = list.findIndex((s) => s.id === sectionId);
  if (i < 0) return { error: "Not found" };
  if (op === "title") {
    const r = await supabase.from("course_sections").update({ title: String(value ?? "").slice(0, 120) }).eq("id", sectionId!);
    return msg(r.error);
  }
  if (op === "remove") {
    const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("section_id", sectionId!);
    if (count) return { error: "Move or delete the lessons in this section first" };
    if (list.length < 2) return { error: "A course needs at least one section" };
    const r = await supabase.from("course_sections").delete().eq("id", sectionId!);
    refresh();
    return msg(r.error);
  }
  const j = i + (value === "-1" ? -1 : 1);
  if (j < 0 || j >= list.length) return {};
  const order = list.map((s) => s.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (let k = 0; k < order.length; k++) await supabase.from("course_sections").update({ position: k }).eq("id", order[k]);
  refresh();
  return {};
}

/** Lessons: add by type, move up or down (across sections too), remove. */
export async function editLesson(courseId: string, op: "add" | "move" | "remove", arg: string, dir?: number): R<{ id: string }> {
  id(courseId);
  const { supabase } = await requireUser();
  const { data: secs } = await supabase.from("course_sections").select("id, position").eq("course_id", courseId).order("position");
  const { data: les } = await supabase.from("lessons").select("id, section_id, position, created_at").eq("course_id", courseId).order("position").order("created_at");
  const S = ((secs ?? []) as { id: string }[]).map((s) => ({ id: s.id, ls: ((les ?? []) as { id: string; section_id: string }[]).filter((l) => l.section_id === s.id).map((l) => l.id) }));
  if (op === "add") {
    const [sid, type] = arg.split("|");
    const s = S.find((x) => x.id === sid);
    if (!s || !["video", "text", "assignment", "quiz"].includes(type)) return { error: "Not found" };
    const lid = crypto.randomUUID();
    let r = await supabase.from("lessons").insert({ id: lid, course_id: courseId, section_id: sid, title: "", type, minutes: type === "quiz" ? 5 : type === "assignment" ? 15 : 8, position: s.ls.length });
    if (!r.error) r = await supabase.from("lesson_content").insert({ lesson_id: lid, course_id: courseId });
    if (!r.error && type === "assignment") r = await supabase.from("assignments").insert({ lesson_id: lid, course_id: courseId });
    if (!r.error && type === "quiz") {
      r = await supabase.from("quizzes").insert({ lesson_id: lid, course_id: courseId, pass_pct: 80, time_limit_min: 0, attempts: 3 });
      if (!r.error) r = await supabase.from("quiz_questions").insert({ lesson_id: lid, course_id: courseId, position: 0, question: "", options: ["", "", "", ""], correct_index: 0 });
    }
    refresh();
    return r.error ? msg(r.error) : { id: lid };
  }
  if (op === "remove") {
    const r = await supabase.from("lessons").delete().eq("id", id(arg)).eq("course_id", courseId);
    refresh();
    return msg(r.error);
  }
  const si = S.findIndex((s) => s.ls.includes(arg));
  if (si < 0) return { error: "Not found" };
  const L = S[si].ls;
  const li = L.indexOf(arg);
  if (dir! < 0 && li > 0) [L[li - 1], L[li]] = [L[li], L[li - 1]];
  else if (dir! > 0 && li < L.length - 1) [L[li + 1], L[li]] = [L[li], L[li + 1]];
  else if (dir! < 0 && si > 0) { L.splice(li, 1); S[si - 1].ls.push(arg); }
  else if (dir! > 0 && si < S.length - 1) { L.splice(li, 1); S[si + 1].ls.unshift(arg); }
  else return {};
  for (const s of S) for (let k = 0; k < s.ls.length; k++) await supabase.from("lessons").update({ section_id: s.id, position: k }).eq("id", s.ls[k]);
  refresh();
  return {};
}

/** One field of a lesson (outline, content, assignment or quiz settings). */
export async function saveLessonField(lessonId: string, field: string, value: string): R {
  id(lessonId);
  const { supabase } = await requireUser();
  const l = await courseOfLesson(lessonId);
  if (!l) return { error: "Not found" };
  const cid = l.course_id;
  const up = async (table: string, patch: Record<string, unknown>) => msg((await supabase.from(table).update(patch).eq("lesson_id", lessonId)).error);
  let out: { error?: string } = {};
  switch (field) {
    case "title": out = msg((await supabase.from("lessons").update({ title: String(value).slice(0, 120) }).eq("id", lessonId)).error); break;
    case "mins": out = msg((await supabase.from("lessons").update({ minutes: int(value, 0, 600) }).eq("id", lessonId)).error); break;
    case "drip": out = msg((await supabase.from("lessons").update({ drip_days: int(value, 0, 365) }).eq("id", lessonId)).error); break;
    case "free": out = msg((await supabase.from("lessons").update({ free_preview: value === "1" }).eq("id", lessonId)).error); break;
    case "type": {
      if (!["video", "text", "assignment", "quiz"].includes(value)) return {};
      out = msg((await supabase.from("lessons").update({ type: value }).eq("id", lessonId)).error);
      if (value === "assignment") await supabase.from("assignments").upsert({ lesson_id: lessonId, course_id: cid }, { onConflict: "lesson_id", ignoreDuplicates: true });
      if (value === "quiz") {
        await supabase.from("quizzes").upsert({ lesson_id: lessonId, course_id: cid, pass_pct: 80, time_limit_min: 0, attempts: 3 }, { onConflict: "lesson_id", ignoreDuplicates: true });
        const { count } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
        if (!count) await supabase.from("quiz_questions").insert({ lesson_id: lessonId, course_id: cid, position: 0, question: "", options: ["", "", "", ""], correct_index: 0 });
      }
      break;
    }
    case "body": out = await up("lesson_content", { body: PARAS(value) }); break;
    case "video": out = await up("lesson_content", { video_path: value, poster_url: "" }); break;
    case "vtt": out = await up("lesson_content", { captions_path: value }); break;
    case "a.brief": out = await up("assignments", { brief: String(value).slice(0, 4000) }); break;
    case "a.dueDays": out = await up("assignments", { due_days: int(value, 0, 365) }); break;
    case "a.time": out = /^\d{2}:\d{2}$/.test(value) ? await up("assignments", { due_time: value }) : {}; break;
    case "a.tz": out = CTZS.some((z) => z[0] === value) ? await up("assignments", { time_zone: value }) : {}; break;
    case "a.marks": out = await up("assignments", { marks: Math.max(1, int(value, 1, 1000)) }); break;
    case "a.pass": out = await up("assignments", { pass_mark: int(value, 0, 1000) }); break;
    case "a.sub": out = ["both", "file", "text"].includes(value) ? await up("assignments", { submission_type: value }) : {}; break;
    case "a.rubric": out = await up("assignments", { rubric: String(value).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 20) }); break;
    case "q.pass": out = await up("quizzes", { pass_pct: int(value, 0, 100) }); break;
    case "q.limit": out = await up("quizzes", { time_limit_min: int(value, 0, 600) }); break;
    case "q.attempts": out = await up("quizzes", { attempts: Math.max(1, int(value, 1, 50)) }); break;
    default: return { error: "Unknown field" };
  }
  refresh();
  return out;
}

/** The whole question list of a quiz, saved together (question text, 2–6 options, the correct one). */
export async function saveQuestions(lessonId: string, qs: { q: string; o: string[]; a: number }[]): R {
  id(lessonId);
  const { supabase } = await requireUser();
  const l = await courseOfLesson(lessonId);
  if (!l) return { error: "Not found" };
  const clean = (qs ?? []).slice(0, 50).map((x, i) => {
    const o = (x.o ?? []).slice(0, 6).map((s) => String(s ?? "").slice(0, 300));
    while (o.length < 2) o.push("");
    return { lesson_id: lessonId, course_id: l.course_id, position: i, question: String(x.q ?? "").slice(0, 500), options: o, correct_index: Math.min(o.length - 1, Math.max(0, x.a | 0)) };
  });
  if (!clean.length) return { error: "A quiz needs at least one question" };
  const d = await supabase.from("quiz_questions").delete().eq("lesson_id", lessonId);
  if (d.error) return msg(d.error);
  return msg((await supabase.from("quiz_questions").insert(clean)).error);
}

export async function addLessonFile(lessonId: string, name: string, path: string, sizeBytes: number): R<{ id: string }> {
  id(lessonId);
  const { supabase } = await requireUser();
  const l = await courseOfLesson(lessonId);
  if (!l) return { error: "Not found" };
  if (!path.startsWith(`${l.course_id}/${lessonId}/f/`)) return { error: "Upload the file again" };
  const { count } = await supabase.from("lesson_files").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
  const { data, error } = await supabase.from("lesson_files").insert({ lesson_id: lessonId, course_id: l.course_id, name: String(name).slice(0, 160) || "File", path, size_bytes: Math.max(0, Math.round(+sizeBytes || 0)), position: count ?? 0 }).select("id").single();
  refresh();
  return error ? msg(error) : { id: data.id as string };
}
export async function removeLessonFile(fileId: string): R {
  id(fileId);
  const { supabase } = await requireUser();
  const r = await supabase.from("lesson_files").delete().eq("id", fileId);
  refresh();
  return msg(r.error);
}

export async function addInstructor(courseId: string, memberId: string): R {
  id(courseId);
  id(memberId);
  const { supabase } = await requireUser();
  const { count } = await supabase.from("course_instructors").select("member_id", { count: "exact", head: true }).eq("course_id", courseId);
  const r = await supabase.from("course_instructors").insert({ course_id: courseId, member_id: memberId, position: count ?? 0 });
  refresh();
  return r.error ? { error: r.error.code === "42501" ? "Only the Hub team can add or remove instructors." : r.error.message } : {};
}
export async function removeInstructor(courseId: string, memberId: string): R {
  id(courseId);
  id(memberId);
  const { supabase } = await requireUser();
  const r = await supabase.from("course_instructors").delete().eq("course_id", courseId).eq("member_id", memberId);
  refresh();
  return msg(r.error);
}
