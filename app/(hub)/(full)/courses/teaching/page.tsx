import { loadCourses, loadTeaching, loadTeachingBadge } from "@/lib/courses";
import { CoursesFrame } from "@/components/courses/frame";
import { Teaching } from "@/components/courses/teach";

export const metadata = { title: "Teaching", robots: { index: false } };

export default async function TeachingPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const [courses, tabs, sp] = await Promise.all([loadCourses(), loadTeachingBadge(), searchParams]);
  const { stats, work } = await loadTeaching(courses);
  return <CoursesFrame><Teaching courses={courses} work={work} stats={stats} tabs={tabs} focus={sp.grade} /></CoursesFrame>;
}
