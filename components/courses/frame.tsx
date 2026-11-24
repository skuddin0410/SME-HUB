import { getViewer } from "@/lib/hub";
import { loadCtx, loadMine, loadReviews } from "@/lib/courses";
import { CoursesProvider } from "@/components/courses/ui";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/courses.css";
import "@/styles/courses-extra.css";

/** Every Courses page: the viewer, their learning, reviews and the shared pop-up windows. */
export async function CoursesFrame({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const [ctx, mine, reviews, { supabase }] = await Promise.all([loadCtx(), loadMine(), loadReviews(), getViewer()]);
  const { data: cats } = await supabase.from("report_categories").select("name, description, show").in("show", ["content", "both"]).order("position");
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40, ...(wide ? {} : {}) }}>
        <CoursesProvider
          member={ctx.member} staff={ctx.staff} userId={ctx.userId} location={ctx.location}
          enrols={mine.en} hidden={mine.hidden} saved={[...mine.saved]} reviews={reviews}
          cats={((cats ?? []) as { name: string; description: string }[]).map((c) => [c.name, c.description] as [string, string])}
        >
          {children}
        </CoursesProvider>
      </div>
    </div>
  );
}
