import { getViewer } from "@/lib/hub";
import { loadCourses, person } from "@/lib/courses";
import { CoursesFrame } from "@/components/courses/frame";
import { Editor, type EdCourse } from "@/components/courses/editor";
import type { EdLesson } from "@/lib/courses-shared";

export const metadata = { title: "Edit course", robots: { index: false } };

export default async function EditCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = (await loadCourses()).find((x) => x.id === id) ?? null;
  const { supabase, isStaff } = await getViewer();
  let ed: EdCourse | null = null;
  let groups: { id: string; name: string }[] = [];
  let members: ReturnType<typeof person>[] = [];
  if (c) {
    const [content, qs, g, mem, en, cg] = await Promise.all([
      supabase.from("lesson_content").select("lesson_id, body, video_path, captions_path, poster_url").eq("course_id", c.id),
      supabase.from("quiz_questions").select("lesson_id, question, options, correct_index, position").eq("course_id", c.id).order("position").order("id"),
      supabase.from("groups").select("id, name").eq("is_private", false).order("name"),
      isStaff ? supabase.from("profiles").select("id, full_name, headline, avatar_url").eq("status", "active").order("full_name").limit(1000) : Promise.resolve({ data: [] }),
      supabase.from("enrolments").select("member_id", { count: "exact", head: true }).eq("course_id", c.id),
      supabase.from("courses").select("group_id").eq("id", c.id).maybeSingle(),
    ]);
    const ct = new Map(((content.data ?? []) as { lesson_id: string; body: string[]; video_path: string; captions_path: string; poster_url: string }[]).map((r) => [r.lesson_id, r]));
    const qBy = new Map<string, EdLesson["qs"]>();
    for (const q of (qs.data ?? []) as { lesson_id: string; question: string; options: string[]; correct_index: number }[]) qBy.set(q.lesson_id, [...(qBy.get(q.lesson_id) ?? []), { q: q.question, o: q.options, a: q.correct_index }]);
    ed = {
      ...c,
      groupId: ((cg.data as { group_id: string | null } | null)?.group_id) ?? "",
      enrolled: en.count ?? 0,
      sectionsEd: c.sections.map((s) => ({
        id: s.id, title: s.title,
        lessons: s.lessons.map((l) => {
          const r = ct.get(l.id);
          return { ...l, body: r?.body ?? [], video: r?.video_path ?? "", vtt: r?.captions_path ?? "", poster: r?.poster_url ?? "", qs: qBy.get(l.id) ?? [], asg: l.asg ?? (l.type === "assignment" ? { brief: "", dueDays: 7, time: "23:59", tz: "America/Toronto", marks: 10, pass: 6, sub: "both", rubric: [] } : undefined), quiz: l.quiz ?? (l.type === "quiz" ? { pass: 80, limit: 0, attempts: 3, n: 0 } : undefined) };
        }),
      })),
    };
    groups = (g.data ?? []) as { id: string; name: string }[];
    members = ((mem.data ?? []) as { id: string; full_name: string | null; headline: string | null; avatar_url: string | null }[]).map(person);
  }
  return <CoursesFrame><Editor key={ed ? `${ed.id}` : "none"} course={ed} groups={groups} members={members} initialTab={sp.tab} /></CoursesFrame>;
}
