import { getViewer } from "@/lib/hub";
import { loadCourses } from "@/lib/courses";
import { CoursesFrame } from "@/components/courses/frame";
import { CoursePage, type Mate } from "@/components/courses/course-page";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = (await loadCourses()).find((x) => x.slug === slug);
  return { title: c ? c.title : "Course" };
}

export default async function CourseDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ paid?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const all = await loadCourses();
  const c = all.find((x) => x.slug === slug) ?? null;
  let mates: Mate[] = [];
  let mateCount = 0;
  if (c) {
    const { supabase, userId } = await getViewer();
    const [m, n] = await Promise.all([
      userId ? supabase.rpc("course_classmates", { cid: c.id }) : Promise.resolve({ data: [] }),
      supabase.rpc("course_learner_count", { cid: c.id }),
    ]);
    mates = ((m.data ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map((r) => ({ id: r.id, name: r.full_name || "A member", avatar: r.avatar_url }));
    mateCount = userId ? mates.length : ((n.data as number | null) ?? 0);
  }
  return <CoursesFrame><CoursePage c={c} all={all} mates={mates} mateCount={mateCount} paid={sp.paid} /></CoursesFrame>;
}
