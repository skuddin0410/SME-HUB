"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";
import {
  CTYPES, MAX_SUBMISSION, access, clock, complete, courseHref, dueAt, dueText, fmtD, learnHref, lessonById, lessonDone, lessonsOf,
  nextAfter, progress, size, type Course, type Enrol, type Lesson, type Sub,
} from "@/lib/courses-shared";
import { feedbackSeen, markDone, openLesson, quizAnswer, quizStart, quizSubmit, quizView, saveVideoPos, submitAssignment, type QuizView } from "@/app/(hub)/course-actions";
import { myId, uploadPrivate } from "@/lib/course-upload";
import { CrBanner, CrMain, CrOutline, NotFound, useCr, type Preview } from "@/components/courses/ui";

export type Content = { body: string[]; video: boolean; vtt: boolean; poster: string };
export type StaffQ = { q: string; o: string[]; a: number };

export function LessonPage({ c, lessonId, content, staffQs }: { c: Course | null; lessonId: string; content: Content | null; staffQs: StaffQ[] | null }) {
  const x = useCr();
  const router = useRouter();
  const [out, setOut] = useState(false);
  const l = c ? lessonById(c, lessonId) : null;
  const e = c ? x.enrolOf(c) : null;
  const inPrev = !!c && x.preview?.id === c.id;
  const staff = !!c && x.isStaff(c);
  const av = c && l ? access(c, l, e, staff) : null;
  // remember the last lesson opened, so Continue learning comes back here
  useEffect(() => {
    if (!c || !l || !av?.ok || !e) return;
    if (inPrev) x.setPreview({ ...x.preview!, last: l.id });
    else void openLesson(l.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);
  useEffect(() => setOut(false), [lessonId]);
  if (!c || !l || !av) return <NotFound />;
  const a = lessonsOf(c);
  const ix = a.indexOf(l);
  const prev = a[ix - 1];
  const next = a[ix + 1];
  const p = progress(c, e);
  const done = lessonDone(c, l, e);
  const nav = next ? access(c, next, e, staff) : null;

  /** Updates the preview copy (nothing saved) or asks the server, then moves on. */
  const afterDone = (e2: Enrol, completedNow: boolean) => {
    if (completedNow && !inPrev) x.toast("Course complete. Well done!");
    const n = nextAfter(c, l, e2, staff);
    if (n) {
      x.toast("Lesson complete");
      router.push(learnHref(c, n));
    } else if (!complete(c, e2)) x.toast("Lesson complete");
    router.refresh();
  };
  const markComplete = async (fromVideo?: boolean) => {
    if (!e) return;
    const e2: Enrol = { ...e, done: { ...e.done, [l.id]: Date.now() } };
    if (inPrev) {
      x.setPreview({ ...x.preview!, done: e2.done });
      if (fromVideo) { x.toast("Lesson complete. The next lesson is ready."); return; }
      return afterDone(e2, false);
    }
    const r = await x.run(() => markDone(l.id));
    if (r?.error) return x.toast(r.error);
    if (fromVideo) {
      x.toast(r?.completed ? "Course complete. Well done!" : "Lesson complete. The next lesson is ready.");
      router.refresh();
      return;
    }
    afterDone(e2, !!r?.completed);
  };

  const outline = <CrOutline c={c} cur={l.id} />;
  return (
    <>
      <CrBanner c={c} />
      <div className="crlearn">
        <div className="crltop">
          <Link className="small crback" href={courseHref(c)}><Ic n="left" s={14} /><span className="crltt">{c.title}</span></Link>
          <span className="grow" />
          {e && <><span className="small muted crlp">{p.done} of {p.total} complete</span><span className="crbar sm"><i style={{ width: `${p.pct}%` }} /></span></>}
          <button type="button" className="btn sm ghost croutbtn" aria-expanded={out} onClick={() => setOut(!out)}><Ic n="list" s={15} />Course outline</button>
        </div>
        <div className="crlcols">
          <aside className="card crlside" aria-label="Course outline"><h2 style={{ fontSize: 15 }}>Course outline</h2>{outline}</aside>
          <section className="crlmain">
            <div className="card crlhead">
              <span className="crtopic"><Ic n={CTYPES[l.type][1]} s={13} /> {CTYPES[l.type][0]} · {l.mins} min{av.prev ? " · Free preview" : ""}</span>
              <h1 className="crh1s">{l.title}</h1>
            </div>
            {!av.ok ? <Locked c={c} why={av.why!} at={av.at} need={av.need} /> : (
              <>
                {l.type === "video" && content && <Video c={c} l={l} e={e} content={content} inPrev={inPrev} onEnded={() => !done && void markComplete(true)} />}
                {content && content.body.length > 0 && l.type !== "assignment" && <div className="card crbody">{content.body.map((t, i) => <p key={i}>{t}</p>)}</div>}
                {l.type === "assignment" && <Assignment c={c} l={l} e={e} staff={staff} inPrev={inPrev} />}
                {l.type === "quiz" && <Quiz c={c} l={l} e={e} staff={staff} inPrev={inPrev} staffQs={staffQs} />}
                {l.res.length > 0 && l.type !== "assignment" && <Downloads c={c} l={l} ok={(av.ok && !av.prev) || !!av.staff} />}
              </>
            )}
            <div className="crlnav">
              {prev ? <Link className="btn ghost" href={learnHref(c, prev)}><Ic n="left" s={15} /><span className="crnl">Previous</span></Link> : <span />}
              {av.ok && e && (l.type === "video" || l.type === "text") && !done
                ? <button type="button" className="btn" disabled={x.busy} onClick={() => void markComplete()}><Ic n="check" s={15} />{next ? "Mark complete and continue" : "Mark complete"}</button>
                : done ? <span className="crst done big"><Ic n="check" s={14} />Complete</span> : <span />}
              {next ? (nav!.ok
                ? <Link className="btn ghost" href={learnHref(c, next)}><span className="crnl">Next</span><Ic n="right" s={15} /></Link>
                : <span className="btn ghost" aria-disabled="true" title={nav!.why === "order" ? "Finish this lesson to unlock the next one" : nav!.why === "drip" ? `Opens ${fmtD(nav!.at!)}` : "Enrol to continue"}><Ic n="lock" s={14} /><span className="crnl">Next</span></span>)
                : complete(c, e) && e ? <button type="button" className="btn" onClick={() => (inPrev ? x.toast("Reviews are turned off in learner preview") : x.open({ type: "rev", c }))}>Finish and review</button> : <span />}
            </div>
            {complete(c, e) && e && !inPrev && (
              <div className="card crdonecard"><Ic n="check" s={20} /><div className="stack grow" style={{ gap: 2 }}><b>You completed this course.</b><span className="small muted">Tell other owners what you thought.</span></div>
                <button type="button" className="btn sm" onClick={() => x.open({ type: "rev", c })}>Leave a review</button></div>
            )}
          </section>
        </div>
        {out && (
          <div className="overlay" onClick={() => setOut(false)}>
            <div className="modal crdrawer" role="dialog" aria-modal="true" aria-labelledby="crot" onClick={(ev) => ev.stopPropagation()}>
              <div className="row"><h2 id="crot" className="grow" style={{ fontSize: 17 }}>Course outline</h2><button type="button" className="iconbtn" aria-label="Close outline" onClick={() => setOut(false)}><Ic n="x" s={16} /></button></div>
              <p className="small muted">{e ? `${p.done} of ${p.total} lessons complete` : "Enrol to track your progress"}</p>
              {outline}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Locked({ c, why, at, need }: { c: Course; why: string; at?: number; need?: Lesson }) {
  const text = why === "drip" ? `This lesson opens on ${fmtD(at!)}. The instructor releases it a few days after you enrol so you have time to practise.`
    : why === "order" ? `Finish “${need!.title}” to unlock this lesson.`
      : c.access === "paid" ? "Buy the course to watch this lesson and download its files." : "Enrol for free to open this lesson and download its files.";
  return (
    <div className="card crlock">
      <span className="sq big"><Ic n="lock" s={22} /></span>
      <strong>This lesson is locked</strong>
      <p className="muted">{text}</p>
      <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
        {why === "order" ? <Link className="btn" href={learnHref(c, need!)}>Go to “{need!.title}”</Link> : why === "drip" ? <Link className="btn ghost" href={courseHref(c)}>Back to course</Link> : <CrMain c={c} />}
      </div>
    </div>
  );
}

function Downloads({ c, l, ok }: { c: Course; l: Lesson; ok: boolean }) {
  return (
    <div className="card">
      <h2 style={{ fontSize: 15 }}>Downloads</h2>
      {l.res.map((r) => (
        <div className="crres" key={r.id}>
          <Ic n="doc" s={18} />
          <span className="grow stack" style={{ gap: 0 }}><b className="small">{r.name}</b><span className="small muted">{size(r.size)}</span></span>
          {ok ? <a className="btn sm ghost" href={`/api/course-media?f=${r.id}`} download={r.name}><Ic n="dl" s={14} />Download</a>
            : <span className="btn sm ghost" aria-disabled="true"><Ic n="lock" s={13} />{c.access === "paid" ? "Buy to download" : "Enrol to download"}</span>}
        </div>
      ))}
    </div>
  );
}

// ---------- video: speed, captions, full screen, resume on any device ----------
function Video({ c, l, e, content, inPrev, onEnded }: { c: Course; l: Lesson; e: Enrol | null; content: Content; inPrev: boolean; onEnded: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState("1");
  const [cc, setCc] = useState(true);
  const pos = e?.pos[l.id] ?? 0;
  const done = lessonDone(c, l, e);
  const last = useRef(0);
  const save = useCallback((force?: boolean) => {
    const el = v.current;
    if (!el || !e || inPrev) return;
    const n = Date.now();
    if (!force && n - last.current < 5000) return;
    last.current = n;
    void saveVideoPos(l.id, el.currentTime);
  }, [e, inPrev, l.id]);
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    el.playbackRate = +speed || 1;
    for (let i = 0; i < el.textTracks.length; i++) el.textTracks[i].mode = cc ? "showing" : "hidden";
  }, [speed, cc]);
  useEffect(() => {
    const bye = () => {
      const el = v.current;
      if (el && e && !inPrev && el.currentTime > 0) navigator.sendBeacon?.("/api/course-progress", JSON.stringify({ l: l.id, s: el.currentTime }));
    };
    window.addEventListener("pagehide", bye);
    return () => { bye(); window.removeEventListener("pagehide", bye); };
  }, [e, inPrev, l.id]);
  return (
    <div className="card crvcard">
      <video
        ref={v} id="crvid" key={l.id} controls playsInline preload="metadata" aria-label="Lesson video" controlsList="nodownload" disablePictureInPicture
        poster={content.poster || undefined} className="crvbox"
        onLoadedMetadata={(ev) => {
          const el = ev.currentTarget;
          if (pos > 3 && pos < el.duration - 2 && !done) try { el.currentTime = pos; } catch {}
          el.playbackRate = +speed || 1;
          for (let i = 0; i < el.textTracks.length; i++) el.textTracks[i].mode = cc ? "showing" : "hidden";
        }}
        onTimeUpdate={() => save()}
        onPause={() => save(true)}
        onEnded={() => { if (e && !inPrev) void saveVideoPos(l.id, 0); onEnded(); }}
        onContextMenu={(ev) => ev.preventDefault()}
      >
        <source src={`/api/course-media?l=${l.id}&k=video`} type="video/mp4" />
        {content.vtt && <track kind="captions" srcLang={c.lang === "French" ? "fr" : "en"} label={c.lang === "French" ? "Français" : "English"} src={`/api/course-media?l=${l.id}&k=captions`} default />}
      </video>
      <div className="crvctl">
        <label className="small row" style={{ gap: 6 }}><Ic n="speed" s={15} />Speed
          <select className="field" aria-label="Playback speed" value={speed} onChange={(ev) => setSpeed(ev.target.value)}>
            {["0.75", "1", "1.25", "1.5", "2"].map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
        {content.vtt ? <button type="button" className="btn sm ghost" aria-pressed={cc} onClick={() => setCc(!cc)}><Ic n="cc" s={15} />Captions {cc ? "on" : "off"}</button> : <span className="small muted">No captions for this video</span>}
        <button type="button" className="btn sm ghost" onClick={() => {
          const el = v.current as (HTMLVideoElement & { webkitRequestFullscreen?: () => void; webkitEnterFullscreen?: () => void }) | null;
          if (!el) return;
          const f = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.webkitEnterFullscreen;
          try { const r = f?.call(el) as unknown as Promise<void> | undefined; r?.catch?.(() => {}); } catch {}
        }}><Ic n="expand" s={15} />Full screen</button>
        <span className="grow" />
        {pos > 3 && !done && <span className="small muted" id="crres">Resuming at {clock(pos)}</span>}
      </div>
    </div>
  );
}

// ---------- assignment ----------
function Assignment({ c, l, e, staff, inPrev }: { c: Course; l: Lesson; e: Enrol | null; staff: boolean; inPrev: boolean }) {
  const x = useCr();
  const router = useRouter();
  const A = l.asg!;
  const s: Sub | undefined = e?.subs[l.id];
  const [edit, setEdit] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const due = dueAt(l, e);
  useEffect(() => {
    if (s?.grade && !s.seen && !inPrev) void feedbackSeen(s.id);
  }, [s, inPrev]);
  const facts = (
    <div className="card">
      <h2 style={{ fontSize: 16 }}>The brief</h2>
      <p>{A.brief}</p>
      <div className="crfacts">
        <div><span className="small muted">Deadline</span><b>{dueText(l, e)}</b></div>
        <div><span className="small muted">Marks</span><b>{A.marks} marks</b></div>
        <div><span className="small muted">Passing score</span><b>{A.pass} of {A.marks}</b></div>
        <div><span className="small muted">Submit</span><b>{{ both: "A file or text", file: "A file", text: "Text" }[A.sub]}</b></div>
      </div>
      {A.rubric.length > 0 && <><h3 className="small" style={{ margin: "6px 0 0" }}>How it’s marked</h3><ul className="small">{A.rubric.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
    </div>
  );
  const dl = l.res.length > 0 && <Downloads c={c} l={l} ok={!!e || staff} />;
  if (staff) return <>{facts}{dl}<div className="card"><p className="small muted">Learners submit here. Grade submissions under <Link href="/courses/teaching">Teaching</Link>.</p></div></>;
  if (!e) return <>{facts}{dl}</>;
  const inst = c.instructors[0]?.name ?? "The instructor";
  if (s && !edit) {
    const late = s.late || (!!due && s.t > due);
    const pass = s.grade ? s.grade.marks >= A.pass : false;
    return (
      <>
        {facts}{dl}
        <div className="card crsubd">
          <div className="row" style={{ flexWrap: "wrap" }}><Ic n="check" s={18} /><b className="grow">Submitted {fmtD(s.t, null, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{late ? " · Late" : ""}</b>{!s.grade && <span className="crst">Waiting for feedback</span>}</div>
          {s.file && <div className="crres"><Ic n="doc" s={18} /><span className="grow small"><b>{s.file.name}</b> · {size(s.file.size)}</span></div>}
          {s.text && <blockquote className="crq">{s.text}</blockquote>}
          {s.grade ? (
            <div className={`crgrade ${pass ? "pass" : "fail"}`}><b>{s.grade.marks} / {A.marks} · {pass ? "Passed" : "Not passed yet"}</b><span className="small">Feedback from {c.instructors.find((i) => i.id === s.grade!.by)?.name ?? inst}</span><p style={{ margin: 0 }}>{s.grade.fb}</p></div>
          ) : <p className="small muted">{inst} will review it and send feedback. We’ll let you know.{c.rules.asg === "submit" ? " You can keep going with the next lesson now." : ""}</p>}
          {(!s.grade || !pass) && <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={() => setEdit(true)}>{s.grade ? "Submit a new version" : "Change my submission"}</button>}
        </div>
      </>
    );
  }
  const tx = text ?? s?.text ?? "";
  const submit = () => {
    const t = tx.trim();
    if (A.sub === "file" && !file && !s?.file) return x.toast("Upload your file first");
    if (A.sub === "text" && !t) return x.toast("Write your answer first");
    if (A.sub === "both" && !file && !t && !s?.file) return x.toast("Upload a file or paste your answer first");
    void x.run(async () => {
      if (inPrev) {
        const sub: Sub = { id: "preview", t: Date.now(), text: t, file: file ? { name: file.name, size: file.size } : s?.file ?? null, late: false, grade: null, seen: false };
        x.setPreview({ ...(x.preview as Preview), subs: { ...x.preview!.subs, [l.id]: sub } });
        setEdit(false); setFile(null); setText(null);
        return x.toast("Submitted (preview only, nothing is sent)");
      }
      let path = "";
      if (file) {
        const uid = await myId();
        if (!uid) return x.toast("Sign in again to upload your file.");
        try { path = await uploadPrivate(`submissions/${uid}/${l.id}`, file); } catch (er) { return x.toast((er as Error).message); }
      }
      const r = await submitAssignment(l.id, t, path, file?.name ?? "", file?.size ?? 0);
      if (r?.error) return x.toast(r.error);
      setEdit(false); setFile(null); setText(null);
      x.toast(r.completed ? "Course complete. Well done!" : `Submitted. ${inst} will send feedback.`);
      router.refresh();
    });
  };
  return (
    <>
      {facts}{dl}
      <div className="card">
        <h2 style={{ fontSize: 16 }}>Your submission</h2>
        {A.sub !== "text" && (
          <div className="crdrop">
            <input type="file" id="casgfile" className="sr" accept=".xlsx,.xls,.csv,.pdf,.docx,.numbers" onChange={(ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              if (!f) return;
              if (f.size > MAX_SUBMISSION) return x.toast("That file is over 10 MB. Try a smaller file or paste your numbers instead.");
              setFile(f);
            }} />
            <label htmlFor="casgfile" className="btn ghost sm"><Ic n="upl" s={15} />{file ? "Replace file" : "Upload your worksheet"}</label>
            <span className="small muted">{file ? <><b>{file.name}</b> · {size(file.size)}</> : "Excel, CSV, PDF or Word. Up to 10 MB."}</span>
          </div>
        )}
        {A.sub !== "file" && (
          <label htmlFor="catext">{A.sub === "both" ? "Or paste your numbers and notes" : "Your answer"}
            <textarea className="field" id="catext" rows={5} value={tx} onChange={(ev) => setText(ev.target.value)} placeholder="Week 1: opening $8,000, in $6,500, out $7,200…" />
          </label>
        )}
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={x.busy} onClick={submit}>Submit assignment</button>
          {edit && <button type="button" className="btn ghost" onClick={() => setEdit(false)}>Cancel</button>}
          <span className="small muted">Only you and the course team can see this.</span>
        </div>
      </div>
    </>
  );
}

// ---------- quiz: scored on the server; the answers never reach the browser ----------
type Att = { score: number; total: number; wrong: number[]; passed: boolean; timed_out: boolean };
function Quiz({ c, l, e, staff, inPrev, staffQs }: { c: Course; l: Lesson; e: Enrol | null; staff: boolean; inPrev: boolean; staffQs: StaffQ[] | null }) {
  const x = useCr();
  const router = useRouter();
  const [qv, setQv] = useState<QuizView | null>(null);
  const [pv, setPv] = useState<{ start: number; ans: Record<number, number> } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(Date.now());
  const skew = useRef(0);
  const fired = useRef("");
  const load = useCallback(async () => {
    const r = await quizView(l.id);
    if (r.quiz) {
      skew.current = Date.now() - new Date(r.quiz.now).getTime();
      setQv(r.quiz);
    } else if (r.error) x.toast(r.error);
  }, [l.id, x]);
  useEffect(() => {
    if (!inPrev) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.id, inPrev]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // in learner preview everything stays in this browser tab
  const pAtts: Att[] = inPrev ? (x.preview?.att[l.id] ?? []) : [];
  const info = l.quiz!;
  const nQ = inPrev ? staffQs?.length ?? 0 : qv?.questions.length ?? 0;
  const Q = { pass: inPrev ? info.pass : qv?.pass_pct ?? info.pass, limit: inPrev ? info.limit : qv?.limit ?? info.limit, attempts: inPrev ? info.attempts : qv?.attempts ?? info.attempts };
  const passN = Math.ceil((nQ * Q.pass) / 100);
  const used = inPrev ? pAtts.length + (pv ? 1 : 0) : qv?.used ?? 0;
  const left = Q.attempts - used;
  const facts = (
    <div className="crfacts">
      <div><span className="small muted">Questions</span><b>{nQ}</b></div>
      <div><span className="small muted">Passing score</span><b>{Q.pass}% ({passN} of {nQ})</b></div>
      <div><span className="small muted">Time limit</span><b>{Q.limit ? `${Q.limit} minutes` : "None"}</b></div>
      <div><span className="small muted">Attempts left</span><b>{e ? `${Math.max(0, left)} of ${Q.attempts}` : Q.attempts}</b></div>
    </div>
  );
  if (staff) return <div className="card">{facts}<p className="small muted">Learners take the quiz here. Questions are set in the course editor.</p></div>;
  if (!e) return <div className="card">{facts}</div>;
  if (!inPrev && !qv) return <div className="card">{facts}</div>;

  const questions = inPrev ? (staffQs ?? []).map((q) => ({ q: q.q, o: q.o })) : qv!.questions;
  const open = inPrev ? (pv ? { id: "preview", answers: pv.ans as Record<string, number>, ends: Q.limit ? pv.start + Q.limit * 6e4 : null } : null)
    : qv!.open ? { id: qv!.open.id, answers: qv!.open.answers, ends: qv!.open.ends_at ? new Date(qv!.open.ends_at).getTime() + skew.current : null } : null;
  const done: Att[] = inPrev ? pAtts : qv!.done;
  const last = done[done.length - 1];
  const passed = done.some((a) => a.passed);

  const scorePreview = (ans: Record<number, number>, timed: boolean): Att => {
    const qs = staffQs ?? [];
    let sc = 0;
    const wr: number[] = [];
    qs.forEach((q, i) => (ans[i] === q.a ? sc++ : wr.push(i)));
    return { score: sc, total: qs.length, wrong: wr, passed: qs.length > 0 && (100 * sc) / qs.length >= Q.pass, timed_out: timed };
  };
  const finish = async (timed: boolean) => {
    if (inPrev) {
      const at = scorePreview(pv!.ans, timed);
      const att = { ...x.preview!.att, [l.id]: [...pAtts, at] };
      x.setPreview({ ...x.preview!, att, passed: at.passed ? { ...x.preview!.passed, [l.id]: true } : x.preview!.passed });
      setPv(null);
      return x.toast(at.passed ? "Passed. Well done!" : "Not passed this time. Review the questions and try again.");
    }
    const r = await x.run(() => quizSubmit(l.id, open!.id));
    if (r?.error) { x.toast(r.error); return void load(); }
    if (r?.quiz) setQv(r.quiz);
    x.toast(r?.completed ? "Course complete. Well done!" : r?.passed ? "Passed. Well done!" : "Not passed this time. Review the questions and try again.");
    router.refresh();
  };
  // time is up: submitted with the answers so far (the server does the same if the page is closed)
  if (open && open.ends && now >= open.ends && !x.busy && fired.current !== open.id) {
    fired.current = open.id;
    queueMicrotask(() => void finish(true));
  }

  if (open) {
    const rem = open.ends ? Math.max(0, open.ends - now) : 0;
    const answered = Object.keys(open.answers).length;
    return (
      <div className="card crquiz">
        <div className="row" style={{ flexWrap: "wrap" }}>
          <b className="grow">Attempt {used} of {Q.attempts}</b>
          {Q.limit > 0 && <span className="crtimer" id="crtimer"><Ic n="clock" s={14} /><span>{clock(rem / 1000)}</span> left</span>}
        </div>
        <p className="small muted">Your answers save as you go. If you refresh or switch devices, you’ll come back to this same attempt.</p>
        {questions.map((q, i) => (
          <fieldset className="crqq" key={i}>
            <legend><b>{i + 1}.</b> {q.q}</legend>
            {q.o.map((o, j) => (
              <label className="crqo" key={j}>
                <input type="radio" name={`cq${i}`} value={j} checked={open.answers[i] === j} onChange={() => {
                  if (inPrev) return setPv({ ...pv!, ans: { ...pv!.ans, [i]: j } });
                  setQv({ ...qv!, open: { ...qv!.open!, answers: { ...qv!.open!.answers, [i]: j } } });
                  void quizAnswer(open.id, i, j).then((r) => { if (r?.error) { x.toast(r.error); void load(); } });
                }} />
                <span>{o}</span>
              </label>
            ))}
          </fieldset>
        ))}
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={x.busy} onClick={() => {
            const miss = questions.length - answered;
            if (miss && !confirm) {
              setConfirm(true);
              return x.toast(`${miss} question${miss === 1 ? " is" : "s are"} unanswered. Press Submit again to submit anyway.`);
            }
            setConfirm(false);
            void finish(false);
          }}>Submit answers</button>
          <span className="small muted">{answered} of {questions.length} answered</span>
        </div>
      </div>
    );
  }
  const nxt = nextAfter(c, l, e, false);
  return (
    <div className="card">
      {facts}
      {last ? (
        <>
          <div className={`crgrade ${last.passed ? "pass" : "fail"}`}>
            <b>{last.passed ? "Passed" : "Not passed"} · {last.score} of {last.total} ({Math.round((100 * last.score) / Math.max(1, last.total))}%)</b>
            <span className="small">{last.passed ? "Nice work. " : `You need ${passN} of ${nQ} to pass. `}{last.timed_out ? "Time ran out, so your answers were submitted automatically." : ""}</span>
            {!last.passed && <span className="small">Questions to review: {last.wrong.map((i) => i + 1).join(", ")}</span>}
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {passed ? (nxt ? <Link className="btn" href={learnHref(c, nxt)}>Next: {nxt.title}</Link> : complete(c, e) ? <button type="button" className="btn" onClick={() => (inPrev ? x.toast("Reviews are turned off in learner preview") : x.open({ type: "rev", c }))}>Leave a review</button> : null)
              : left > 0 ? <button type="button" className="btn" disabled={x.busy} onClick={() => void start()}>Try again ({left} left)</button>
                : <span className="small muted">No attempts left. Message {c.instructors[0]?.name ?? "the instructor"} for help.</span>}
          </div>
        </>
      ) : (
        <div className="row"><button type="button" className="btn" disabled={x.busy} onClick={() => void start()}>Start quiz</button><span className="small muted">The timer starts when you press Start.</span></div>
      )}
    </div>
  );
  async function start() {
    if (inPrev) {
      if (pAtts.length >= Q.attempts) return x.toast("No attempts left");
      return setPv({ start: Date.now(), ans: {} });
    }
    const r = await x.run(() => quizStart(l.id));
    if (r?.error) return x.toast(r.error);
    if (r?.quiz) { skew.current = Date.now() - new Date(r.quiz.now).getTime(); setQv(r.quiz); }
  }
}
