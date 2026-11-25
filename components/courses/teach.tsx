"use client";
import { Crumbs } from "@/components/zip/crumbs";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ic } from "@/components/zip/ic";
import { TeamGate } from "@/components/courses/team-gate";
import { ago, courseHref, lessonsOf, names, plural, rating, size, type Course, type Person, type Sub } from "@/lib/courses-shared";
import { gradeSubmission, newCourse, publishCourse } from "@/app/(hub)/course-actions";
import { Av, CrGate, CrTabs, StatusTag, useCr } from "@/components/courses/ui";

export type Work = { c: string; l: string; who: Person; s: Sub; due: number | null };
export type Stat = { enrolled: number; completed: number; quiz: number | null };
type Tabs = { teach: boolean; toGrade: number };

function GradeRow({ w, c, open, setOpen }: { w: Work; c: Course; open: boolean; setOpen: (k: string | null) => void }) {
  const x = useCr();
  const router = useRouter();
  const l = lessonsOf(c).find((v) => v.id === w.l)!;
  const A = l.asg!;
  const [marks, setMarks] = useState<string>(w.s.grade ? String(w.s.grade.marks) : "");
  const [fb, setFb] = useState(w.s.grade?.fb ?? "");
  const first = w.who.name.split(" ")[0];
  const late = w.s.late || (!!w.due && w.s.t > w.due);
  const row = (
    <div className={`crgr${open ? " open" : ""}`}>
      <Av p={w.who} size="s" />
      <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
        <b className="small">{w.who.name}</b>
        <span className="small muted">{l.title} · {c.title} · {ago(w.s.t)}{late && <> · <span className="crlate">Late</span></>}</span>
      </span>
      {!open && <button type="button" className="btn sm" onClick={() => setOpen(w.s.id)}>Grade</button>}
    </div>
  );
  if (!open) return row;
  return (
    <>
      {row}
      <div className="crgform">
        {w.s.file && (
          <div className="crres"><Ic n="doc" s={18} /><span className="grow small"><b>{w.s.file.name}</b> · {size(w.s.file.size)}</span>
            <a className="btn sm ghost" href={`/api/course-media?s=${w.s.id}`}><Ic n="dl" s={14} />Download</a></div>
        )}
        {w.s.text && <blockquote className="crq">{w.s.text}</blockquote>}
        {A.rubric.length > 0 && <details className="small"><summary>How it’s marked</summary><ul>{A.rubric.map((t, i) => <li key={i}>{t}</li>)}</ul></details>}
        <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="small" style={{ maxWidth: 160 }}>Marks out of {A.marks}<input className="field" type="number" min={0} max={A.marks} inputMode="numeric" id="crgm" value={marks} onChange={(e) => setMarks(e.target.value)} /></label>
          <span className="small muted" style={{ paddingBottom: 12 }}>Pass mark: {A.pass}</span>
        </div>
        <label className="small" htmlFor="crgf">Feedback for {first}<textarea className="field" id="crgf" rows={4} placeholder="What they did well, and one thing to improve" value={fb} onChange={(e) => setFb(e.target.value)} /></label>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={x.busy} onClick={() => {
            const mk = marks === "" ? NaN : +marks;
            if (isNaN(mk) || mk < 0 || mk > A.marks) return x.toast(`Enter marks from 0 to ${A.marks}`);
            if (!fb.trim()) return x.toast("Add a line of feedback");
            void x.run(async () => {
              const r = await gradeSubmission(w.s.id, mk, fb);
              if (r?.error) return x.toast(r.error);
              setOpen(null);
              x.toast(`Grade sent to ${w.who.name}`);
              router.refresh();
            });
          }}>{w.s.grade ? "Update grade" : "Send grade and feedback"}</button>
          <button type="button" className="btn ghost" onClick={() => setOpen(null)}>Cancel</button>
          <span className="small muted">{first} gets an email and a notification.</span>
        </div>
      </div>
    </>
  );
}

