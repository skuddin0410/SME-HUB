import { loadCourses, loadTeachingBadge } from "@/lib/courses";
import { CoursesFrame } from "@/components/courses/frame";
import { MyLearning } from "@/components/courses/browse";

export const metadata = { title: "My learning" };

export default async function MyLearningPage() {
  const [courses, tabs] = await Promise.all([loadCourses(), loadTeachingBadge()]);
  return <CoursesFrame><MyLearning courses={courses} tabs={tabs} /></CoursesFrame>;
}
