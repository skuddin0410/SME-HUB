"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import {
  CTYPES, access, complete, courseHref, courseMins, courseState, dur, fmtD, learnHref, lessonDone, lessonsOf, names, nextLesson,
  plural, progress, rating, type Course, type Enrol, type Lesson, type Person, type Review, type Sub,
} from "@/lib/courses-shared";
import { buyCourse, deleteCourse, deleteReview, enrolFree, publishCourse, reportReview, saveReview, toggleSave, unpublishCourse } from "@/app/(hub)/course-actions";
import { cad, courseTax, PROVINCES, provinceOf } from "@/lib/courses-shared";

// ---------- learner preview: the course team sees a course as a new learner; nothing is saved ----------
const PREV_KEY = "smehub.courses.preview";
export type Preview = { id: string; slug: string; t: number; done: Record<string, number>; subs: Record<string, Sub>; passed: Record<string, true>; att: Record<string, { score: number; total: number; wrong: number[]; passed: boolean; timed_out: boolean }[]>; last: string | null };
function readPrev(): Preview | null {
  try {
    return JSON.parse(sessionStorage.getItem(PREV_KEY) || "null");
  } catch {
    return null;
  }
}
export function prevEnrol(p: Preview): Enrol {
  return { t: p.t, lastT: p.t, last: p.last, completed: null, paid: false, done: p.done, pos: {}, passed: p.passed, subs: p.subs };
}

type Modal =
  | { type: "qv"; c: Course }
  | { type: "rev"; c: Course }
  | { type: "buy"; c: Course }
  | { type: "del"; c: Course }
  | { type: "unpub"; c: Course; enrolled: number }
  | { type: "report"; r: Review; c: Course };

type Ctx = {
  member: boolean; staff: boolean; userId: string | null; location: string | null; cats: [string, string][]; hidden: boolean;
  enrols: Record<string, Enrol>; saved: Set<string>; reviews: Record<string, Review[]>;
  preview: Preview | null; setPreview: (p: Preview | null) => void;
  toast: (t: string) => void; open: (m: Modal) => void; close: () => void;
  enrolOf: (c: Course) => Enrol | null; isStaff: (c: Course) => boolean;
  startPreview: (c: Course) => void; exitPreview: (c: Course) => void;
  busy: boolean; run: <T>(f: () => Promise<T>) => Promise<T | undefined>;
};
const C = createContext<Ctx | null>(null);
export const useCr = () => useContext(C)!;

