"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { CLANGS, CLEVELS, CTOPICS, CTYPES, CTZS, publishCheck, size, type Course, type EdLesson, type LessonType, type Person } from "@/lib/courses-shared";
import {
  addInstructor, addLessonFile, askPublish, editLesson, editSection, publishCourse, removeInstructor, removeLessonFile,
  saveCourseField, saveLessonField, saveQuestions,
} from "@/app/(hub)/course-actions";
import { uploadCover, uploadPrivate } from "@/lib/course-upload";
import { Av, StatusTag, useCr } from "@/components/courses/ui";

const TABS: [string, string][] = [["details", "Details"], ["content", "Content"], ["access", "Access and rules"], ["team", "Instructors"], ["publish", "Publish"]];
type Sec = { id: string; title: string; lessons: EdLesson[] };
export type EdCourse = Course & { sectionsEd: Sec[]; groupId: string; enrolled: number };

/** Saves each change shortly after typing stops; shows "Saved just now" like the hand-off. */
function useAutosave() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const jobs = useRef(new Map<string, () => Promise<{ error?: string }>>());
  const [saved, setSaved] = useState("All changes saved");
  const x = useCr();
  const fire = useCallback(async (k: string) => {
    const j = jobs.current.get(k);
    jobs.current.delete(k);
    timers.current.delete(k);
    if (!j) return;
    const r = await j();
    if (r?.error) x.toast(r.error);
    else setSaved("Saved just now");
  }, [x]);
  const queue = useCallback((k: string, job: () => Promise<{ error?: string }>, wait = 600) => {
    jobs.current.set(k, job);
    clearTimeout(timers.current.get(k));
    timers.current.set(k, setTimeout(() => void fire(k), wait));
  }, [fire]);
  const flush = useCallback(async () => {
    const ks = [...jobs.current.keys()];
    for (const k of ks) { clearTimeout(timers.current.get(k)); await fire(k); }
  }, [fire]);
  useEffect(() => () => { void flush(); }, [flush]);
  return { saved, setSaved, queue, flush };
}

