// Courses for the browser tests (Update 4): the hand-off's sample courses (e2e/courses-fixture.json, made from
// code/courses-source/cr1.js) served like Supabase would, with the same visibility rules, and kept in memory so
// enrolling, finishing lessons, quizzes, submissions, grading and reviews can be tested end to end.
import fs from "node:fs";

const FIX = JSON.parse(fs.readFileSync(new URL("./courses-fixture.json", import.meta.url), "utf8"));
const T0 = Date.now();
const iso = (ago) => (ago == null ? null : new Date(T0 - ago).toISOString());
const ME = "00000000-0000-4000-8000-000000000001";
const SARA = "c692d5c9-b93b-4140-a608-cfc035330f9d";
let S;
export function resetCourses() {
  S = JSON.parse(JSON.stringify(FIX));
  for (const t of Object.values(S)) for (const r of t) for (const k of Object.keys(r)) if (k.endsWith("_ago")) { r[k.replace(/_ago$/, "_at")] = iso(r[k]); delete r[k]; }
  for (const c of S.courses) c.created_at = c.created_at ?? new Date(T0 - 1).toISOString();
  S.quiz_attempts = [];
  S.reports = [];
}
resetCourses();

const TABLES = new Set(["courses", "course_instructors", "course_sections", "lessons", "lesson_content", "lesson_files", "assignments", "quizzes", "quiz_questions", "enrolments", "lesson_progress", "quiz_attempts", "submissions", "course_reviews", "saved_courses", "course_prefs"]);