export function CoursesProvider({ children, member, staff, userId, location, enrols, saved, reviews, cats, hidden }: {
  children: React.ReactNode; member: boolean; staff: boolean; userId: string | null; location: string | null; cats: [string, string][]; hidden: boolean;
  enrols: Record<string, Enrol>; saved: string[]; reviews: Record<string, Review[]>;
}) {
  const router = useRouter();
  const path = usePathname();
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [modal, setModal] = useState<Modal | null>(null);
  const [preview, setPrevState] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const savedSet = useMemo(() => new Set(saved), [saved]);

  const toast = useCallback((t: string) => {
    setNote(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(""), 3200);
  }, []);
  const setPreview = useCallback((p: Preview | null) => {
    try {
      if (p) sessionStorage.setItem(PREV_KEY, JSON.stringify(p));
      else sessionStorage.removeItem(PREV_KEY);
    } catch {}
    setPrevState(p);
  }, []);
  // preview lasts while the instructor stays on that course's pages, as in the hand-off
  useEffect(() => {
    const p = readPrev();
    if (p && !(path === `/courses/${p.slug}` || path.startsWith(`/courses/${p.slug}/learn/`))) setPreview(null);
    else setPrevState(p);
  }, [path, setPreview]);
  useEffect(() => {
    if (!modal) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setModal(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [modal]);

  const run = useCallback(async <T,>(f: () => Promise<T>) => {
    setBusy(true);
    try {
      return await f();
    } catch {
      toast("Something went wrong. Try again.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const value: Ctx = {
    member, staff, userId, location, cats: cats.length ? cats : REPORT_CATS, hidden, enrols, saved: savedSet, reviews, preview, setPreview, toast, busy, run,
    open: setModal, close: () => setModal(null),
    enrolOf: (c) => (preview?.id === c.id ? prevEnrol(preview) : enrols[c.id] ?? null),
    isStaff: (c) => c.canEdit && preview?.id !== c.id,
    startPreview: (c) => {
      setPreview({ id: c.id, slug: c.slug, t: Date.now(), done: {}, subs: {}, passed: {}, att: {}, last: null });
      setModal(null);
      router.push(courseHref(c));
    },
    exitPreview: (c) => {
      setPreview(null);
      toast("Back to your own view");
      router.push(c.canEdit ? `/courses/edit/${c.id}` : courseHref(c));
    },
  };
  return (
    <C.Provider value={value}>
      {children}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className={`modal${modal.type === "qv" ? " crqvm" : ""}`} role="dialog" aria-modal="true" aria-labelledby="mt" onClick={(e) => e.stopPropagation()}>
            <ModalBody m={modal} />
          </div>
        </div>
      )}
      {note && <div className="toast" role="status">{note}</div>}
    </C.Provider>
  );
}

// ---------- small pieces ----------
export const Av = ({ p, size }: { p: Person; size?: "s" | "l" }) => <ZipAv name={p.name} src={p.avatar} size={size} />;
export function Stars({ v, size }: { v: number; size?: string }) {
  return (
    <span className={`bzst${size ? ` ${size}` : ""}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={v >= i - 0.25 ? "on" : v >= i - 0.75 ? "half" : ""}>★</span>)}
    </span>
  );
}

export function useRevs(c: Course) {
  return useCr().reviews[c.id] ?? [];
}

export function CrTabs({ a, teach, toGrade, savedN }: { a: string; teach: boolean; toGrade: number; savedN?: number }) {
  const x = useCr();
  const tabs: [string, string, string][] = [["courses", "Browse courses", "/courses"], ["mylearning", "My learning", "/courses/my-learning"], ["savedcourses", "Saved", "/courses/saved"]];
  if (teach && x.member) tabs.push(["teaching", "Teaching", "/courses/teaching"]);
  if (x.staff && x.member) tabs.push(["courseadmin", "Manage courses", "/courses/manage"]);
  return (
    <nav className="crtabs" aria-label="Courses">
      {tabs.map(([k, l, h]) => (
        <Link key={k} href={h} aria-current={a === k ? "page" : undefined}>
          {l}
          {k === "teaching" && toGrade > 0 && <> <span className="crbadge2">{toGrade}</span></>}
          {k === "savedcourses" && x.member && savedN != null && savedN > 0 && <> <span className="muted">{savedN}</span></>}
        </Link>
      ))}
    </nav>
  );
}

/** The main button for a course: preview, buy, enrol, start, continue, review. */
export function CrMain({ c, cls }: { c: Course; cls?: string }) {
  const x = useCr();
  const router = useRouter();
  const e = x.enrolOf(c);
  const st = courseState(c, e, x.member);
  const b = (lab: string, on: () => void, ic?: string) => (
    <button type="button" className={`btn ${cls ?? ""}`.trim()} disabled={x.busy} onClick={on}>{ic && <Ic n={ic} s={15} />}{lab}</button>
  );
  if (x.isStaff(c)) return b("Preview as a learner", () => x.startPreview(c), "eye");
  if (st === "guest") return <Link className={`btn ${cls ?? ""}`.trim()} href="/auth/sign-up">{c.access === "paid" ? `Buy course · CAD $${c.price}` : "Enrol for free"}</Link>;
  const go = () => {
    const l = nextLesson(c, e, false);
    x.close();
    if (l) router.push(learnHref(c, l));
  };
  if (st === "none") {
    if (c.access === "paid") return b(`Buy course · CAD $${c.price}`, () => x.open({ type: "buy", c }));
    return b("Enrol for free", () => {
      if (x.preview?.id === c.id) return go();
      void x.run(async () => {
        const r = await enrolFree(c.id);
        if (r?.error) return x.toast(r.error);
        x.close();
        x.toast("You’re enrolled. Here’s your first lesson.");
        router.push(r.href!);
        router.refresh();
      });
    });
  }
  if (st === "enrolled") return b("Start course", go, "play");
  if (st === "started") return b("Continue learning", go, "play");
  return b("Review completed course", go, "check");
}

export function SaveBtn({ c, big }: { c: Course; big?: boolean }) {
  const x = useCr();
  const router = useRouter();
  const [sv, setSv] = useState(x.saved.has(c.id));
  useEffect(() => setSv(x.saved.has(c.id)), [x.saved, c.id]);
  const click = () => {
    if (!x.member) return router.push("/auth/sign-up");
    setSv(!sv);
    void x.run(async () => {
      const r = await toggleSave(c.id);
      if (r?.error) {
        setSv(sv);
        return x.toast(r.error);
      }
      x.toast(r.saved ? "Saved. Find it under Courses, Saved." : "Removed from saved");
      router.refresh();
    });
  };
  if (big) return <button type="button" className="btn ghost" aria-pressed={sv} onClick={click}><Ic n="mark" s={15} fill={sv ? "currentColor" : "none"} />{sv ? "Saved" : "Save"}</button>;
  return <button type="button" className="iconbtn" aria-label={sv ? "Remove from saved" : "Save course"} aria-pressed={sv} onClick={click}><Ic n="mark" s={17} fill={sv ? "currentColor" : "none"} /></button>;
}

export function CrQuick({ c }: { c: Course }) {
  const a = lessonsOf(c);
  return (
    <>
      <strong>{c.title}</strong>
      <span className="crmeta small">
        <span><Ic n="list" s={13} />{a.length}{a.length === 1 ? " lesson" : " lessons"}</span>
        <span><Ic n="clock" s={13} />{dur(courseMins(c))}</span>
        <span><Ic n="cap" s={13} />{c.level}</span>
      </span>
      <p className="small">{c.summary}</p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <CrMain c={c} cls="sm" />
        <Link className="btn sm ghost" href={courseHref(c)}>Course details</Link>
      </div>
    </>
  );
}

export function CrCard({ c }: { c: Course }) {
  const x = useCr();
  const e = x.member ? x.enrolOf(c) : null;
  const p = e ? progress(c, e) : null;
  const rt = rating(useRevs(c));
  const dr = c.status !== "published";
  return (
    <div className={`card crc${dr ? " crdraft" : ""}`}>
      <Link className="crcov" href={courseHref(c)} tabIndex={-1} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.cover || undefined} alt="" loading="lazy" />
        {dr ? <span className="crflag dr">Draft</span> : e ? <span className="crflag">{complete(c, e) ? <><Ic n="check" s={12} />Completed</> : `Enrolled · ${p!.pct}%`}</span> : null}
        {c.access === "paid" ? <span className="crprice">CAD ${c.price}</span> : <span className="crprice free">Free</span>}
      </Link>
      <div className="crcb">
        <span className="crtopic">{c.topic}{c.lang !== "English" ? ` · ${c.lang}` : ""}</span>
        <h3 className="crt"><Link href={courseHref(c)}>{c.title}</Link></h3>
        <span className="muted small">{names(c)}</span>
        {e && <span className="crbar" aria-hidden="true"><i style={{ width: `${p!.pct}%` }} /></span>}
        <div className="crfoot">
          {rt ? <span className="small crrt">★ {rt.avg} <span className="muted">({rt.n})</span></span> : <span className="small muted">New</span>}
          <span className="grow" />
          <button type="button" className="iconbtn crqvbtn" aria-label={`Quick look: ${c.title}`} onClick={() => x.open({ type: "qv", c })}><Ic n="info" s={17} /></button>
          <SaveBtn c={c} />
        </div>
      </div>
      <div className="crqp" role="tooltip"><CrQuick c={c} /></div>
    </div>
  );
}

export function CrGate({ t, x: text }: { t: string; x: string }) {
  const x = useCr();
  return (
    <div className="card crempty">
      <span className="sq big"><Ic n="cap" s={22} /></span>
      <strong>{t}</strong>
      <p className="muted">{text}</p>
      <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
        {x.member ? <Link className="btn" href="/courses">Browse courses</Link> : <><Link className="btn" href="/auth/sign-up">Join free</Link><Link className="btn ghost" href="/courses">Browse courses</Link></>}
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="card crempty" style={{ maxWidth: 560, margin: "40px auto" }}>
      <span className="sq big"><Ic n="cap" s={22} /></span>
      <strong>This course isn’t available</strong>
      <p className="muted">It may be a draft or it may have been removed.</p>
      <Link className="btn" href="/courses">Browse courses</Link>
    </div>
  );
}

export const StatusTag = ({ c }: { c: Course }) => (c.status === "published" ? <span className="crst done">Published</span> : <span className="crst lock">Draft</span>);

export function CrBanner({ c }: { c: Course }) {
  const x = useCr();
  const router = useRouter();
  if (x.preview?.id === c.id) {
    return (
      <div className="crban prev"><Ic n="eye" s={16} /><span className="grow"><b>Learner preview.</b> You are seeing this course as a newly enrolled member. Nothing you do here is saved.</span>
        <button type="button" className="btn sm ghost" onClick={() => x.exitPreview(c)}>Exit preview</button></div>
    );
  }
  if (c.status !== "published" && c.canEdit) {
    return (
      <div className="crban"><Ic n="lock" s={16} /><span className="grow"><b>{c.sample ? "Sample draft course. " : "Draft. "}</b>Only the Hub team and assigned instructors can see this page. Members can’t find it until it is published.</span>
        <Link className="btn sm ghost" href={`/courses/edit/${c.id}`}>Edit course</Link>
        {x.staff && <button type="button" className="btn sm" disabled={x.busy} onClick={() => void x.run(async () => {
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
    );
  }
  if (c.canEdit) {
    return (
      <div className="crban ok"><Ic n="edit" s={16} /><span className="grow">You {x.staff ? "manage" : "teach"} this course.</span>
        <Link className="btn sm ghost" href={`/courses/edit/${c.id}`}>Edit course</Link><Link className="btn sm ghost" href="/courses/teaching">Grading</Link></div>
    );
  }
  return null;
}

/** The course outline: sections that open and close, each lesson with its state. */
export function CrOutline({ c, cur }: { c: Course; cur: string | null }) {
  const x = useCr();
  const e = x.enrolOf(c);
  const staff = x.isStaff(c);
  const [openS, setOpenS] = useState<Record<string, boolean>>({});
  return (
    <>
      {c.sections.map((s, si) => {
        const open = openS[s.id] ?? (cur ? s.lessons.some((l) => l.id === cur) : si < 2 || c.sections.length <= 3);
        const dn = s.lessons.filter((l) => lessonDone(c, l, e)).length;
        return (
          <div className="crsecb" key={s.id}>
            <button type="button" className="crsech" aria-expanded={open} onClick={() => setOpenS({ ...openS, [s.id]: !open })}>
              <span className="grow"><b>{s.title}</b><span className="small muted">{plural(s.lessons.length, "lesson")} · {dur(s.lessons.reduce((n, l) => n + (+l.mins || 0), 0))}{e ? ` · ${dn} done` : ""}</span></span>
              <Ic n={open ? "up" : "down"} s={16} />
            </button>
            {open && (
              <ol className="crls">
                {s.lessons.map((l) => {
                  const av = access(c, l, e, staff);
                  const done = lessonDone(c, l, e);
                  const t = CTYPES[l.type];
                  let sx: React.ReactNode = null;
                  if (done) sx = <span className="crst done"><Ic n="check" s={13} />Done</span>;
                  else if (av.prev) sx = <span className="crst free">Free preview</span>;
                  else if (!av.ok) sx = <span className="crst lock"><Ic n="lock" s={12} />{av.why === "drip" ? `Opens ${fmtD(av.at!, null, { month: "short", day: "numeric" })}` : av.why === "order" ? "Locked" : c.access === "paid" ? "Buy to unlock" : "Enrol to unlock"}</span>;
                  const inner = (
                    <>
                      <span className="crli"><Ic n={t[1]} s={15} /></span>
                      <span className="grow stack" style={{ gap: 1, minWidth: 0 }}><span className="crlt">{l.title}</span><span className="small muted">{t[0]} · {l.mins} min{l.res.length ? ` · ${l.res.length} download` : ""}</span></span>
                      {sx}
                    </>
                  );
                  return (
                    <li key={l.id} className={cur === l.id ? "crcur" : undefined} aria-current={cur === l.id ? "step" : undefined}>
                      {av.ok ? <Link href={learnHref(c, l)}>{inner}</Link> : <span className="crlk" title={av.why === "order" ? `Finish “${av.need!.title}” first` : ""}>{inner}</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------- pop-up windows ----------
function ModalBody({ m }: { m: Modal }) {
  const x = useCr();
  const router = useRouter();
  const close = x.close;
  if (m.type === "qv") {
    const c = m.c;
    return (
      <>
        <div className="row"><h2 id="mt" className="grow" style={{ fontSize: 18 }}>Quick look</h2><button type="button" className="iconbtn" aria-label="Close" onClick={close}><Ic n="x" s={16} /></button></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.cover || undefined} alt="" className="crqvimg" />
        <CrQuick c={c} />
      </>
    );
  }
  if (m.type === "rev") return <ReviewForm c={m.c} />;
  if (m.type === "buy") return <BuyForm c={m.c} />;
  if (m.type === "report") return <ReportForm r={m.r} c={m.c} />;
  if (m.type === "del") {
    return (
      <>
        <h2 id="mt" style={{ fontSize: 18 }}>Delete this draft course?</h2>
        <p className="muted">“{m.c.title}” and all its lessons will be deleted. This can’t be undone.</p>
        <div className="row">
          <button type="button" className="btn" style={{ background: "#B91C1C", borderColor: "#B91C1C" }} disabled={x.busy} onClick={() => void x.run(async () => {
            const r = await deleteCourse(m.c.id);
            if (r?.error) return x.toast(r.error);
            close();
            x.toast("Draft deleted");
            router.push("/courses/manage");
            router.refresh();
          })}>Delete course</button>
          <button type="button" className="btn ghost" onClick={close}>Cancel</button>
        </div>
      </>
    );
  }
  return (
    <>
      <h2 id="mt" style={{ fontSize: 18 }}>Unpublish this course?</h2>
      <p className="muted">It leaves the catalogue and search. {m.enrolled} enrolled learner{m.enrolled === 1 ? "" : "s"} keep access and their progress.</p>
      <div className="row">
        <button type="button" className="btn" disabled={x.busy} onClick={() => void x.run(async () => {
          const r = await unpublishCourse(m.c.id);
          if (r?.error) return x.toast(r.error);
          close();
          x.toast("Unpublished");
          router.refresh();
        })}>Unpublish</button>
        <button type="button" className="btn ghost" onClick={close}>Cancel</button>
      </div>
    </>
  );
}

function ReviewForm({ c }: { c: Course }) {
  const x = useCr();
  const router = useRouter();
  const mine = (x.reviews[c.id] ?? []).find((r) => r.mine);
  const [star, setStar] = useState(mine?.stars ?? 0);
  const [text, setText] = useState(mine?.text ?? "");
  const send = () => {
    if (!star) return x.toast("Choose a star rating first");
    if (text.trim().length < 10) return x.toast("Write at least a short sentence");
    void x.run(async () => {
      const r = await saveReview(c.id, star, text);
      if (r?.error) return x.toast(r.error);
      x.close();
      x.toast(r.updated ? "Review updated" : "Thanks for your review");
      router.push(`${courseHref(c)}#crrev`);
      router.refresh();
    });
  };
  return (
    <>
      <h2 id="mt" style={{ fontSize: 18 }}>{mine ? "Edit your review" : `Review ${c.title}`}</h2>
      <p className="muted small">Your name and photo show with your review. One review per member, and you can edit it any time.</p>
      <div role="radiogroup" aria-label="Star rating" className="bzrate">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={star === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} className={star >= n ? "on" : ""} onClick={() => setStar(n)}>★</button>)}
      </div>
      <label htmlFor="crrt">What did you think?<textarea className="field" id="crrt" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What helped, and who would you recommend it to?" /></label>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={x.busy} onClick={send}>{mine ? "Save review" : "Post review"}</button>
        <button type="button" className="btn ghost" onClick={x.close}>Cancel</button>
        {mine && <button type="button" className="btn ghost cedanger" disabled={x.busy} onClick={() => void x.run(async () => {
          const r = await deleteReview(c.id);
          if (r?.error) return x.toast(r.error);
          x.close();
          x.toast("Review deleted");
          router.refresh();
        })}>Delete review</button>}
      </div>
    </>
  );
}

