import { loadCourses, loadTeachingBadge } from "@/lib/courses";
import { CoursesFrame } from "@/components/courses/frame";
import { Saved } from "@/components/courses/browse";

export const metadata = { title: "Saved courses" };

export default async function SavedCoursesPage() {
  const [courses, tabs] = await Promise.all([loadCourses(), loadTeachingBadge()]);
  return <CoursesFrame><Saved courses={courses} tabs={tabs} /></CoursesFrame>;
}