function match(row, url) {
  for (const [k, v] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    const val = row[k];
    if (v.startsWith("eq.")) { if (String(val) !== v.slice(3)) return false; }
    else if (v.startsWith("neq.")) { if (String(val) === v.slice(4)) return false; }
    else if (v.startsWith("in.(")) { if (!v.slice(4, -1).split(",").map((s) => s.replace(/"/g, "")).includes(String(val))) return false; }
    else if (v === "is.null") { if (val != null) return false; }
    else if (v === "not.is.null") { if (val == null) return false; }
  }
  return true;
}

export function handleCourses(req, res, url, { member, staff, sub }) {
  const me = member ? sub : null;
  const canEdit = (cid) => staff || (me && S.course_instructors.some((i) => i.course_id === cid && i.member_id === me));
  const visible = (cid) => { const c = S.courses.find((x) => x.id === cid); return !!c && (c.status === "published" || canEdit(cid)); };
  const lesson = (id) => S.lessons.find((l) => l.id === id);
  const enrol = (cid, m = me) => S.enrolments.find((e) => e.member_id === m && e.course_id === cid);
  const done = (m, l) => {
    const L = lesson(l);
    if (!L || !enrol(L.course_id, m)) return false;
    if (L.type === "quiz") return S.quiz_attempts.some((a) => a.member_id === m && a.lesson_id === l && a.passed);
    if (L.type === "assignment") {
      const s = S.submissions.find((x) => x.member_id === m && x.lesson_id === l);
      const c = S.courses.find((x) => x.id === L.course_id);
      const a = S.assignments.find((x) => x.lesson_id === l);
      return !!s && (c.asg_rule === "submit" || (s.grade_marks ?? -1) >= a.pass_mark);
    }
    return S.lesson_progress.some((p) => p.member_id === m && p.lesson_id === l && p.done_at);
  };
  const order = (cid) => {
    const secs = S.course_sections.filter((s) => s.course_id === cid).sort((a, b) => a.position - b.position);
    return secs.flatMap((s) => S.lessons.filter((l) => l.section_id === s.id).sort((a, b) => a.position - b.position));
  };
  const openOk = (l) => {
    const L = lesson(l);
    if (!L || !visible(L.course_id)) return false;
    if (canEdit(L.course_id)) return true;
    const e = me && enrol(L.course_id);
    if (!e) return L.free_preview;
    if (L.drip_days && Date.now() < new Date(e.enrolled_at).getTime() + L.drip_days * 864e5) return false;
    const c = S.courses.find((x) => x.id === L.course_id);
    if (c.order_rule === "seq") for (const x of order(c.id)) { if (x.id === l) break; if (!done(me, x.id)) return false; }
    return true;
  };
  const send = (rows) => {
    const one = String(req.headers.accept).includes("vnd.pgrst.object");
    if (one) {
      if (!rows.length) { res.statusCode = 406; return res.end(JSON.stringify({ code: "PGRST116", message: "no rows" })); }
      return res.end(JSON.stringify(rows[0]));
    }
    return res.end(JSON.stringify(rows));
  };
  const body = () => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } }); });

  if (url.pathname === "/__reset_courses") { resetCourses(); return res.end("{}"), true; }
  const t = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
  if (t && (TABLES.has(t) || t === "reports" && req.method === "POST")) {
    if (req.method === "GET" || req.method === "HEAD") {
      let rows = (S[t] ?? []).filter((r) => match(r, url));
      if (t === "courses") rows = rows.filter((r) => visible(r.id));
      else if (["course_instructors", "course_sections", "lessons", "lesson_files", "quizzes"].includes(t)) rows = rows.filter((r) => visible(r.course_id));
      else if (t === "lesson_content" || t === "assignments") rows = rows.filter((r) => canEdit(r.course_id) || openOk(r.lesson_id));
      else if (t === "quiz_questions") rows = rows.filter((r) => canEdit(r.course_id));
      else if (["enrolments", "lesson_progress", "quiz_attempts", "submissions"].includes(t)) rows = rows.filter((r) => r.member_id === me || canEdit(r.course_id));
      else if (t === "course_reviews") rows = rows.filter((r) => (!r.hidden_at && visible(r.course_id)) || r.member?.id === me || staff);
      else if (t === "saved_courses" || t === "course_prefs") rows = rows.filter((r) => r.member_id === me);
      if (t === "courses") rows = rows.map((r) => ({ ...r, group: r.group }));
      if (req.method === "HEAD" || String(url.searchParams.get("select")).includes("count")) res.setHeader("content-range", `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
      return send(rows), true;
    }
    if (!me) { res.statusCode = 401; return res.end("{}"), true; }
    void body().then((b) => {
      const list = Array.isArray(b) ? b : [b];
      if (req.method === "POST") {
        if (t === "course_reviews") {
          for (const r of list) {
            if (!S.lessons.some((l) => l.course_id === r.course_id && done(me, l.id))) { res.statusCode = 403; return res.end(JSON.stringify({ code: "42501", message: "new row violates row-level security policy" })); }
            S.course_reviews.push({ id: `00000000-0000-4000-8000-${String(Date.now()).slice(-12)}`, course_id: r.course_id, stars: r.stars, body: r.body, created_at: new Date().toISOString(), hidden_at: null, member: { id: me, full_name: "Test Member", headline: "Owner, Test Bakery", avatar_url: null } });
          }
        } else if (t === "course_prefs") {
          S.course_prefs = S.course_prefs.filter((p) => p.member_id !== me).concat(list.map((p) => ({ ...p, member_id: me })));
        } else if (t === "reports") {
          S.reports.push(...list);
        } else S[t].push(...list);
        res.statusCode = 201;
        return res.end(JSON.stringify(list));
      }
      if (req.method === "DELETE") {
        const gone = S[t].filter((r) => match(r, url) && (t !== "course_reviews" || r.member?.id === me));
        S[t] = S[t].filter((r) => !gone.includes(r));
        return res.end(JSON.stringify(gone));
      }
      if (req.method === "PATCH") {
        const rows = S[t].filter((r) => match(r, url) && (t !== "courses" || canEdit(r.id)) && (t !== "course_reviews" || r.member?.id === me || staff));
        for (const r of rows) Object.assign(r, b, t === "course_reviews" ? { body: b.body ?? r.body } : {});
        return send(rows);
      }
      res.end("[]");
    });
    return true;
  }

  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
  const R = {
    course_classmates: (a) => (me ? S.enrolments.filter((e) => e.course_id === a.cid && e.member_id !== me && !S.course_instructors.some((i) => i.course_id === a.cid && i.member_id === e.member_id) && !FIX.course_prefs.some((p) => p.member_id === e.member_id))
      .sort((x, y) => y.enrolled_at.localeCompare(x.enrolled_at)).map((e) => { const p = S.course_reviews.find((r) => r.member.id === e.member_id)?.member ?? S.submissions.find((s) => s.member_id === e.member_id)?.member ?? FIX_PEOPLE[e.member_id]; return { id: e.member_id, full_name: p?.full_name ?? "A member", avatar_url: p?.avatar_url ?? null, enrolled_at: e.enrolled_at }; }) : []),
    course_learner_count: (a) => S.enrolments.filter((e) => e.course_id === a.cid && !S.course_instructors.some((i) => i.course_id === a.cid && i.member_id === e.member_id) && !FIX.course_prefs.some((p) => p.member_id === e.member_id)).length,
    enrol_free: (a) => { const c = S.courses.find((x) => x.id === a.cid); if (!c || c.status !== "published" || c.access !== "free") throw new Error("This course isn’t available"); if (!enrol(a.cid)) S.enrolments.push({ member_id: me, course_id: a.cid, enrolled_at: new Date().toISOString(), payment_id: null, completed_at: null, last_lesson_id: null, last_opened_at: null }); return null; },
    course_mail_claim: () => true,
    open_lesson: (a) => { const L = lesson(a.p_lesson); const e = L && enrol(L.course_id); if (e && openOk(a.p_lesson)) { e.last_lesson_id = a.p_lesson; e.last_opened_at = new Date().toISOString(); } return null; },
    save_video_pos: (a) => { const L = lesson(a.p_lesson); if (!L || !enrol(L.course_id)) return null; let p = S.lesson_progress.find((x) => x.member_id === me && x.lesson_id === a.p_lesson); if (!p) S.lesson_progress.push((p = { member_id: me, lesson_id: a.p_lesson, course_id: L.course_id, done_at: null, video_pos: 0 })); p.video_pos = a.p_sec; return null; },
    mark_lesson_done: (a) => {
      const L = lesson(a.p_lesson);
      if (!L || !["video", "text"].includes(L.type)) throw new Error("This lesson can’t be marked complete");
      if (!openOk(a.p_lesson) || !enrol(L.course_id)) throw new Error("This lesson is locked");
      let p = S.lesson_progress.find((x) => x.member_id === me && x.lesson_id === a.p_lesson);
      if (!p) S.lesson_progress.push((p = { member_id: me, lesson_id: a.p_lesson, course_id: L.course_id, video_pos: 0 }));
      p.done_at ??= new Date().toISOString();
      return checkComplete(L.course_id);
    },
    submit_assignment: (a) => {
      const L = lesson(a.p_lesson);
      if (!openOk(a.p_lesson) || !enrol(L.course_id)) throw new Error("This lesson is locked");
      if (!a.p_body && !a.p_file_path) throw new Error("Upload a file or paste your answer first");
      S.submissions = S.submissions.filter((s) => !(s.member_id === me && s.lesson_id === a.p_lesson));
      S.submissions.push({ id: `00000000-0000-4000-8000-${String(Date.now()).slice(-12)}`, member_id: me, lesson_id: a.p_lesson, course_id: L.course_id, submitted_at: new Date().toISOString(), body: a.p_body, file_name: a.p_file_name, file_size: a.p_file_size, late: false, grade_marks: null, feedback: "", graded_by: null, graded_at: null, seen_at: null, member: { id: me, full_name: "Test Member", headline: "Owner, Test Bakery", avatar_url: null } });
      return checkComplete(L.course_id);
    },
    grade_submission: (a) => { const s = S.submissions.find((x) => x.id === a.p_sub); if (!s || !canEdit(s.course_id)) throw new Error("Only this course’s instructors can grade it"); Object.assign(s, { grade_marks: a.p_marks, feedback: a.p_feedback, graded_by: me, graded_at: new Date().toISOString(), seen_at: null }); return null; },
    feedback_seen: (a) => { const s = S.submissions.find((x) => x.id === a.p_sub && x.member_id === me); if (s) s.seen_at = new Date().toISOString(); return null; },
    quiz_view: (a) => quizView(a.p_lesson),
    quiz_start: (a) => {
      const q = S.quizzes.find((x) => x.lesson_id === a.p_lesson);
      if (!q || !openOk(a.p_lesson) || !enrol(q.course_id)) throw new Error("This lesson is locked");
      const mine = S.quiz_attempts.filter((x) => x.member_id === me && x.lesson_id === a.p_lesson);
      const open = mine.find((x) => !x.submitted_at);
      if (open) return open.id;
      if (mine.some((x) => x.passed)) throw new Error("You already passed this quiz");
      if (mine.length >= q.attempts) throw new Error("No attempts left");
      const at = { id: `00000000-0000-4000-8000-${String(Date.now()).slice(-12)}`, member_id: me, lesson_id: a.p_lesson, course_id: q.course_id, started_at: new Date().toISOString(), answers: {}, submitted_at: null };
      S.quiz_attempts.push(at);
      return at.id;
    },
    quiz_answer: (a) => { const at = S.quiz_attempts.find((x) => x.id === a.p_attempt && x.member_id === me); if (!at || at.submitted_at) throw new Error("This attempt is closed"); at.answers[a.p_q] = a.p_option; return null; },
    quiz_submit: (a) => { const at = S.quiz_attempts.find((x) => x.id === a.p_attempt && x.member_id === me); if (!at) throw new Error("Unknown attempt"); score(at, false); const c = checkComplete(at.course_id); return { score: at.score, total: at.total, passed: at.passed, wrong: at.wrong, timed_out: at.timed_out, completed: c }; },
    publish_course: (a) => { if (!staff) throw new Error("Only the Hub team can publish courses"); const c = S.courses.find((x) => x.id === a.cid); c.status = "published"; return null; },
    unpublish_course: (a) => { if (!staff) throw new Error("Only the Hub team can unpublish courses"); S.courses.find((x) => x.id === a.cid).status = "draft"; return null; },
    ask_publish_course: (a) => { if (!canEdit(a.cid)) throw new Error("Only this course’s instructors can ask"); S.courses.find((x) => x.id === a.cid).publish_asked_at = new Date().toISOString(); return null; },
    lesson_download_ok: (a) => { const L = lesson(a.p_lesson); return !!L && (canEdit(L.course_id) || (!!enrol(L.course_id) && openOk(a.p_lesson))); },
  };
  function score(at, timed) {
    if (at.submitted_at) return;
    const qs = S.quiz_questions.filter((x) => x.lesson_id === at.lesson_id).sort((x, y) => x.position - y.position);
    const q = S.quizzes.find((x) => x.lesson_id === at.lesson_id);
    let sc = 0; const wr = [];
    qs.forEach((x, i) => (at.answers[i] === x.correct_index ? sc++ : wr.push(i)));
    Object.assign(at, { submitted_at: new Date().toISOString(), score: sc, total: qs.length, wrong: wr, timed_out: timed, passed: qs.length > 0 && (100 * sc) / qs.length >= q.pass_pct });
  }
  function checkComplete(cid) {
    const e = enrol(cid);
    const ls = order(cid);
    if (e && !e.completed_at && ls.length && ls.every((l) => done(me, l.id))) { e.completed_at = new Date().toISOString(); return true; }
    return false;
  }
  function quizView(l) {
    const q = S.quizzes.find((x) => x.lesson_id === l);
    if (!q || !openOk(l)) throw new Error("This lesson is locked");
    const mine = S.quiz_attempts.filter((x) => x.member_id === me && x.lesson_id === l);
    for (const at of mine) if (!at.submitted_at && q.time_limit_min && Date.now() >= new Date(at.started_at).getTime() + q.time_limit_min * 6e4) score(at, true);
    const op = mine.find((x) => !x.submitted_at);
    return {
      pass_pct: q.pass_pct, limit: q.time_limit_min, attempts: q.attempts, now: new Date().toISOString(), used: mine.length, staff: !!canEdit(q.course_id),
      questions: S.quiz_questions.filter((x) => x.lesson_id === l).sort((x, y) => x.position - y.position).map((x) => ({ q: x.question, o: x.options })),
      done: mine.filter((x) => x.submitted_at).map((x) => ({ id: x.id, score: x.score, total: x.total, passed: x.passed, wrong: x.wrong, timed_out: x.timed_out, at: x.submitted_at })),
      open: op ? { id: op.id, answers: op.answers, started_at: op.started_at, ends_at: q.time_limit_min ? new Date(new Date(op.started_at).getTime() + q.time_limit_min * 6e4).toISOString() : null } : null,
    };
  }
  if (rpc && R[rpc]) {
    void body().then((a) => {
      try {
        const out = R[rpc](a);
        res.end(JSON.stringify(out ?? null));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ code: "P0001", message: e.message }));
      }
    });
    return true;
  }
  return false;
}
// names for classmates who only appear in enrolments
const FIX_PEOPLE = Object.fromEntries([...FIX.course_reviews.map((r) => r.member), ...FIX.submissions.map((s) => s.member), ...FIX.course_instructors.map((i) => i.member)].map((p) => [p.id, p]));
FIX_PEOPLE["ce12503e-8ae8-4979-ba84-3695bcd441ca"] ??= { full_name: "Chloe Tremblay", avatar_url: "/sample/p-chloe.jpg" };
FIX_PEOPLE["eeb54bae-d466-5911-a060-86fe0a16b09f"] = { full_name: "Owen Clarke", avatar_url: "/sample/p-owen.jpg" };
void SARA;
