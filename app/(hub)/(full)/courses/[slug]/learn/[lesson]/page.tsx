import { getViewer } from "@/lib/hub";
import { loadCourses } from "@/lib/courses";
import { CoursesFrame } from "@/components/courses/frame";
import { LessonPage, type Content, type StaffQ } from "@/components/courses/learn";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lesson: string }> }) {
  const { slug, lesson } = await params;
  const c = (await loadCourses()).find((x) => x.slug === slug);
  const l = c?.sections.flatMap((s) => s.lessons).find((x) => x.id === lesson);
  return { title: l ? `${l.title} · ${c!.title}` : "Lesson", robots: { index: false } };
}

export default async function LessonRoute({ params }: { params: Promise<{ slug: string; lesson: string }> }) {
  const { slug, lesson } = await params;
  const all = await loadCourses();
  const c = all.find((x) => x.slug === slug) ?? null;
  let content: Content | null = null;
  let staffQs: StaffQ[] | null = null;
  if (c && UUID.test(lesson)) {
    const { supabase } = await getViewer();
    // the database returns the lesson's inside only to people who may open it
    const { data } = await supabase.from("lesson_content").select("body, video_path, captions_path, poster_url").eq("lesson_id", lesson).maybeSingle();
    if (data) content = { body: data.body as string[], video: !!data.video_path, vtt: !!data.captions_path, poster: (data.poster_url as string) ?? "" };
    if (c.canEdit) {
      const { data: qs } = await supabase.from("quiz_questions").select("question, options, correct_index").eq("lesson_id", lesson).order("position").order("id");
      staffQs = ((qs ?? []) as { question: string; options: string[]; correct_index: number }[]).map((q) => ({ q: q.question, o: q.options, a: q.correct_index }));
    }
  }
  return <CoursesFrame><LessonPage c={c} lessonId={lesson} content={content} staffQs={staffQs} /></CoursesFrame>;
}