export function Editor({ course, groups, members, initialTab }: { course: EdCourse | null; groups: { id: string; name: string }[]; members: Person[]; initialTab?: string }) {
  const x = useCr();
  const router = useRouter();
  const [tab, setTab] = useState(TABS.some((t) => t[0] === initialTab) ? initialTab! : "details");
  const [c, setC] = useState<EdCourse | null>(course);
  const [openL, setOpenL] = useState<string | null>(null);
  const auto = useAutosave();
  useEffect(() => setC(course), [course]);
  if (!c) {
    return <div className="card crempty" style={{ maxWidth: 560, margin: "40px auto" }}><span className="sq big"><Ic n="cap" s={22} /></span><strong>This course isn’t available</strong><p className="muted">It may be a draft or it may have been removed.</p><Link className="btn" href="/courses">Browse courses</Link></div>;
  }
  if (!x.member || !c.canEdit) {
    return <div className="card crempty" style={{ maxWidth: 560, margin: "40px auto" }}><span className="sq big"><Ic n="lock" s={22} /></span><strong>Only this course’s instructors and the Hub team can edit it</strong><Link className="btn" href="/courses">Browse courses</Link></div>;
  }
  const lessons = c.sectionsEd.flatMap((s) => s.lessons);
  const ck = publishCheck({ ...c, instructors: c.instructors }, lessons);
  const ok = ck.every((i) => i[0] || i[2]);

  const setField = (k: string, v: string) => {
    const next = { ...c } as EdCourse & Record<string, unknown>;
    if (k === "desc") next.desc = v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    else if (["suits", "outcomes", "prereq", "materials"].includes(k)) next[k] = v.split("\n").map((s) => s.trim()).filter(Boolean);
    else if (k === "price") next.price = Math.max(0, Math.round(+v || 0));
    else if (k === "lang") next.lang = v;
    else if (k === "group") next.groupId = v;
    else next[k] = v;
    setC(next);
    auto.queue(`c.${k}`, async () => {
      const r = await saveCourseField(c.id, k, v);
      if (r?.slug && r.slug !== c.slug) setC((cur) => (cur ? { ...cur, slug: r.slug! } : cur));
      return r;
    }, k === "access" || k === "order" || k === "asg" || k === "topic" || k === "level" || k === "lang" || k === "group" ? 0 : 600);
  };
  const editL = (lid: string, patch: Partial<EdLesson>) => setC({ ...c, sectionsEd: c.sectionsEd.map((s) => ({ ...s, lessons: s.lessons.map((l) => (l.id === lid ? { ...l, ...patch } : l)) })) });
  const saveL = (lid: string, field: string, v: string, wait = 600) => auto.queue(`l.${lid}.${field}`, () => saveLessonField(lid, field, v), wait);
  const structural = async (f: () => Promise<{ error?: string; id?: string }>, after?: (id?: string) => void) => {
    await auto.flush();
    const r = await x.run(f);
    if (r?.error) return x.toast(r.error);
    auto.setSaved("Saved just now");
    after?.(r?.id);
    router.refresh();
  };

  const fld = (key: string, lab: string, val: string | number, o: { rows?: number; hint?: string; type?: string; max?: number } = {}) => (
    <label className="small" htmlFor={`ce-${key}`}>{lab}{o.hint && <> <span className="muted">{o.hint}</span></>}
      {o.rows ? <textarea className="field" id={`ce-${key}`} rows={o.rows} defaultValue={String(val)} onChange={(e) => setField(key, e.target.value)} />
        : <input className="field" id={`ce-${key}`} type={o.type} defaultValue={String(val)} maxLength={o.max} onChange={(e) => setField(key, e.target.value)} />}
    </label>
  );
  const sel = (key: string, lab: string, val: string, opts: (string | [string, string])[]) => (
    <label className="small" htmlFor={`ce-${key}`}>{lab}
      <select className="field" id={`ce-${key}`} value={val} onChange={(e) => setField(key, e.target.value)}>
        {opts.map((o) => { const v = Array.isArray(o) ? o[0] : o; const t = Array.isArray(o) ? o[1] : o; return <option key={v} value={v}>{t}</option>; })}
      </select>
    </label>
  );
  const choice = (k: "access" | "order" | "asg", cur: string, label: string, opts: [string, string, string][]) => (
    <div className="cechoice" role="radiogroup" aria-label={label}>
      {opts.map(([v, b, d]) => <button key={v} type="button" role="radio" aria-checked={cur === v} className="cech" onClick={() => {
        if (k === "access") setC({ ...c, access: v as "free" | "paid", price: v === "paid" && !c.price ? 29 : c.price });
        else setC({ ...c, rules: { ...c.rules, [k]: v } });
        auto.queue(`c.${k}`, () => saveCourseField(c.id, k, v), 0);
      }}><b>{b}</b><span className="small muted">{d}</span></button>)}
    </div>
  );

  return (
    <>
      <div className="crehead">
        <Link className="small crback" href={x.staff ? "/courses/manage" : "/courses/teaching"}><Ic n="left" s={14} />{x.staff ? "Manage courses" : "Teaching"}</Link>
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <div className="stack grow" style={{ gap: 2, minWidth: 0 }}>
            <h1 className="crh1s">{c.title || "Untitled course"}</h1>
            <span className="small"><StatusTag c={c} /> <span className="muted" id="cesaved">{auto.saved}</span></span>
          </div>
          <button type="button" className="btn sm ghost" onClick={async () => { await auto.flush(); x.startPreview(c); }}><Ic n="eye" s={14} />Preview as a learner</button>
          <Link className="btn sm ghost" href={`/courses/${c.slug}`}>Course page</Link>
        </div>
        <nav className="crtabs cetabs" role="tablist" aria-label="Course editor">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
        </nav>
      </div>
      {c.status === "published" && <p className="small crlive"><Ic n="info" s={14} />This course is published. Changes go live for learners as soon as you make them.</p>}
      <div className="card cebody">
        {tab === "details" && (
          <>
            <div className="ceg2">
              {fld("title", "Course title", c.title, { max: 80 })}
              {sel("topic", "Topic", c.topic, [...CTOPICS])}
              {sel("level", "Level", c.level, [...CLEVELS])}
              {sel("lang", "Language", c.lang, [...CLANGS])}
            </div>
            {fld("summary", "Short summary", c.summary, { rows: 2, hint: "Shown on course cards. One or two sentences." })}
            {fld("desc", "About this course", c.desc.join("\n\n"), { rows: 5, hint: "Leave a blank line between paragraphs." })}
            <div className="ceg2">
              {fld("suits", "Who it’s for", c.suits.join("\n"), { rows: 3, hint: "One per line" })}
              {fld("outcomes", "What learners will be able to do", c.outcomes.join("\n"), { rows: 3, hint: "One per line" })}
              {fld("prereq", "Before you start", c.prereq.join("\n"), { rows: 2, hint: "One per line" })}
              {fld("materials", "What learners need", c.materials.join("\n"), { rows: 2, hint: "One per line" })}
            </div>
            <div className="ceg2">
              <div className="stack" style={{ gap: 8 }}>
                <span className="small"><b>Cover image</b> <span className="muted">1280 × 640 pixels, JPG or PNG</span></span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="cecov" src={c.cover || undefined} alt="" />
                <input type="file" id="cecover" className="sr" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void x.run(async () => {
                    try {
                      const u = await uploadCover(f);
                      setC({ ...c, cover: u });
                      const r = await saveCourseField(c.id, "cover", u);
                      if (r?.error) return x.toast(r.error);
                      auto.setSaved("Saved just now");
                      router.refresh();
                    } catch (er) { x.toast((er as Error).message); }
                  });
                }} />
                <label htmlFor="cecover" className="btn sm ghost" style={{ alignSelf: "flex-start" }}><Ic n="upl" s={14} />Upload cover</label>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <span className="small"><b>Preview video</b> <span className="muted">Optional. 1 to 2 minutes, MP4. Everyone can watch it.</span></span>
                {c.pvideo ? <video className="cecov" controls preload="metadata" src={`/api/course-media?c=${c.id}&k=pvideo`} poster={c.pposter || undefined} /> : <span className="small muted">No preview video yet.</span>}
                <input type="file" id="cepvideo" className="sr" accept="video/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void x.run(async () => {
                    try {
                      const p = await uploadPrivate(`${c.id}/preview`, f);
                      const r = await saveCourseField(c.id, "pvideo", p);
                      if (r?.error) return x.toast(r.error);
                      setC({ ...c, pvideo: true, pvtt: false, pposter: "" });
                      x.toast("Preview video added");
                      router.refresh();
                    } catch (er) { x.toast((er as Error).message); }
                  });
                }} />
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <label htmlFor="cepvideo" className="btn sm ghost"><Ic n="upl" s={14} />{c.pvideo ? "Replace video" : "Upload video"}</label>
                  {c.pvideo && <button type="button" className="btn sm ghost" onClick={() => void structural(() => saveCourseField(c.id, "pvideo", ""), () => setC({ ...c, pvideo: false, pvtt: false, pposter: "" }))}>Remove</button>}
                </div>
              </div>
            </div>
            <p className="small muted">Course link: smehub.ca/courses/{c.slug}</p>
          </>
        )}
        {tab === "content" && (
          <>
            <p className="small muted">Sections group your lessons. Use the arrows to change the order.</p>
            {c.sectionsEd.map((s, si) => (
              <div className="cesec" key={s.id}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <label className="sr" htmlFor={`ces-${s.id}`}>Section title</label>
                  <input className="field grow cesecin" id={`ces-${s.id}`} defaultValue={s.title} onChange={(e) => {
                    const v = e.target.value;
                    setC({ ...c, sectionsEd: c.sectionsEd.map((z) => (z.id === s.id ? { ...z, title: v } : z)) });
                    auto.queue(`s.${s.id}`, () => editSection(c.id, "title", s.id, v));
                  }} />
                  <button type="button" className="iconbtn" aria-label="Move section up" disabled={!si} onClick={() => void structural(() => editSection(c.id, "move", s.id, "-1"))}><Ic n="up" s={15} /></button>
                  <button type="button" className="iconbtn" aria-label="Move section down" disabled={si >= c.sectionsEd.length - 1} onClick={() => void structural(() => editSection(c.id, "move", s.id, "1"))}><Ic n="down" s={15} /></button>
                  <button type="button" className="iconbtn" aria-label={`Delete section ${s.title}`} onClick={() => void structural(() => editSection(c.id, "remove", s.id))}><Ic n="trash" s={15} /></button>
                </div>
                <ol className="cels">
                  {s.lessons.map((l, li) => {
                    const op = openL === l.id;
                    const t = CTYPES[l.type];
                    return (
                      <li key={l.id} className={op ? "open" : ""}>
                        <div className="celrow">
                          <span className="crli"><Ic n={t[1]} s={15} /></span>
                          <button type="button" className="celbtn grow" aria-expanded={op} onClick={() => setOpenL(op ? null : l.id)}>
                            <span className="crlt">{l.title || "Untitled lesson"}</span>
                            <span className="small muted">{t[0]} · {l.mins} min{l.free ? " · Free preview" : ""}{l.drip ? ` · Opens ${l.drip} days after enrolment` : ""}</span>
                          </button>
                          <button type="button" className="iconbtn" aria-label="Move lesson up" disabled={!si && !li} onClick={() => void structural(() => editLesson(c.id, "move", l.id, -1))}><Ic n="up" s={15} /></button>
                          <button type="button" className="iconbtn" aria-label="Move lesson down" disabled={!(si < c.sectionsEd.length - 1 || li < s.lessons.length - 1)} onClick={() => void structural(() => editLesson(c.id, "move", l.id, 1))}><Ic n="down" s={15} /></button>
                        </div>
                        {op && <LessonEd c={c} l={l} editL={editL} saveL={saveL} structural={structural} close={() => setOpenL(null)} auto={auto} />}
                      </li>
                    );
                  })}
                </ol>
                <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                  <span className="small muted">Add a lesson:</span>
                  {(Object.keys(CTYPES) as LessonType[]).map((k) => (
                    <button key={k} type="button" className="btn sm ghost" onClick={() => void structural(() => editLesson(c.id, "add", `${s.id}|${k}`), (nid) => {
                      if (nid) setOpenL(nid);
                      setTimeout(() => document.getElementById("cel-title")?.focus(), 400);
                    })}><Ic n={CTYPES[k][1]} s={14} />{CTYPES[k][0]}</button>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => void structural(() => editSection(c.id, "add"))}><Ic n="plus" s={15} />Add a section</button>
          </>
        )}
        {tab === "access" && (
          <>
            <h2 style={{ fontSize: 16 }}>Access</h2>
            {choice("access", c.access, "Access", [["free", "Free for members", "Any signed-in member can enrol."], ["paid", "Paid", "Members buy the course once and keep it. Payments go through Stripe."]])}
            {c.access === "paid" && <div className="ceg2">{fld("price", "Price in Canadian dollars", c.price || "", { type: "number", hint: "Before HST" })}</div>}
            <h2 style={{ fontSize: 16 }}>Lesson order</h2>
            {choice("order", c.rules.order, "Lesson order", [["seq", "In order", "Each lesson unlocks when the one before it is complete. Best for step-by-step courses."], ["any", "Any order", "Learners can open any lesson they have access to."]])}
            <h2 style={{ fontSize: 16 }}>When an assignment counts as complete</h2>
            {choice("asg", c.rules.asg, "Assignment completion", [["submit", "When it’s submitted", "Learners can keep going while they wait for your feedback."], ["pass", "When it passes", "Learners need the pass mark before the lesson counts as done."]])}
            <p className="small muted">A course is complete when every lesson is complete: videos and readings when marked complete or watched to the end, quizzes when passed, and assignments as set above.</p>
            <h2 style={{ fontSize: 16 }}>Course discussion</h2>
            {sel("group", "Group where learners discuss this course", c.groupId, [["", "No discussion group"], ...groups.map((g) => [g.id, g.name] as [string, string])])}
          </>
        )}
        {tab === "team" && (
          <>
            <h2 style={{ fontSize: 16 }}>Instructors</h2>
            <p className="small muted">Instructors can edit this course, see learner progress and grade assignments. They show on the course page with their profile.</p>
            {c.instructors.length ? c.instructors.map((m) => (
              <div className="crgr" key={m.id}>
                <Av p={m} size="s" />
                <span className="grow stack" style={{ gap: 0 }}><b className="small">{m.name}</b><span className="small muted">{m.role}</span></span>
                {x.staff && <button type="button" className="btn sm ghost" onClick={() => void structural(() => removeInstructor(c.id, m.id))}>Remove</button>}
              </div>
            )) : <p className="small muted">No instructors yet.</p>}
            {x.staff ? (
              <label className="small" htmlFor="ceinst">Add an instructor
                <select className="field" id="ceinst" value="" onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const m = members.find((p) => p.id === v);
                  void structural(() => addInstructor(c.id, v), () => x.toast(`${m?.name ?? "They"} is now an instructor`));
                }}>
                  <option value="">Choose a member</option>
                  {members.filter((m) => !c.instructors.some((i) => i.id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
                </select>
              </label>
            ) : <p className="small muted">Only the Hub team can add or remove instructors.</p>}
          </>
        )}
        {tab === "publish" && (
          <>
            <h2 style={{ fontSize: 16 }}>Ready to publish?</h2>
            <ul className="cecheck">
              {ck.map(([pass, label, opt]) => <li key={label} className={pass ? "ok" : opt ? "opt" : "no"}><Ic n={pass ? "check" : opt ? "info" : "x"} s={14} />{label}</li>)}
            </ul>
            {c.status === "published" ? (
              <>
                <p className="small">This course is published. Members can find it in Courses.</p>
                {x.staff && <><button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => x.open({ type: "unpub", c, enrolled: c.enrolled })}>Unpublish</button><p className="small muted">Unpublishing hides it from the catalogue. Enrolled learners keep their access and progress.</p></>}
              </>
            ) : x.staff ? (
              <>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <button type="button" className="btn" aria-disabled={!ok} onClick={() => {
                    if (!ok) return x.toast("Fix the items marked with a cross first");
                    void structural(async () => { const r = await publishCourse(c.id); if (!r?.error) x.toast("Published. Members can now find it in Courses."); return r; });
                  }}>Publish course</button>
                  <button type="button" className="btn ghost" onClick={async () => { await auto.flush(); x.startPreview(c); }}>Preview as a learner first</button>
                </div>
                {!ok && <p className="small muted">Fix the items marked with a cross first.</p>}
                <hr className="cehr" />
                <button type="button" className="btn sm ghost cedanger" style={{ alignSelf: "flex-start" }} onClick={() => x.open({ type: "del", c })}><Ic n="trash" s={14} />Delete this draft</button>
              </>
            ) : (
              <>
                <p className="small">When you’re happy with it, ask the Hub team to publish it.</p>
                <button type="button" className="btn" style={{ alignSelf: "flex-start" }} aria-disabled={!ok} onClick={() => {
                  if (!ok) return x.toast("Fix the items marked with a cross first");
                  void structural(async () => { const r = await askPublish(c.id); if (!r?.error) x.toast("Sent to the Hub team"); return r; });
                }}>Ask the Hub team to publish</button>
                {c.askPub && <p className="small muted">Sent {agoShort(c.askPub)}. The team will publish it or reply with changes.</p>}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
const agoShort = (t: number) => {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};

function LessonEd({ c, l, editL, saveL, structural, close, auto }: {
  c: EdCourse; l: EdLesson; editL: (id: string, p: Partial<EdLesson>) => void; saveL: (id: string, f: string, v: string, wait?: number) => void;
  structural: (f: () => Promise<{ error?: string; id?: string }>, after?: (id?: string) => void) => Promise<void>; close: () => void; auto: ReturnType<typeof useAutosave>;
}) {
  const x = useCr();
  const router = useRouter();
  const f = (key: string, lab: string, val: string | number, o: { rows?: number; hint?: string; type?: string } = {}, on?: (v: string) => void) => (
    <label className="small" htmlFor={`cel-${key}`}>{lab}{o.hint && <> <span className="muted">{o.hint}</span></>}
      {o.rows ? <textarea className="field" id={`cel-${key}`} rows={o.rows} defaultValue={String(val)} onChange={(e) => on?.(e.target.value)} />
        : <input className="field" id={`cel-${key}`} type={o.type} min={o.type === "number" ? 0 : undefined} defaultValue={String(val)} onChange={(e) => on?.(e.target.value)} />}
    </label>
  );
  const A = l.asg;
  const Q = l.quiz;
  const setQs = (qs: EdLesson["qs"]) => {
    editL(l.id, { qs });
    auto.queue(`q.${l.id}`, () => saveQuestions(l.id, qs));
  };
  const upload = (kind: "video" | "vtt" | "file", file: File) => void x.run(async () => {
    try {
      const p = await uploadPrivate(`${c.id}/${l.id}/${kind === "file" ? "f" : "v"}`, file);
      if (kind === "file") {
        const r = await addLessonFile(l.id, file.name, p, file.size);
        if (r?.error) return x.toast(r.error);
        editL(l.id, { res: [...l.res, { id: r.id!, name: file.name, size: file.size }] });
        x.toast("File added");
      } else {
        const r = await saveLessonField(l.id, kind, p);
        if (r?.error) return x.toast(r.error);
        editL(l.id, kind === "video" ? { video: p, poster: "" } : { vtt: p });
        x.toast(kind === "video" ? "Video added" : "Captions added");
      }
      auto.setSaved("Saved just now");
      router.refresh();
    } catch (er) { x.toast((er as Error).message); }
  });
  return (
    <div className="celed">
      <div className="ceg3">
        {f("title", "Lesson title", l.title, {}, (v) => { editL(l.id, { title: v }); saveL(l.id, "title", v); })}
        <label className="small" htmlFor="cel-type">Type
          <select className="field" id="cel-type" value={l.type} onChange={(e) => void structural(() => saveLessonField(l.id, "type", e.target.value))}>
            {(Object.keys(CTYPES) as LessonType[]).map((t) => <option key={t} value={t}>{CTYPES[t][0]}</option>)}
          </select>
        </label>
        {f("mins", "Minutes", l.mins, { type: "number" }, (v) => { editL(l.id, { mins: Math.max(0, parseInt(v, 10) || 0) }); saveL(l.id, "mins", v); })}
      </div>
      <div className="row" style={{ flexWrap: "wrap", gap: 16 }}>
        <button type="button" className="sw" role="switch" aria-checked={l.free} onClick={() => { editL(l.id, { free: !l.free }); saveL(l.id, "free", l.free ? "0" : "1", 0); }}><i aria-hidden="true" /><span>Free preview (anyone can open it)</span></button>
        <label className="small row" style={{ gap: 8 }}>Opens<input className="field" style={{ width: 76 }} type="number" min={0} id="cel-drip" defaultValue={l.drip || 0} onChange={(e) => { editL(l.id, { drip: Math.max(0, parseInt(e.target.value, 10) || 0) }); saveL(l.id, "drip", e.target.value); }} />days after enrolment</label>
      </div>
      {l.type === "video" && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="small"><b>Video</b> <span className="muted">MP4, up to 2 GB. Add captions so everyone can follow.</span></span>
          {l.video ? <video className="cecov" controls preload="metadata" src={`/api/course-media?l=${l.id}&k=video`} poster={l.poster || undefined} /> : <span className="small muted">No video yet.</span>}
          <div className="row" style={{ flexWrap: "wrap" }}>
            <input type="file" id="celvid" className="sr" accept="video/*" onChange={(e) => { const fl = e.target.files?.[0]; e.target.value = ""; if (fl) upload("video", fl); }} />
            <label htmlFor="celvid" className="btn sm ghost"><Ic n="upl" s={14} />{l.video ? "Replace video" : "Upload video"}</label>
            <input type="file" id="celvtt" className="sr" accept=".vtt,text/vtt" onChange={(e) => { const fl = e.target.files?.[0]; e.target.value = ""; if (fl) upload("vtt", fl); }} />
            <label htmlFor="celvtt" className="btn sm ghost"><Ic n="cc" s={14} />{l.vtt ? "Replace captions" : "Add captions (.vtt)"}</label>
            {l.vtt && <span className="crst done"><Ic n="check" s={12} />Captions added</span>}
          </div>
        </div>
      )}
      {(l.type === "video" || l.type === "text") && f("body", l.type === "text" ? "Lesson text" : "Notes under the video", l.body.join("\n\n"), { rows: l.type === "text" ? 7 : 3, hint: "Blank line between paragraphs" }, (v) => { editL(l.id, { body: v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) }); saveL(l.id, "body", v); })}
      {l.type === "assignment" && A && (
        <>
          {f("a.brief", "The brief", A.brief, { rows: 4 }, (v) => { editL(l.id, { asg: { ...A, brief: v } }); saveL(l.id, "a.brief", v); })}
          <div className="ceg3">
            {f("a.dueDays", "Due, days after enrolment", A.dueDays, { type: "number" }, (v) => { editL(l.id, { asg: { ...A, dueDays: parseInt(v, 10) || 0 } }); saveL(l.id, "a.dueDays", v); })}
            {f("a.time", "Due time", A.time, { type: "time" }, (v) => { editL(l.id, { asg: { ...A, time: v } }); saveL(l.id, "a.time", v); })}
            <label className="small" htmlFor="cel-a.tz">Time zone
              <select className="field" id="cel-a.tz" value={A.tz} onChange={(e) => { editL(l.id, { asg: { ...A, tz: e.target.value } }); saveL(l.id, "a.tz", e.target.value, 0); }}>
                {CTZS.map(([z, n]) => <option key={z} value={z}>{n}</option>)}
              </select>
            </label>
            {f("a.marks", "Total marks", A.marks, { type: "number" }, (v) => { editL(l.id, { asg: { ...A, marks: parseInt(v, 10) || 0 } }); saveL(l.id, "a.marks", v); })}
            {f("a.pass", "Pass mark", A.pass, { type: "number" }, (v) => { editL(l.id, { asg: { ...A, pass: parseInt(v, 10) || 0 } }); saveL(l.id, "a.pass", v); })}
            <label className="small" htmlFor="cel-a.sub">Learners submit
              <select className="field" id="cel-a.sub" value={A.sub} onChange={(e) => { editL(l.id, { asg: { ...A, sub: e.target.value as typeof A.sub } }); saveL(l.id, "a.sub", e.target.value, 0); }}>
                {[["both", "A file or text"], ["file", "A file"], ["text", "Text"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </label>
          </div>
          {f("a.rubric", "How it’s marked", A.rubric.join("\n"), { rows: 3, hint: "One line per criterion" }, (v) => { editL(l.id, { asg: { ...A, rubric: v.split("\n").map((s) => s.trim()).filter(Boolean) } }); saveL(l.id, "a.rubric", v); })}
        </>
      )}
      {l.type === "quiz" && Q && (
        <>
          <div className="ceg3">
            {f("q.pass", "Pass mark (%)", Q.pass, { type: "number" }, (v) => { editL(l.id, { quiz: { ...Q, pass: parseInt(v, 10) || 0 } }); saveL(l.id, "q.pass", v); })}
            {f("q.limit", "Time limit in minutes", Q.limit, { type: "number", hint: "0 = no limit" }, (v) => { editL(l.id, { quiz: { ...Q, limit: parseInt(v, 10) || 0 } }); saveL(l.id, "q.limit", v); })}
            {f("q.attempts", "Attempts allowed", Q.attempts, { type: "number" }, (v) => { editL(l.id, { quiz: { ...Q, attempts: parseInt(v, 10) || 0 } }); saveL(l.id, "q.attempts", v); })}
          </div>
          {l.qs.map((q, i) => (
            <fieldset className="ceqq" key={i}>
              <legend className="small"><b>Question {i + 1}</b></legend>
              <label className="sr" htmlFor={`ceq${i}`}>Question {i + 1}</label>
              <input className="field" id={`ceq${i}`} value={q.q} onChange={(e) => setQs(l.qs.map((z, k) => (k === i ? { ...z, q: e.target.value } : z)))} />
              <div className="ceopts">
                {q.o.map((o, j) => (
                  <div className="row" style={{ gap: 8 }} key={j}>
                    <input type="radio" name={`ceqa${i}`} aria-label={`Correct answer: option ${j + 1}`} checked={q.a === j} onChange={() => setQs(l.qs.map((z, k) => (k === i ? { ...z, a: j } : z)))} />
                    <label className="sr" htmlFor={`ceq${i}o${j}`}>Option {j + 1}</label>
                    <input className="field grow" id={`ceq${i}o${j}`} value={o} onChange={(e) => setQs(l.qs.map((z, k) => (k === i ? { ...z, o: z.o.map((y, m) => (m === j ? e.target.value : y)) } : z)))} />
                  </div>
                ))}
              </div>
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                <span className="small muted">Select the circle next to the correct answer.</span>
                <button type="button" className="btn sm ghost" onClick={() => (l.qs.length < 2 ? x.toast("A quiz needs at least one question") : setQs(l.qs.filter((_, k) => k !== i)))}><Ic n="trash" s={13} />Remove question</button>
              </div>
            </fieldset>
          ))}
          <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={() => setQs([...l.qs, { q: "", o: ["", "", "", ""], a: 0 }])}><Ic n="plus" s={14} />Add a question</button>
        </>
      )}
      {l.type !== "quiz" && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="small"><b>Downloads</b> <span className="muted">Worksheets and templates. Only enrolled learners can download them.</span></span>
          {l.res.map((r) => (
            <div className="crres" key={r.id}><Ic n="doc" s={16} /><span className="grow small"><b>{r.name}</b> · {size(r.size)}</span>
              <button type="button" className="btn sm ghost" onClick={() => void structural(() => removeLessonFile(r.id), () => editL(l.id, { res: l.res.filter((z) => z.id !== r.id) }))}>Remove</button></div>
          ))}
          <input type="file" id="celres" className="sr" onChange={(e) => { const fl = e.target.files?.[0]; e.target.value = ""; if (fl) upload("file", fl); }} />
          <label htmlFor="celres" className="btn sm ghost" style={{ alignSelf: "flex-start" }}><Ic n="upl" s={14} />Add a file</label>
        </div>
      )}
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <button type="button" className="btn sm ghost cedanger" onClick={() => void structural(() => editLesson(c.id, "remove", l.id), () => { close(); x.toast("Lesson deleted"); })}><Ic n="trash" s={14} />Delete lesson</button>
        <button type="button" className="btn sm" onClick={close}>Done</button>
      </div>
    </div>
  );
}