export function Teaching({ courses, work, stats, tabs, focus }: { courses: Course[]; work: Work[]; stats: Record<string, Stat>; tabs: Tabs; focus?: string }) {
  const x = useCr();
  const [open, setOpen] = useState<string | null>(focus ?? null);
  const head = <CrTabs a="teaching" {...tabs} savedN={[...x.saved].length} />;
  if (!x.member) return <>{head}<CrGate t="Teaching is for instructors" x="Sign in with an instructor account to grade work and edit your courses." /></>;
  const cs = courses.filter((c) => c.canEdit);
  if (!cs.length) {
    return (
      <>{head}
        <div className="card crempty"><span className="sq big"><Ic n="cap" s={22} /></span><strong>You don’t teach a course yet</strong>
          <p className="muted">SME Advisors can teach courses for members. The CanadianSME team sets up the course and adds you as an instructor.</p>
          <Link className="btn ghost" href="/smb-advisor">About SME Advisors</Link></div>
      </>
    );
  }
  const byId = new Map(cs.map((c) => [c.id, c]));
  const mine = work.filter((w) => byId.has(w.c));
  const tg = mine.filter((w) => !w.s.grade).sort((a, b) => a.s.t - b.s.t);
  const done = mine.filter((w) => w.s.grade).sort((a, b) => b.s.grade!.t - a.s.grade!.t);
  return (
    <>
      {head}
      <div className="pagehead crph"><Crumbs items={[["Courses", "/courses"], ["Teaching"]]} /><h1>Your courses and grading</h1><p className="muted">Grade assignments, check how learners are doing and edit your course content. Learners see your feedback as soon as you save it.</p></div>
      <section className="card">
        <div className="row" style={{ flexWrap: "wrap" }}><h2 className="grow">To grade <span className="muted">{tg.length}</span></h2><span className="small muted">Oldest first</span></div>
        {tg.length ? tg.map((w) => <GradeRow key={w.s.id} w={w} c={byId.get(w.c)!} open={open === w.s.id} setOpen={setOpen} />) : <p className="muted small">You’re all caught up. New submissions show here and in your notifications.</p>}
      </section>
      <h2 className="crsec">Your courses</h2>
      <div className="crtstats">
        {cs.map((c) => {
          const st = stats[c.id] ?? { enrolled: 0, completed: 0, quiz: null };
          const rt = rating(x.reviews[c.id] ?? []);
          return (
            <div className="card crtc" key={c.id}>
              <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="crtcimg" src={c.cover || undefined} alt="" />
                <div className="stack grow" style={{ gap: 4, minWidth: 0 }}><Link className="crt" href={courseHref(c)}><b>{c.title}</b></Link><span className="small"><StatusTag c={c} /></span></div>
              </div>
              <div className="crnums">
                <div><b>{st.enrolled}</b><span>enrolled</span></div>
                <div><b>{st.completed}</b><span>completed</span></div>
                <div><b>{rt ? `${rt.avg} ★` : "–"}</b><span>{rt ? `${rt.n} reviews` : "no reviews"}</span></div>
                <div><b>{st.quiz != null ? `${st.quiz}%` : "–"}</b><span>quiz average</span></div>
              </div>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <Link className="btn sm ghost" href={`/courses/edit/${c.id}`}><Ic n="edit" s={14} />Edit course</Link>
                <button type="button" className="btn sm ghost" onClick={() => x.startPreview(c)}><Ic n="eye" s={14} />Preview as a learner</button>
              </div>
            </div>
          );
        })}
      </div>
      {done.length > 0 && (
        <section className="card">
          <h2>Recently graded</h2>
          {done.slice(0, 8).map((w) => {
            const c = byId.get(w.c)!;
            const l = lessonsOf(c).find((v) => v.id === w.l)!;
            if (open === w.s.id) return <GradeRow key={w.s.id} w={w} c={c} open setOpen={setOpen} />;
            return (
              <div className="crgr" key={w.s.id}>
                <Av p={w.who} size="s" />
                <span className="grow small"><b>{w.who.name}</b> · {l.title} · {c.title}</span>
                <span className={`crst ${w.s.grade!.marks >= l.asg!.pass ? "done" : "lock"}`}>{w.s.grade!.marks}/{l.asg!.marks}</span>
                <button type="button" className="btn sm ghost" onClick={() => { setOpen(w.s.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit grade</button>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

export function ManageCourses({ courses, stats, tabs }: { courses: Course[]; stats: Record<string, Stat>; tabs: Tabs }) {
  const x = useCr();
  const router = useRouter();
  const head = <CrTabs a="courseadmin" {...tabs} savedN={[...x.saved].length} />;
  if (!x.staff) return <>{head}<TeamGate name="Manage courses" /></>;
  const cs = [...courses].sort((a, b) => Number(a.status === "published") - Number(b.status === "published") || b.created - a.created);
  return (
    <>
      {head}
      <div className="pagehead crph row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="stack grow" style={{ gap: 4 }}><Crumbs items={[["Hub team"], ["Manage courses"]]} /><h1>Manage courses</h1><p className="muted">Create courses, choose instructors and publish when they’re ready. Instructors can edit their own courses; only the Hub team can publish.</p></div>
        <button type="button" className="btn" disabled={x.busy} onClick={() => void x.run(async () => {
          const r = await newCourse();
          if (r?.error) return x.toast(r.error);
          router.push(`/courses/edit/${r.id}`);
        })}><Ic n="plus" s={15} />New course</button>
      </div>
      <div className="card crtable">
        <div className="cmpwrap">
          <table className="crtbl">
            <thead><tr><th scope="col">Course</th><th scope="col">Status</th><th scope="col">Instructors</th><th scope="col">Access</th><th scope="col">Enrolled</th><th scope="col">Completed</th><th scope="col">Rating</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {cs.map((c) => {
                const st = stats[c.id] ?? { enrolled: 0, completed: 0, quiz: null };
                const rt = rating(x.reviews[c.id] ?? []);
                const n = lessonsOf(c).length;
                return (
                  <tr key={c.id}>
                    <td><Link href={courseHref(c)}><b>{c.title || "Untitled course"}</b></Link><span className="small muted" style={{ display: "block" }}>{c.topic} · {plural(n, "lesson")}</span></td>
                    <td><StatusTag c={c} /></td>
                    <td className="small">{names(c) || "None yet"}</td>
                    <td className="small">{c.access === "paid" ? `CAD $${c.price}` : "Free"}</td>
                    <td>{st.enrolled}</td>
                    <td>{st.completed}</td>
                    <td className="small">{rt ? `${rt.avg} ★ (${rt.n})` : "–"}</td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <Link className="btn sm ghost" href={`/courses/edit/${c.id}`}>Edit</Link>
                        {c.status === "published"
                          ? <button type="button" className="btn sm ghost" onClick={() => x.open({ type: "unpub", c, enrolled: st.enrolled })}>Unpublish</button>
                          : <button type="button" className="btn sm" disabled={x.busy} onClick={() => void x.run(async () => {
                            const r = await publishCourse(c.id);
                            if (r?.error) {
                              x.toast(r.error);
                              if (/cross/.test(r.error)) router.push(`/courses/edit/${c.id}?tab=publish`);
                              return;
                            }
                            x.toast("Published. Members can now find it in Courses.");
                            router.refresh();
                          })}>Publish</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
