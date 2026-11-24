import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/hub";
import type { Asg, Course, Enrol, Lesson, Person, Review, Sub } from "@/lib/courses-shared";

type P = { id: string; full_name: string | null; headline: string | null; avatar_url: string | null };
export const person = (p: P | null | undefined): Person => ({ id: p?.id ?? "", name: p?.full_name || "A member", role: p?.headline ?? "", avatar: p?.avatar_url ?? null });
const ms = (s: string | null | undefined) => (s ? new Date(s).getTime() : null);

type CourseRow = {
  id: string; slug: string; title: string; topic: string; level: string; language: string; access: "free" | "paid"; price: number; cover_url: string;
  status: "draft" | "published"; is_sample: boolean; created_at: string; summary: string; description: string[]; suits: string[]; outcomes: string[];
  prereq: string[]; materials: string[]; order_rule: "seq" | "any"; asg_rule: "submit" | "pass"; preview_video: string; preview_captions: string;
  preview_poster: string; publish_asked_at: string | null; group: { id: string; slug: string; name: string; is_private: boolean } | null;
};

/** Every course the viewer may see (the database decides), with outline, instructors and file names. */
export const loadCourses = cache(async (): Promise<Course[]> => {
  const { supabase, userId, isStaff } = await getViewer();
  const { data } = await supabase
    .from("courses")
    .select("id, slug, title, topic, level, language, access, price, cover_url, status, is_sample, created_at, summary, description, suits, outcomes, prereq, materials, order_rule, asg_rule, preview_video, preview_captions, preview_poster, publish_asked_at, group:groups(id, slug, name, is_private)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as CourseRow[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [ins, secs, les, files, asgs, quizzes] = await Promise.all([
    supabase.from("course_instructors").select("course_id, position, member:profiles(id, full_name, headline, avatar_url)").in("course_id", ids).order("position"),
    supabase.from("course_sections").select("id, course_id, title, position").in("course_id", ids).order("position"),
    supabase.from("lessons").select("id, course_id, section_id, title, type, minutes, free_preview, drip_days, position, created_at").in("course_id", ids).order("position").order("created_at"),
    supabase.from("lesson_files").select("id, lesson_id, name, size_bytes, position").in("course_id", ids).order("position"),
    supabase.from("assignments").select("lesson_id, brief, due_days, due_time, time_zone, marks, pass_mark, submission_type, rubric").in("course_id", ids),
    supabase.from("quizzes").select("lesson_id, pass_pct, time_limit_min, attempts").in("course_id", ids),
  ]);
  const asgBy = new Map(((asgs.data ?? []) as { lesson_id: string; brief: string; due_days: number; due_time: string; time_zone: string; marks: number; pass_mark: number; submission_type: Asg["sub"]; rubric: string[] }[]).map((a) => [a.lesson_id, { brief: a.brief, dueDays: a.due_days, time: a.due_time.slice(0, 5), tz: a.time_zone, marks: a.marks, pass: a.pass_mark, sub: a.submission_type, rubric: a.rubric } satisfies Asg]));
  const quizBy = new Map(((quizzes.data ?? []) as { lesson_id: string; pass_pct: number; time_limit_min: number; attempts: number }[]).map((q) => [q.lesson_id, { pass: q.pass_pct, limit: q.time_limit_min, attempts: q.attempts, n: 0 }]));
  const filesBy = new Map<string, Lesson["res"]>();
  for (const f of (files.data ?? []) as { id: string; lesson_id: string; name: string; size_bytes: number }[]) filesBy.set(f.lesson_id, [...(filesBy.get(f.lesson_id) ?? []), { id: f.id, name: f.name, size: f.size_bytes }]);
  const lessonsBy = new Map<string, Lesson[]>();
  for (const l of (les.data ?? []) as { id: string; section_id: string; title: string; type: Lesson["type"]; minutes: number; free_preview: boolean; drip_days: number }[]) {
    lessonsBy.set(l.section_id, [...(lessonsBy.get(l.section_id) ?? []), { id: l.id, title: l.title, type: l.type, mins: l.minutes, free: l.free_preview, drip: l.drip_days, res: filesBy.get(l.id) ?? [], asg: asgBy.get(l.id), quiz: quizBy.get(l.id) }]);
  }
  const secBy = new Map<string, Course["sections"]>();
  for (const s of (secs.data ?? []) as { id: string; course_id: string; title: string }[]) secBy.set(s.course_id, [...(secBy.get(s.course_id) ?? []), { id: s.id, title: s.title, lessons: lessonsBy.get(s.id) ?? [] }]);
  const insBy = new Map<string, Person[]>();
  for (const i of (ins.data ?? []) as unknown as { course_id: string; member: P }[]) insBy.set(i.course_id, [...(insBy.get(i.course_id) ?? []), person(i.member)]);
  return rows.map((r) => {
    const instructors = insBy.get(r.id) ?? [];
    return {
      id: r.id, slug: r.slug, title: r.title, topic: r.topic, level: r.level, lang: r.language, access: r.access, price: r.price, cover: r.cover_url,
      instructors, status: r.status, sample: r.is_sample, created: ms(r.created_at)!, summary: r.summary, desc: r.description, suits: r.suits,
      outcomes: r.outcomes, prereq: r.prereq, materials: r.materials, rules: { order: r.order_rule, asg: r.asg_rule }, sections: secBy.get(r.id) ?? [],
      pvideo: !!r.preview_video, pvtt: !!r.preview_captions, pposter: r.preview_poster, group: r.group && !r.group.is_private ? { id: r.group.id, slug: r.group.slug, name: r.group.name } : null,
      askPub: ms(r.publish_asked_at), canEdit: !!userId && (isStaff || instructors.some((i) => i.id === userId)),
    } satisfies Course;
  });
});

