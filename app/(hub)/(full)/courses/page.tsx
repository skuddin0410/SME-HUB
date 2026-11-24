import { loadCourses, loadTeachingBadge } from "@/lib/courses";
import { CoursesFrame } from "@/components/courses/frame";
import { Browse } from "@/components/courses/browse";

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  const [courses, tabs] = await Promise.all([loadCourses(), loadTeachingBadge()]);
  return <CoursesFrame><Browse courses={courses} tabs={tabs} /></CoursesFrame>;
}