function BuyForm({ c }: { c: Course }) {
  const x = useCr();
  const known = provinceOf(x.location);
  const [prov, setProv] = useState(known ?? "ON");
  const t = courseTax(c.price, prov);
  return (
    <>
      <h2 id="mt" style={{ fontSize: 18 }}>Buy {c.title}</h2>
      <div className="crbuyrow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.cover || undefined} alt="" />
        <div className="stack" style={{ gap: 2 }}><b className="small">{c.title}</b><span className="small muted">{names(c)} · Lifetime access</span></div>
      </div>
      {!known && (
        <label className="small" htmlFor="crprov">Your province or territory<select className="field" id="crprov" value={prov} onChange={(e) => setProv(e.target.value)}>
          {Object.entries(PROVINCES).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
        </select></label>
      )}
      <div className="crtot"><span>Course</span><span>{cad(t.cents)}</span><span>{t.label}</span><span>{cad(t.tax)}</span><b>Total</b><b>{cad(t.total)}</b></div>
      <p className="small muted">You pay securely with Stripe and get a receipt by email. Tax depends on your province.</p>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={x.busy} onClick={() => void x.run(async () => {
          const r = await buyCourse(c.id, prov);
          if (r?.error) return x.toast(r.error);
          if (r.url) window.location.assign(r.url);
        })}>Pay {cad(t.total)}</button>
        <button type="button" className="btn ghost" onClick={x.close}>Cancel</button>
      </div>
    </>
  );
}

const REPORT_CATS: [string, string][] = [["Spam", "Ads, scams or repeated posts"], ["Harassment", "Bullying, threats or personal attacks"], ["Inappropriate", "Offensive or not suitable for a business community"], ["Misinformation", "False or misleading claims"], ["Other", "Something else the team should know"]];
function ReportForm({ r, c }: { r: Review; c: Course }) {
  const x = useCr();
  const router = useRouter();
  const [cat, setCat] = useState(x.cats[0]?.[0] ?? "Other");
  const [note, setNote] = useState("");
  return (
    <>
      <h2 id="mt" style={{ fontSize: 18 }}>Report course review</h2>
      <p className="muted small">Review of {c.title}: {r.text.slice(0, 60)}</p>
      <div role="radiogroup" aria-label="Reason" className="stack" style={{ gap: 2 }}>
        {x.cats.map(([n, d]) => <label className="rcat" key={n}><input type="radio" name="rcat" value={n} checked={cat === n} onChange={() => setCat(n)} /><span><b>{n}</b><span>{d}</span></span></label>)}
      </div>
      <label htmlFor="rnote">Anything the team should know? (optional)<textarea className="field" id="rnote" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <p className="muted small">Reports are private. The member is not told who reported them.</p>
      <div className="row">
        <button type="button" className="btn" disabled={x.busy} onClick={() => void x.run(async () => {
          const res = await reportReview(r.id, cat, note);
          if (res?.error) return x.toast(res.error);
          x.close();
          x.toast(res.hidden ? "Thanks. This has now been hidden while the team reviews it." : "Thanks. The Hub team will review your report.");
          router.refresh();
        })}>Send report</button>
        <button type="button" className="btn ghost" onClick={x.close}>Cancel</button>
      </div>
    </>
  );
}

export { nextLesson, type Lesson };
