import { loadCourses, loadTeaching, loadTeachingBadge } from "@/lib/courses";
import { CoursesFrame } from "@/components/courses/frame";
import { ManageCourses } from "@/components/courses/teach";

export const metadata = { title: "Manage courses", robots: { index: false } };

export default async function ManageCoursesPage() {
  const [courses, tabs] = await Promise.all([loadCourses(), loadTeachingBadge()]);
  const { stats } = await loadTeaching(courses);
  return <CoursesFrame><ManageCourses courses={courses} stats={stats} tabs={tabs} /></CoursesFrame>;
}
