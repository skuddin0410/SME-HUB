"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Ic } from "@/components/zip/ic";
import { ago, courseMins, courseState, dur, lessonsOf, nextLesson, plural, progress, rating, type Course, type Person } from "@/lib/courses-shared";
import { Av, CrBanner, CrMain, CrOutline, NotFound, SaveBtn, Stars, useCr, useRevs } from "@/components/courses/ui";

export type Mate = { id: string; name: string; avatar: string | null };

function useInst(all: Course[]) {
  const x = useCr();
  return (p: Person) => {
    const cs = all.filter((c) => c.status === "published" && c.instructors.some((i) => i.id === p.id));
    const rv = cs.flatMap((c) => x.reviews[c.id] ?? []);
    return { n: cs.length, avg: rv.length ? Math.round((10 * rv.reduce((n, r) => n + r.stars, 0)) / rv.length) / 10 : null, rn: rv.length };
  };
}

export function CoursePage({ c, all, mates, mateCount, paid }: { c: Course | null; all: Course[]; mates: Mate[]; mateCount: number; paid?: string }) {
  const x = useCr();
  const head = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const inst = useInst(all);
  useEffect(() => {
    if (paid === "1") x.toast("Payment complete. Your receipt is on its way by email.");
    // the sticky bar shows once the header scrolls away
    const upd = () => {
      const b = bar.current;
      const h = head.current;
      if (!b || !h) return;
      const on = h.getBoundingClientRect().bottom < 60;
      b.classList.toggle("on", on);
      b.setAttribute("aria-hidden", String(!on));
      // hidden, it must not take keyboard focus either
      if (on) b.removeAttribute("inert");
      else b.setAttribute("inert", "");
    };
    window.addEventListener("scroll", upd, { passive: true });
    upd();
    return () => window.removeEventListener("scroll", upd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const revs = useRevs(c ?? ({ id: "" } as Course));
  if (!c) return <NotFound />;
  const e = x.enrolOf(c);
  const staff = x.isStaff(c);
  const st = courseState(c, e, x.member);
  const p = progress(c, e);
  const rt = rating(revs);
  const a = lessonsOf(c);
  const nl = nextLesson(c, e, staff);
  const res = a.reduce((n, l) => n + l.res.length, 0);
  const inPrev = x.preview?.id === c.id;
  return (
    <>
      <CrBanner c={c} />
      <div className="crpage">
        <section className="card crhero2" id="crhead" ref={head}>
          <div className="crhl">
            <Link className="small crback" href="/courses"><Ic n="left" s={14} />All courses</Link>
            <span className="crtopic">{c.topic}</span>
            <h1 className="crh1">{c.title}</h1>
            <p className="lead">{c.summary}</p>
            <div className="crby">
              {c.instructors.map((m) => (
                <span className="row" style={{ gap: 8 }} key={m.id}>
                  <Av p={m} size="s" />
                  <span className="stack" style={{ gap: 0 }}><Link className="namebtn small" href={`/members/${m.id}`}>{m.name}</Link><span className="muted small">{m.role}</span></span>
                </span>
              ))}
            </div>
            <div className="crmeta">
              {rt ? <span><b>{rt.avg}</b> <Stars v={rt.avg} /> <button type="button" className="linkbtn small" onClick={() => document.getElementById("crrev")?.scrollIntoView({ behavior: "smooth", block: "start" })}>{plural(rt.n, "review")}</button></span> : <span className="muted small">No reviews yet</span>}
              <span><Ic n="clock" s={14} />{dur(courseMins(c))}</span>
              <span><Ic n="list" s={14} />{a.length}{a.length === 1 ? " lesson" : " lessons"}</span>
              <span><Ic n="cap" s={14} />{c.level}</span>
              <span><Ic n="msg" s={14} />{c.lang}</span>
            </div>
          </div>
          <div className="crhr">
            {c.pvideo ? (
              <div className="crpv">
                <video controls playsInline preload="metadata" poster={c.pposter || c.cover || undefined} aria-label="Course preview video" controlsList="nodownload">
                  <source src={`/api/course-media?c=${c.id}&k=pvideo`} type="video/mp4" />
                  {c.pvtt && <track kind="captions" srcLang="en" label="English" src={`/api/course-media?c=${c.id}&k=pcaptions`} default />}
                </video>
                <span className="small muted">Preview from {c.instructors[0]?.name.split(" ")[0] ?? "the instructor"}{c.pvtt ? " · Captions on" : ""}</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="crpvimg" src={c.cover || undefined} alt="" />
            )}
            {e && !staff ? (
              <div className="crprog">
                <span className="row" style={{ justifyContent: "space-between" }}><b>{st === "done" ? "Course complete" : `${p.done} of ${p.total} lessons complete`}</b><span className="muted small">{p.pct}%</span></span>
                <span className="crbar big"><i style={{ width: `${p.pct}%` }} /></span>
                {nl && st !== "done" && <span className="small muted">Up next: {nl.title}</span>}
              </div>
            ) : c.access === "paid" ? (
              <div className="crpx"><b>CAD ${c.price}</b><span className="small muted">One-time price. Lifetime access.</span></div>
            ) : (
              <div className="crpx"><b>Free</b><span className="small muted">Free for SME Hub members.</span></div>
            )}
            <div className="row" style={{ flexWrap: "wrap" }}>
              <CrMain c={c} />
              {x.member && !staff && !inPrev && <SaveBtn c={c} big />}
            </div>
          </div>
        </section>
        <div className="crbarfix" id="crbar" aria-hidden="true" ref={bar} inert>
          <div className="wrap row"><strong className="grow crbt">{c.title}</strong>{e && !staff && <span className="small muted crbp">{p.done} of {p.total}</span>}<CrMain c={c} cls="sm" /></div>
        </div>
        <div className="crcols">
          <div className="stack crmain" style={{ gap: 16 }}>
            <section className="card">
              <h2>About this course</h2>
              {c.desc.map((t, i) => <p key={i}>{t}</p>)}
              <div className="crgrid2">
                <div><h3>Who it’s for</h3><ul>{c.suits.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
                <div><h3>What you’ll be able to do</h3><ul className="crok">{c.outcomes.map((t, i) => <li key={i}><Ic n="check" s={14} />{t}</li>)}</ul></div>
                <div><h3>Before you start</h3><ul>{c.prereq.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
                <div><h3>What you’ll need</h3><ul>{c.materials.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
              </div>
            </section>
            <section className="card" id="crcur">
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                <h2>Course content</h2>
                <span className="muted small">{c.sections.length}{c.sections.length === 1 ? " section · " : " sections · "}{a.length}{a.length === 1 ? " lesson · " : " lessons · "}{dur(courseMins(c))}</span>
              </div>
              {c.rules.order === "seq" && <p className="small muted">Lessons open in order. Finish one to unlock the next.</p>}
              <CrOutline c={c} cur={null} />
            </section>
            <section className="card">
              <h2>Your instructor{c.instructors.length > 1 ? "s" : ""}</h2>
              {c.instructors.map((m) => {
                const s = inst(m);
                return (
                  <div className="crinst" key={m.id}>
                    <Av p={m} size="l" />
                    <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                      <Link className="namebtn" href={`/members/${m.id}`}>{m.name}</Link>
                      <span className="small">{m.role}</span>
                      <span className="small muted">{s.n} published course{s.n === 1 ? "" : "s"}{s.avg ? ` · ★ ${s.avg} average from ${plural(s.rn, "review")}` : ""}</span>
                    </div>
                  </div>
                );
              })}
            </section>
            <Reviews c={c} />
          </div>
          <aside className="stack crrail" style={{ gap: 16 }}>
            <div className="card">
              <h2 style={{ fontSize: 15 }}>This course includes</h2>
              <ul className="crinc">
                <li><Ic n="play" s={14} />{a.filter((l) => l.type === "video").length} video lessons</li>
                <li><Ic n="doc" s={14} />{a.filter((l) => l.type === "text").length} readings</li>
                {res > 0 && <li><Ic n="dl" s={14} />{res} download{res === 1 ? "" : "s"}</li>}
                {a.some((l) => l.type === "assignment") && <li><Ic n="asg" s={14} />Assignment with instructor feedback</li>}
                {a.some((l) => l.type === "quiz") && <li><Ic n="quiz" s={14} />Short quiz</li>}
                <li><Ic n="clock" s={14} />Pick up where you left off on any device</li>
              </ul>
            </div>
            {c.group && (
              <div className="card">
                <h2 style={{ fontSize: 15 }}>Course discussion</h2>
                <p className="small muted">Ask questions and swap notes in the {c.group.name} group. Group rules and moderation apply.</p>
                <Link className="btn ghost" style={{ alignSelf: "flex-start" }} href={x.member ? `/groups/${c.group.slug}` : "/auth/sign-up"}><Ic n="msg" s={15} />Open course discussion</Link>
              </div>
            )}
            <div className="card">
              <h2 style={{ fontSize: 15 }}>Classmates</h2>
              {mateCount ? (x.member ? (
                <>
                  <div className="crmates">
                    {mates.slice(0, 6).map((m) => (
                      <Link className="crmate" key={m.id} href={`/members/${m.id}`}><Av p={{ ...m, role: "" }} size="s" /><span className="small">{m.name.split(" ")[0]}</span></Link>
                    ))}
                  </div>
                  <span className="small muted">{mates.length} recently enrolled. Only members who allow it are shown.</span>
                </>
              ) : <span className="small muted">{mateCount} members are taking this course. Join free to see who.</span>)
                : <span className="small muted">{c.status === "published" ? "Be one of the first to enrol." : "Classmates appear here once the course is published."}</span>}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Reviews({ c }: { c: Course }) {
  const x = useCr();
  const r = useRevs(c);
  const rt = rating(r);
  const e = x.enrolOf(c);
  const inPrev = x.preview?.id === c.id;
  const mine = r.find((v) => v.mine);
  const can = !!e && !inPrev && progress(c, e).done > 0;
  return (
    <section className="card" id="crrev">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <h2>Reviews</h2>
        {can && <button type="button" className={`btn sm${mine ? " ghost" : ""}`} onClick={() => x.open({ type: "rev", c })}>{mine ? "Edit your review" : "Write a review"}</button>}
      </div>
      {rt ? (
        <div className="crrevtop">
          <div className="stack" style={{ gap: 2, alignItems: "flex-start" }}><b className="crbig">{rt.avg}</b><Stars v={rt.avg} /><span className="small muted">{plural(rt.n, "review")}</span></div>
          <div className="stack grow" style={{ gap: 4 }}>
            {[5, 4, 3, 2, 1].map((n) => {
              const k = r.filter((v) => v.stars === n).length;
              return <div className="crdist" key={n}><span className="small">{n} ★</span><span className="crbar"><i style={{ width: `${r.length ? (100 * k) / r.length : 0}%` }} /></span><span className="small muted">{k}</span></div>;
            })}
          </div>
        </div>
      ) : <p className="muted small">No reviews yet.{e ? "" : " Members who take the course can leave one."}</p>}
      {e && !can && !inPrev && <p className="small muted">You can review this course once you finish your first lesson.</p>}
      {[...r].sort((a, b) => b.t - a.t).map((v) => (
        <div className="crrevi" key={v.id}>
          <Av p={v.by} size="s" />
          <div className="stack grow" style={{ gap: 3, minWidth: 0 }}>
            <span className="row" style={{ gap: 8, flexWrap: "wrap" }}><b className="small">{v.by.name}</b><Stars v={v.stars} /><span className="small muted">{ago(v.t)}</span></span>
            <p className="small" style={{ margin: 0 }}>{v.text}</p>
          </div>
          {x.member && !v.mine && <button type="button" className="iconbtn" style={{ minWidth: 36, minHeight: 36 }} aria-label={`Report review by ${v.by.name}`} onClick={() => x.open({ type: "report", r: v, c })}><Ic n="flag" s={14} /></button>}
        </div>
      ))}
    </section>
  );
}