/** Reviews the viewer can see, newest first, by course. */
export const loadReviews = cache(async (): Promise<Record<string, Review[]>> => {
  const { supabase, userId } = await getViewer();
  const { data } = await supabase.from("course_reviews").select("id, course_id, stars, body, created_at, hidden_at, member:profiles(id, full_name, headline, avatar_url)").order("created_at", { ascending: false });
  const out: Record<string, Review[]> = {};
  for (const r of (data ?? []) as unknown as { id: string; course_id: string; stars: number; body: string; created_at: string; hidden_at: string | null; member: P }[]) {
    if (r.hidden_at) continue;
    (out[r.course_id] ??= []).push({ id: r.id, by: person(r.member), stars: r.stars, text: r.body, t: ms(r.created_at)!, mine: r.member?.id === userId });
  }
  return out;
});

export function toSub(s: { id: string; submitted_at: string; body: string; file_name: string; file_size: number; late: boolean; grade_marks: number | null; feedback: string; graded_by: string | null; graded_at: string | null; seen_at: string | null }): Sub {
  return {
    id: s.id, t: ms(s.submitted_at)!, text: s.body, file: s.file_name ? { name: s.file_name, size: s.file_size } : null, late: s.late,
    grade: s.grade_marks != null ? { marks: s.grade_marks, fb: s.feedback, by: s.graded_by ?? "", t: ms(s.graded_at)! } : null, seen: !!s.seen_at,
  };
}

/** The viewer's own learning: enrolments with progress, saved courses and the classmates setting. */
export const loadMine = cache(async () => {
  const { supabase, userId } = await getViewer();
  const en: Record<string, Enrol> = {};
  const saved = new Set<string>();
  if (!userId) return { en, saved, hidden: false };
  const [e, p, a, s, sv, pref] = await Promise.all([
    supabase.from("enrolments").select("course_id, enrolled_at, payment_id, completed_at, last_lesson_id, last_opened_at").eq("member_id", userId),
    supabase.from("lesson_progress").select("course_id, lesson_id, done_at, video_pos").eq("member_id", userId),
    supabase.from("quiz_attempts").select("course_id, lesson_id").eq("member_id", userId).eq("passed", true),
    supabase.from("submissions").select("id, course_id, lesson_id, submitted_at, body, file_name, file_size, late, grade_marks, feedback, graded_by, graded_at, seen_at").eq("member_id", userId),
    supabase.from("saved_courses").select("course_id").eq("member_id", userId),
    supabase.from("course_prefs").select("hide_from_classmates").eq("member_id", userId).maybeSingle(),
  ]);
  for (const r of (e.data ?? []) as { course_id: string; enrolled_at: string; payment_id: string | null; completed_at: string | null; last_lesson_id: string | null; last_opened_at: string | null }[]) {
    en[r.course_id] = { t: ms(r.enrolled_at)!, lastT: ms(r.last_opened_at), last: r.last_lesson_id, completed: ms(r.completed_at), paid: !!r.payment_id, done: {}, pos: {}, passed: {}, subs: {} };
  }
  for (const r of (p.data ?? []) as { course_id: string; lesson_id: string; done_at: string | null; video_pos: number }[]) {
    const x = en[r.course_id];
    if (!x) continue;
    if (r.done_at) x.done[r.lesson_id] = ms(r.done_at)!;
    if (+r.video_pos > 0) x.pos[r.lesson_id] = +r.video_pos;
  }
  for (const r of (a.data ?? []) as { course_id: string; lesson_id: string }[]) if (en[r.course_id]) en[r.course_id].passed[r.lesson_id] = true;
  for (const r of (s.data ?? []) as (Parameters<typeof toSub>[0] & { course_id: string; lesson_id: string })[]) if (en[r.course_id]) en[r.course_id].subs[r.lesson_id] = toSub(r);
  for (const r of (sv.data ?? []) as { course_id: string }[]) saved.add(r.course_id);
  return { en, saved, hidden: !!(pref.data as { hide_from_classmates?: boolean } | null)?.hide_from_classmates };
});

