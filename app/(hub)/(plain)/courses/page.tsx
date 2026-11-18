import { BookOpen, GraduationCap } from "lucide-react";
import { COURSES } from "@/lib/content";
import { Hero } from "@/components/content";

export const metadata = { title: "Courses" };

export default function CoursesPage() {
  return (
    <>
      <Hero title="Courses" text="Short courses taught by SMB Advisors and guest experts." />
      <ul className="space-y-3">
        {COURSES.map((c) => (
          <li key={c.title} className="panel overflow-hidden sm:flex">
            <div className="cover flex h-32 shrink-0 items-center justify-center text-white sm:h-auto sm:w-44">
              <GraduationCap className="h-10 w-10" />
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-primary">{c.category}</p>
              <h2 className="mt-1 text-base font-semibold leading-snug">{c.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.about}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{c.instructor}</span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {c.lessons} lessons
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">{c.price}</span>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Lessons have not been added here yet.</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
