"use client";
import { Crumbs } from "@/components/zip/crumbs";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { CLANGS, CLEVELS, CTOPICS, CTYPES, TOPIC_ICON, ago, complete, courseHref, learnHref, lessonsOf, names, nextLesson, progress, type Course, type Lesson } from "@/lib/courses-shared";
import { setClassmates } from "@/app/(hub)/course-actions";
import { CrCard, CrGate, CrMain, CrTabs, useCr } from "@/components/courses/ui";

type Tabs = { teach: boolean; toGrade: number };

function useRecent(courses: Course[]) {
  const x = useCr();
  let best: { c: Course; l: Lesson | null; t: number } | null = null;
  for (const c of courses) {
    const e = x.enrols[c.id];
    if (!e || complete(c, e)) continue;
    const t = e.lastT ?? e.t;
    if (!best || t > best.t) best = { c, l: null, t };
  }
  if (best) best.l = nextLesson(best.c, x.enrols[best.c.id], false);
  return best;
}

function GoBtn({ c, cls, children, start }: { c: Course; cls?: string; children: React.ReactNode; start?: boolean }) {
  const x = useCr();
  const router = useRouter();
  return (
    <button type="button" className={cls ?? "btn"} style={start ? { alignSelf: "flex-start" } : undefined} onClick={() => {
      const l = nextLesson(c, x.enrols[c.id] ?? null, false);
      if (l) router.push(learnHref(c, l));
    }}>{children}</button>
  );
}