/** Is the viewer an instructor of any course (shows the Teaching tab), and how much work waits for grading. */
export const loadTeachingBadge = cache(async () => {
  const { supabase, userId, isStaff } = await getViewer();
  if (!userId) return { teach: false, toGrade: 0 };
  const { data } = await supabase.from("course_instructors").select("course_id").eq("member_id", userId);
  const mine = ((data ?? []) as { course_id: string }[]).map((r) => r.course_id);
  const teach = isStaff || mine.length > 0;
  if (!teach) return { teach, toGrade: 0 };
  // the team sees every course, but "To grade" counts the courses they can edit, as in the hand-off
  const { count } = await supabase.from("submissions").select("id", { count: "exact", head: true }).is("graded_at", null).neq("member_id", userId);
  return { teach, toGrade: count ?? 0 };
});

export type Ctx = {
  member: boolean; staff: boolean; userId: string | null;
  me: Person | null; location: string | null;
};
export const loadCtx = cache(async (): Promise<Ctx> => {
  const { userId, isStaff, profile } = await getViewer();
  return { member: !!userId, staff: isStaff, userId, me: profile ? person(profile as unknown as P) : null, location: (profile as { location?: string | null } | null)?.location ?? null };
});

/** For instructors and the team: work to grade, and the numbers on each course card. */
export const loadTeaching = cache(async (courses: Course[]) => {
  const { supabase } = await getViewer();
  const ids = courses.filter((c) => c.canEdit).map((c) => c.id);
  const stats: Record<string, { enrolled: number; completed: number; quiz: number | null }> = {};
  const work: { c: string; l: string; who: Person; s: Sub; due: number | null }[] = [];
  if (!ids.length) return { stats, work };
  const [en, at, sub] = await Promise.all([
    supabase.from("enrolments").select("course_id, member_id, enrolled_at, completed_at").in("course_id", ids),
    supabase.from("quiz_attempts").select("course_id, score, total").in("course_id", ids).not("submitted_at", "is", null),
    supabase.from("submissions").select("id, course_id, lesson_id, member_id, submitted_at, body, file_name, file_size, late, grade_marks, feedback, graded_by, graded_at, seen_at, member:profiles!submissions_member_id_fkey(id, full_name, headline, avatar_url)").in("course_id", ids).order("submitted_at"),
  ]);
  const enrolled = new Map<string, number>();
  for (const r of (en.data ?? []) as { course_id: string; member_id: string; enrolled_at: string; completed_at: string | null }[]) {
    const s = (stats[r.course_id] ??= { enrolled: 0, completed: 0, quiz: null });
    s.enrolled++;
    if (r.completed_at) s.completed++;
    enrolled.set(`${r.course_id}|${r.member_id}`, new Date(r.enrolled_at).getTime());
  }
  const q: Record<string, number[]> = {};
  for (const r of (at.data ?? []) as { course_id: string; score: number; total: number }[]) if (r.total) (q[r.course_id] ??= []).push((100 * r.score) / r.total);
  for (const [cid, v] of Object.entries(q)) (stats[cid] ??= { enrolled: 0, completed: 0, quiz: null }).quiz = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  const { dueAt } = await import("@/lib/courses-shared");
  for (const r of (sub.data ?? []) as unknown as (Parameters<typeof toSub>[0] & { course_id: string; lesson_id: string; member_id: string; member: P })[]) {
    const c = courses.find((x) => x.id === r.course_id);
    const l = c?.sections.flatMap((s) => s.lessons).find((x) => x.id === r.lesson_id);
    const t = enrolled.get(`${r.course_id}|${r.member_id}`);
    const due = l && t ? dueAt(l, { t, lastT: null, last: null, completed: null, paid: false, done: {}, pos: {}, passed: {}, subs: {} }) : null;
    work.push({ c: r.course_id, l: r.lesson_id, who: person(r.member), s: toSub(r), due });
  }
  return { stats, work };
});
