"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { bookMatch, matchFeedback, saveMatchPrefs, skipMatch } from "@/app/(hub)/match-actions";
import { AVAIL, GOALS, MMGI, MMQ, NEEDS, slotsFor, type Match, type Prefs } from "@/lib/matches";

type Me = { name: string; avatar: string | null; biz: string; province: string; helps: string[] };
type Booked = Record<string, { slot: string; feedback: string | null }>;

const Ring = ({ score, big }: { score: number; big?: boolean }) => (
  <div className={`mring${big ? " big" : ""}`} style={{ "--p": score } as React.CSSProperties} role="img" aria-label={`Match score ${score} percent`}><span><b>{score}%</b><small>match</small></span></div>
);
const Why = ({ why, n }: { why: string[]; n?: number }) => (
  <ul className="mwhy">{why.slice(0, n ?? 9).map((w) => <li key={w}><span className="mck" aria-hidden="true">✓</span>{w}</li>)}</ul>
);

/** AI matchmaking (handoff: matches): hero, how it works, the five questions, then this round's matches. */
export function Matches({ me, prefs: p0, hasPrefs, list, booked: b0, round, visitor }: {
  me: Me | null; prefs: Prefs; hasPrefs: boolean; list: Match[]; booked: Booked; round: { name: string; closes: string; opens: string }; visitor: boolean;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(p0);
  const [step, setStep] = useState<"form" | "results">(hasPrefs ? "results" : "form");
  const [q, setQ] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked>(b0);
  const [busy, setBusy] = useState(false);
  const top = list[0];
  const sample = top ?? null;

  const set = (key: keyof Prefs, v: string, multi = false) => setPrefs((x) => {
    if (!multi) return { ...x, [key]: v } as Prefs;
    const cur = x[key] as string[];
    return { ...x, [key]: cur.includes(v) ? cur.filter((y) => y !== v) : [...cur, v] } as Prefs;
  });
  const run = async () => {
    if (!prefs.needs.length) return toast("Choose at least one thing you need help with");
    if (!prefs.avail.length) return toast("Choose when you are free");
    setBusy(true);
    const r = await saveMatchPrefs(prefs);
    setBusy(false);
    if (r.error) return toast(r.error);
    setStep("results");
    setPick(null);
    router.refresh();
    setTimeout(() => document.getElementById("mmform")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const book = async (m: Match, slot: string) => {
    setBooked((x) => ({ ...x, [m.id]: { slot, feedback: null } }));
    setPick(null);
    const r = await bookMatch(m.id, slot);
    if (r.error) {
      setBooked((x) => { const y = { ...x }; delete y[m.id]; return y; });
      return toast(r.error);
    }
    toast(`Booked with ${m.name}`);
  };
  const skip = async (m: Match) => {
    const r = await skipMatch(m.id);
    if (r.error) return toast(r.error);
    toast("Skipped. Here is your next match.");
    router.refresh();
  };
  const fb = async (m: Match, v: "up" | "down") => {
    setBooked((x) => ({ ...x, [m.id]: { ...x[m.id], feedback: v } }));
    await matchFeedback(m.id, v);
    toast("Thanks for the feedback");
  };

  const bookedBox = (m: Match) => {
    const b = booked[m.id];
    return (
      <>
        <div className="booked"><strong>Introduction booked.</strong> {b.slot}. {m.name.split(" ")[0]} has been told in the Hub; send a message to agree the video link.</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link className="btn sm ghost" href={`/messages?with=${m.id}&text=${encodeURIComponent(`Hi ${m.name.split(" ")[0]}, the Hub matched us. ${m.why[0] ?? "We have a lot in common"}. Our 20-minute call is booked for ${b.slot}. Here is a video link: `)}`}><Ic n="msg" s={14} />Open messages</Link>
          {b.feedback ? <span className="muted small">Thanks. Your feedback improves future matches.</span> : (
            <>
              <span className="small">After the call, was it useful?</span>
              <button type="button" className="act" aria-pressed="false" onClick={() => fb(m, "up")}><span aria-hidden="true">👍</span>Yes</button>
              <button type="button" className="act" aria-pressed="false" onClick={() => fb(m, "down")}><span aria-hidden="true">👎</span>Not really</button>
            </>
          )}
        </div>
      </>
    );
  };
  const slots = (m: Match) => (
    <div className="mslots">{slotsFor(m.both).map((s) => <button key={s} type="button" className="mslot" onClick={() => book(m, s)}><Ic n="cal" s={14} />{s}</button>)}</div>
  );
  const tile = (key: keyof Prefs, v: string, icon: string, title: string, sub: string, multi = false) => {
    const on = multi ? (prefs[key] as string[]).includes(v) : prefs[key] === v;
    return (
      <button key={v} type="button" className="mtile" aria-pressed={on} onClick={() => set(key, v, multi)}>
        {icon && <span className="mti"><Ic n={icon} s={18} /></span>}
        <span className="stack" style={{ gap: 2, textAlign: "left" }}><strong>{title}</strong>{sub && <span className="muted small">{sub}</span>}</span>
        <span className="mtick" aria-hidden="true">✓</span>
      </button>
    );
  };
  const provName = me?.province === "ON" ? "Ontario" : me?.province || "your province";

  return (
    <>
      <section className="mmhero">
        <div className="mmh-l">
          <p className="eyebrow">AI matchmaking · {round.name} round</p>
          <h1>Meet the <span className="hl">right owner</span>, not just more owners</h1>
          <p className="lead">Answer five quick questions. The Hub finds members who can help, picks a time you are both free and tells them about the introduction.</p>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            {visitor ? <Link className="btn" href="/auth/sign-up">Join free to get matched</Link>
              : <button type="button" className="btn" onClick={() => { setStep("form"); setQ(0); setTimeout(() => document.getElementById("mmform")?.scrollIntoView({ behavior: "smooth" }), 30); }}><Ic n="spark" />{step === "results" ? "Change my answers" : "Start my 2-minute form"}</button>}
            <span className="pill on">Free on every plan</span>
          </div>
        </div>
        <div className="mmh-r" aria-hidden="true">
          <div className="mviz">
            <div className="mpair">
              <div className="mp"><ZipAv name={me?.name ?? "You"} src={me?.avatar ?? null} size="l" /><strong>You</strong><span className="muted small">{me?.biz ?? ""}</span></div>
              <div className="mline"><Ring score={sample?.score ?? 92} /></div>
              <div className="mp"><ZipAv name={sample?.name ?? "Sara Haddad"} src={sample?.avatar ?? null} size="l" /><strong>{(sample?.name ?? "Sara Haddad").split(" ")[0]}</strong><span className="muted small">{sample?.role ?? "Clearwater Bookkeeping"}</span></div>
            </div>
            <Why why={sample?.why.slice(0, 3) ?? ["Can help you with bookkeeping", "Is an SMB Advisor", "Free on weekday mornings, like you"]} />
            <div className="mbook"><Ic n="cal" s={15} /><span className="grow">20-minute call · {slotsFor(sample?.both ?? ["Weekday mornings"])[0]}</span><span className="pill">{sample ? "Your top match" : "Example"}</span></div>
          </div>
        </div>
      </section>
      <ol className="mmsteps2">
        {[["1", "Tell us your goal", "Five quick questions, two minutes."], ["2", "Get matched", "By need, skills, place and free time."], ["3", "Meet", "Pick a time and the Hub tells them."], ["4", "Rate it", "Your feedback makes the next match better."]].map(([n, t, s]) => (
          <li key={n}><span className="mn">{n}</span><span className="stack" style={{ gap: 2 }}><strong>{t}</strong><span className="muted small">{s}</span></span></li>
        ))}
      </ol>
      {!visitor && (
        <div className="cols" id="mmform">
          <section className="mid">
            {step === "form" ? (
              <div className="card mwiz">
                <div className="row" style={{ flexWrap: "wrap" }}><span className="eyebrow grow">Question {q + 1} of 5 · {MMQ[q]}</span><span className="tag ai">AI</span></div>
                <div className="mprog" role="img" aria-label={`Question ${q + 1} of 5`}>{MMQ.map((t, i) => <i key={t} className={i <= q ? "on" : ""} />)}</div>
                {q === 0 && <><h2 className="mqh">What do you want from this round?</h2><div className="mtiles">{GOALS.map(([k]) => tile("goal", k, MMGI[k][0], MMGI[k][1], MMGI[k][2]))}</div></>}
                {q === 1 && (
                  <>
                    <h2 className="mqh">What do you need help with?</h2>
                    <p className="muted">Choose any that apply. We match you with members who can help.</p>
                    <div className="chips">{[...NEEDS, ...prefs.needs.filter((n) => !NEEDS.includes(n))].map((n) => <button key={n} type="button" className="chip" aria-pressed={prefs.needs.includes(n)} onClick={() => set("needs", n, true)}>{n}</button>)}</div>
                    <AddNeed onAdd={(n) => setPrefs((x) => (x.needs.includes(n) ? x : { ...x, needs: [...x.needs, n] }))} />
                  </>
                )}
                {q === 2 && (
                  <>
                    <h2 className="mqh">Who would you like to meet?</h2>
                    <div className="mtiles two">{tile("where", "near", "home", "Near me", `Owners in ${provName} first.`)}{tile("where", "any", "grid", "Anywhere in Canada", "The best match, wherever they are.")}</div>
                    <div className="mtiles two">{tile("format", "one", "users", "One-to-one", "A 20-minute video call with one owner.")}{tile("format", "group", "users", "Small group of 3 or 4", "A 45-minute call hosted by the Hub team.")}</div>
                  </>
                )}
                {q === 3 && (
                  <>
                    <h2 className="mqh">When are you free for a 20-minute call?</h2>
                    <p className="muted">Pick any that work. We only suggest times you both have free.</p>
                    <div className="mtiles three">{AVAIL.map(([k, sub]) => tile("avail", k, "clock", k, sub, true))}</div>
                  </>
                )}
                {q === 4 && (
                  <>
                    <h2 className="mqh">Ready to find your matches?</h2>
                    <div className="mrev">
                      {([["Goal", MMGI[prefs.goal][1], 0], ["I need help with", prefs.needs.join(", ") || "Nothing chosen", 1], ["Who", `${prefs.where === "near" ? "Near me" : "Anywhere in Canada"}, ${prefs.format === "group" ? "small group" : "one-to-one"}`, 2], ["Free", prefs.avail.join(", ") || "Nothing chosen", 3]] as [string, string, number][]).map(([l, v, k]) => (
                        <div key={l}><span className="muted small">{l}</span><strong>{v}</strong><button type="button" className="linkbtn small" onClick={() => setQ(k)}>Change</button></div>
                      ))}
                    </div>
                    <div className="stack" style={{ gap: 6 }}>
                      <span className="small"><strong>What you can offer other owners</strong></span>
                      <div className="chips">{(me?.helps ?? []).map((t) => <span key={t} className="tag offer">{t}</span>)}<Link className="linkbtn small" href="/profile/edit">{me?.helps.length ? "Edit" : "Add what you can help with"}</Link></div>
                    </div>
                  </>
                )}
                <div className="row mnav">
                  {q ? <button type="button" className="btn ghost" onClick={() => setQ(q - 1)}><Ic n="left" s={15} />Back</button> : <span />}
                  <span className="grow" />
                  {q < 4 ? <button type="button" className="btn" onClick={() => setQ(q + 1)}>Next<Ic n="right" s={15} /></button>
                    : <button type="button" className="btn" disabled={busy} onClick={run}><Ic n="spark" />Find my matches</button>}
                </div>
              </div>
            ) : (
              <>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <div className="stack grow" style={{ gap: 2 }}>
                    <h2 style={{ font: "800 22px var(--display)" }}>{prefs.format === "group" ? "Your peer circle" : "Your matches this round"}</h2>
                    <span className="muted small">Matched on {MMGI[prefs.goal][1].toLowerCase()}{prefs.needs.length ? `, ${prefs.needs.join(", ").toLowerCase()}` : ""}.</span>
                  </div>
                  <button type="button" className="btn sm ghost" onClick={() => { setStep("form"); setQ(0); }}>Change my answers</button>
                </div>
                {!list.length ? (
                  <div className="card"><strong>No strong match yet.</strong><p className="muted">Add more needs or allow matches anywhere in Canada, then try again. New members join every day.</p></div>
                ) : prefs.format === "group" ? (
                  <div className="card match mtop" style={{ flexDirection: "column" }}>
                    <div className="row">
                      <div className="faces">{list.slice(0, 3).map((x) => <ZipAv key={x.id} name={x.name} src={x.avatar} />)}</div>
                      <div className="stack grow"><strong style={{ font: "800 18px var(--display)" }}>{list.slice(0, 3).map((x) => x.name.split(" ")[0]).join(", ")} and you</strong><span className="muted small">A 45-minute group call, hosted by the Hub team</span></div>
                    </div>
                    <ul className="mwhy">{list.slice(0, 3).map((x) => <li key={x.id}><span className="mck">✓</span><span><strong>{x.name}:</strong> {x.why[0].charAt(0).toLowerCase() + x.why[0].slice(1)}</span></li>)}</ul>
                    <p className="muted small">The Hub team sets up circles at the start of each week and sends everyone the time and link.</p>
                  </div>
                ) : (
                  <>
                    <div className="card mtop">
                      <div className="mtop-l">
                        <span className="eyebrow">Your best match</span>
                        <div className="row" style={{ alignItems: "center", gap: 14 }}>
                          <ZipAv name={top.name} src={top.avatar} size="l" />
                          <div className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                            <span style={{ font: "800 20px var(--display)" }}><Link className="namebtn" href={`/members/${top.id}`}>{top.name}</Link></span>
                            <span>{top.role}</span>
                            <span className="muted small">{top.city}{top.plan === "advisor" ? " · SMB Advisor" : ""}</span>
                          </div>
                        </div>
                        <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Why this match <span className="tag ai">AI</span></span><Why why={top.why} /></div>
                      </div>
                      <div className="mtop-r">
                        <Ring score={top.score} big />
                        {booked[top.id] ? bookedBox(top) : (
                          <div className="stack" style={{ gap: 8, width: "100%" }}>
                            <span className="small"><strong>Pick a time for a 20-minute call</strong></span>
                            {slots(top)}
                            <button type="button" className="linkbtn small" style={{ alignSelf: "center" }} onClick={() => skip(top)}>Not now, show me someone else</button>
                          </div>
                        )}
                      </div>
                    </div>
                    {list.length > 1 && (
                      <>
                        <h3 style={{ font: "700 15px var(--display)", marginTop: 4 }}>More good matches</h3>
                        <div className="mgrid">
                          {list.slice(1, 4).map((m) => (
                            <div key={m.id} className="card match mcard2">
                              <div className="row" style={{ alignItems: "flex-start" }}>
                                <ZipAv name={m.name} src={m.avatar} />
                                <div className="stack grow" style={{ gap: 2, minWidth: 0 }}><Link className="namebtn" href={`/members/${m.id}`}>{m.name}</Link><span className="muted small">{m.role}</span><span className="muted small">{m.city}</span></div>
                                <Ring score={m.score} />
                              </div>
                              <Why why={m.why} n={2} />
                              {booked[m.id] ? bookedBox(m) : pick === m.id ? (
                                <div className="stack" style={{ gap: 8 }}><span className="small"><strong>Pick a time</strong></span>{slots(m)}<button type="button" className="linkbtn small" onClick={() => setPick(null)}>Cancel</button></div>
                              ) : (
                                <div className="row" style={{ marginTop: "auto", flexWrap: "wrap" }}>
                                  <button type="button" className="btn sm" onClick={() => setPick(m.id)}>Accept introduction</button>
                                  <button type="button" className="btn sm ghost" onClick={() => skip(m)}>Not now</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
                <p className="muted small">Scores come from what you need, what members can help with, where they are, when you are both free and their plan. Your feedback after each call improves future matches.</p>
              </>
            )}
          </section>
          <aside className="rail">
            <div className="card">
              <h2>Your round</h2>
              <div className="list">
                <div className="row"><span className="grow small">Introductions booked</span><strong>{Object.keys(booked).length}</strong></div>
                <div className="row"><span className="grow small">Round closes</span><strong>{round.closes}</strong></div>
                <div className="row"><span className="grow small">Next round opens</span><strong>{round.opens}</strong></div>
              </div>
              <p className="muted small">No limit on introductions. Book as many as you will actually show up for.</p>
            </div>
            <div className="card">
              <h2>Before your call</h2>
              <ol className="mtips">
                <li>Read their profile and recommendations.</li>
                <li>Open with what you need in one sentence.</li>
                <li>End by agreeing one next step, even a small one.</li>
              </ol>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function AddNeed({ onAdd }: { onAdd: (n: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (t.length > 1) { onAdd(t.slice(0, 40)); setV(""); } }}>
      <label className="sr" htmlFor="mmadd">Something else you need</label>
      <input id="mmadd" className="field grow" maxLength={40} value={v} onChange={(e) => setV(e.target.value)} placeholder="Something else, such as grant writing" />
      <button type="submit" className="btn sm ghost">Add</button>
    </form>
  );
}