export function Browse({ courses, tabs }: { courses: Course[]; tabs: Tabs }) {
  const x = useCr();
  const [F, setF] = useState({ q: "", topic: "", level: "", lang: "", access: "", filters: false });
  const set = (k: keyof typeof F, v: string | boolean) => setF({ ...F, [k]: v });
  const all = courses;
  const q = F.q.trim().toLowerCase();
  const list = useMemo(() => all
    .filter((c) => (!F.topic || c.topic === F.topic) && (!F.level || c.level === F.level) && (!F.lang || c.lang === F.lang) && (!F.access || c.access === F.access)
      && (!q || `${c.title} ${c.topic} ${names(c)} ${c.summary}`.toLowerCase().includes(q)))
    .sort((a, b) => Number(a.status !== "published") - Number(b.status !== "published") || b.created - a.created), [all, F, q]);
  const tc: Record<string, number> = {};
  for (const c of all) tc[c.topic] = (tc[c.topic] ?? 0) + 1;
  const act: [keyof typeof F, string][] = [];
  for (const k of ["topic", "level", "lang", "access"] as const) if (F[k]) act.push([k, k === "access" ? (F[k] === "free" ? "Free" : "Paid") : (F[k] as string)]);
  const recent = useRecent(all);
  const cont = x.member ? recent : null;
  const pub = all.filter((c) => c.status === "published");
  const clear = () => setF({ ...F, q: "", topic: "", level: "", lang: "", access: "" });
  const sel = (k: "topic" | "level" | "lang" | "access", lab: string, opts: (string | [string, string])[]) => (
    <label className="small">{lab}
      <select className="field" value={F[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">{k === "access" ? "Free and paid" : "Any"}</option>
        {opts.map((o) => { const v = Array.isArray(o) ? o[0] : o; const t = Array.isArray(o) ? o[1] : o; return <option key={v} value={v}>{t}</option>; })}
      </select>
    </label>
  );
  return (
    <>
      <CrTabs a="courses" {...tabs} savedN={[...x.saved].filter((id) => all.some((c) => c.id === id)).length} />
      <section className="bdhero crhero">
        <div className="bdh-in">
          <Crumbs items={[["Courses"]]} />
          <h1>Learn what your business needs <span className="hl">next</span></h1>
          <p className="lead">Short courses from Canadian owners and advisors. Most take under an hour, and you can stop and pick up on any device.</p>
          <div className="bdsearch" role="search">
            <span className="bdsf"><Ic n="search" s={18} /><label className="sr" htmlFor="crq">Search courses</label>
              <input id="crq" type="search" placeholder="Search by title, topic or instructor" value={F.q} onChange={(e) => set("q", e.target.value)} /></span>
          </div>
          <div className="bdstats"><span><b>{pub.length}</b> courses</span><span><b>{pub.filter((c) => c.access === "free").length}</b> free</span><span><b>{Object.keys(tc).length}</b> topics</span></div>
        </div>
        <div className="bdh-side">
          {cont ? (
            <div className="bdlist crcont">
              <span className="eyebrow">Continue learning</span>
              <strong>{cont.c.title}</strong>
              <span className="small">Next: {cont.l?.title ?? ""} · {progress(cont.c, x.enrols[cont.c.id]).done} of {progress(cont.c, x.enrols[cont.c.id]).total} done</span>
              <span className="crbar"><i style={{ width: `${progress(cont.c, x.enrols[cont.c.id]).pct}%` }} /></span>
              <GoBtn c={cont.c} cls="btn" start><Ic n="play" s={15} />Continue learning</GoBtn>
            </div>
          ) : x.member ? (
            <div className="bdlist"><strong>Teach a course</strong><span className="small">SME Advisors can teach courses for members. Tell the CanadianSME team what you want to teach.</span><Link className="btn ghost" style={{ alignSelf: "flex-start" }} href="/smb-advisor">About SME Advisors</Link></div>
          ) : (
            <div className="bdlist"><strong>Free for members</strong><span className="small">Join free to enrol, save courses and keep your progress on every device.</span><Link className="btn" style={{ alignSelf: "flex-start" }} href="/auth/sign-up">Join free</Link></div>
          )}
        </div>
      </section>
      <nav className="bdcats" aria-label="Browse by topic">
        <button type="button" className="bdcat" aria-pressed={!F.topic} onClick={() => set("topic", "")}><Ic n="grid" s={18} /><span>All</span><small>{all.length}</small></button>
        {CTOPICS.filter((t) => tc[t]).map((t) => (
          <button key={t} type="button" className="bdcat" aria-pressed={F.topic === t} onClick={() => set("topic", t)}><Ic n={TOPIC_ICON[t] ?? "book"} s={18} /><span>{t}</span><small>{tc[t]}</small></button>
        ))}
      </nav>
      <div className="bdcols">
        <aside className="bdside">
          <button type="button" className="btn ghost bzfbtn" aria-expanded={F.filters} onClick={() => set("filters", !F.filters)}><Ic n="filter" s={15} />Filters{act.length ? ` (${act.length})` : ""}</button>
          <div className={`card bzfilters${F.filters ? " open" : ""}`}>
            <h2 style={{ fontSize: 15 }}>Filters</h2>
            {sel("topic", "Topic", [...CTOPICS])}
            {sel("level", "Level", [...CLEVELS])}
            {sel("lang", "Language", [...CLANGS])}
            {sel("access", "Access", [["free", "Free"], ["paid", "Paid"]])}
          </div>
        </aside>
        <section className="bdmain">
          <div className="bdbar">
            <div className="stack grow" style={{ gap: 2, minWidth: 0 }}>
              <h2 className="bdcount" aria-live="polite">{list.length} course{list.length === 1 ? "" : "s"}{F.q ? ` for “${F.q}”` : ""}</h2>
              {act.length > 0 && (
                <div className="chips" aria-label="Active filters">
                  {act.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed="true" onClick={() => set(k, "")}>{l} ×</button>)}
                  <button type="button" className="linkbtn small" onClick={clear}>Clear all</button>
                </div>
              )}
            </div>
          </div>
          {list.length ? <div className="crgrid">{list.map((c) => <CrCard key={c.id} c={c} />)}</div> : (
            <div className="card bdempty"><span className="sq big"><Ic n="search" s={22} /></span><strong>No courses match.</strong><p className="muted">Try another word, or clear the filters.</p><button type="button" className="btn" onClick={clear}>Clear search and filters</button></div>
          )}
        </section>
      </div>
    </>
  );
}

export function MyLearning({ courses, tabs }: { courses: Course[]; tabs: Tabs }) {
  const x = useCr();
  const router = useRouter();
  const recent = useRecent(courses);
  const [show, setShow] = useState<boolean | null>(null);
  const head = <CrTabs a="mylearning" {...tabs} savedN={[...x.saved].filter((id) => courses.some((c) => c.id === id)).length} />;
  if (!x.member) return <>{head}<CrGate t="Your courses live here" x="Join free to enrol in courses and keep your place on every device." /></>;
  const ids = courses.filter((c) => x.enrols[c.id]).sort((a, b) => (x.enrols[b.id].lastT ?? x.enrols[b.id].t) - (x.enrols[a.id].lastT ?? x.enrols[a.id].t));
  if (!ids.length) return <>{head}<CrGate t="You haven’t started a course yet" x="Pick a short course and enrol. Your progress will show here." /></>;
  const inprog = ids.filter((c) => !complete(c, x.enrols[c.id]));
  const done = ids.filter((c) => complete(c, x.enrols[c.id]));
  const fb: [Course, Lesson][] = [];
  for (const c of ids) for (const l of lessonsOf(c)) {
    const s = l.type === "assignment" ? x.enrols[c.id].subs[l.id] : null;
    if (s?.grade && !s.seen) fb.push([c, l]);
  }
  const hidden = !(show ?? !x.hidden);
  return (
    <>
      {head}
      {recent && (() => {
        const p = progress(recent.c, x.enrols[recent.c.id]);
        const e = x.enrols[recent.c.id];
        return (
          <section className="card crhead2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="crhimg" src={recent.c.cover || undefined} alt="" />
            <div className="stack grow" style={{ gap: 8, minWidth: 0 }}>
              <span className="eyebrow">Continue learning</span>
              <h1 className="crh1s">{recent.c.title}</h1>
              <span className="small">{recent.l ? <>Next: <b>{recent.l.title}</b> · {CTYPES[recent.l.type][0]} · {recent.l.mins} min</> : null}</span>
              <span className="crbar big"><i style={{ width: `${p.pct}%` }} /></span>
              <span className="small muted">{p.done} of {p.total} lessons complete{e.lastT ? ` · Last opened ${ago(e.lastT)}` : ""}</span>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <GoBtn c={recent.c}><Ic n="play" s={15} />Continue learning</GoBtn>
                <Link className="btn ghost" href={courseHref(recent.c)}>Course page</Link>
              </div>
            </div>
          </section>
        );
      })()}
      {fb.length > 0 && (
        <div className="card crnote">
          {fb.map(([c, l]) => {
            const s = x.enrols[c.id].subs[l.id];
            return (
              <div className="row" style={{ flexWrap: "wrap" }} key={l.id}>
                <Ic n="asg" s={18} />
                <span className="grow"><b>Feedback ready:</b> {l.title} in {c.title} · {s.grade!.marks}/{l.asg?.marks}</span>
                <Link className="btn sm ghost" href={learnHref(c, l)}>See feedback</Link>
              </div>
            );
          })}
        </div>
      )}
      <h2 className="crsec">In progress <span className="muted">{inprog.length}</span></h2>
      {inprog.length ? <div className="crgrid">{inprog.map((c) => <CrCard key={c.id} c={c} />)}</div> : <p className="muted">Nothing in progress.</p>}
      {done.length > 0 && <><h2 className="crsec">Completed <span className="muted">{done.length}</span></h2><div className="crgrid">{done.map((c) => <CrCard key={c.id} c={c} />)}</div></>}
      <div className="card crpriv">
        <h2 style={{ fontSize: 15 }}>Privacy</h2>
        <button type="button" className="sw" role="switch" aria-checked={!hidden} onClick={() => {
          const next = hidden;
          setShow(next);
          void x.run(async () => {
            const r = await setClassmates(next);
            if (r?.error) { setShow(!next); return x.toast(r.error); }
            x.toast(next ? "Classmates can see you" : "You’re hidden from classmates");
            router.refresh();
          });
        }}><i aria-hidden="true" /><span>Show me as a classmate</span></button>
        <span className="small muted">Other learners in your courses can see your name and photo. Your progress, grades and submissions are only seen by you and the course team.</span>
      </div>
    </>
  );
}

export function Saved({ courses, tabs }: { courses: Course[]; tabs: Tabs }) {
  const x = useCr();
  const l = courses.filter((c) => x.saved.has(c.id));
  return (
    <>
      <CrTabs a="savedcourses" {...tabs} savedN={l.length} />
      {!x.member ? <CrGate t="Save courses for later" x="Join free to save courses. They stay saved on your phone and your computer." />
        : l.length ? <><p className="muted small" style={{ margin: "0 0 12px" }}>Saved to your account, so they show on every device you sign in on.</p><div className="crgrid">{l.map((c) => <CrCard key={c.id} c={c} />)}</div></>
          : <CrGate t="No saved courses yet" x="Tap the bookmark on any course to save it for later." />}
    </>
  );
}

export { CrMain };
