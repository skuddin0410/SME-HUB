"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { voteHelp } from "@/app/(hub)/help-actions";
import type { HelpHit } from "@/lib/help";

const QKEY = "smehub.help.q";
const readQ = () => { try { return sessionStorage.getItem(QKEY) ?? ""; } catch { return ""; } };
const saveQ = (v: string) => { try { sessionStorage.setItem(QKEY, v); } catch {} };

export type TopicCard = { id: string; title: string; description: string; icon: string; n: number };
export type PopItem = { id: string; title: string; summary: string };

/** Links from the first Help Centre looked like /help#/a/<id>. The browser keeps that part to itself, so move them on. */
function useLegacyHash() {
  const router = useRouter();
  useEffect(() => {
    const m = /^#\/(?:a|c)\/([\w-]+)$/.exec(window.location.hash) ?? /^#hc-([\w-]+)$/.exec(window.location.hash);
    if (m) router.replace(`/help/${m[1]}`);
    const s = /^#\/search\/(.+)$/.exec(window.location.hash);
    if (s) router.replace(`/help?q=${s[1]}`);
  }, [router]);
}

/** The search box (hcSearchBox). Typing on a topic or article page jumps to the results on Help home. */
export function HcSearchBox({ big, value, onChange }: { big?: boolean; value?: string; onChange?: (v: string) => void }) {
  const router = useRouter();
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? (onChange ? "" : readQ())), [value, onChange]);
  return (
    <div className={`hcsearch${big ? " big" : ""}`} role="search">
      <Ic n="search" s={18} />
      <label className="sr" htmlFor={big ? "hcq" : "hcq2"}>Search help articles</label>
      <input
        id={big ? "hcq" : "hcq2"} type="search" autoComplete="off" value={v}
        placeholder="Search help, for example: reset password, add my business"
        onChange={(e) => {
          setV(e.target.value);
          if (onChange) onChange(e.target.value);
          else {
            saveQ(e.target.value);
            if (e.target.value.trim()) router.push(`/help?q=${encodeURIComponent(e.target.value)}&focus=1`);
          }
        }}
      />
    </div>
  );
}

function Item({ a }: { a: HelpHit }) {
  return (
    <Link className="hcitem" href={`/help/${a.id}`}>
      <span className="hcitem-t">{a.title}</span>
      <span className="small muted">{a.summary}</span>
      <span className="hcitem-c small">{a.topic}</span>
    </Link>
  );
}
export const HcList = ({ items }: { items: HelpHit[] }) => <div className="hclist">{items.map((a) => <Item key={a.id} a={a} />)}</div>;

export function HcContact() {
  return (
    <section className="card hccontact">
      <span className="sq big"><Ic n="msg" s={22} /></span>
      <div className="stack grow" style={{ gap: 3 }}>
        <strong>Still need help?</strong>
        <span className="muted small">Email support@smehub.ca or send us a message. A person on the Hub team replies within one working day.</span>
      </div>
      <Link className="btn" href="/contact">Contact us</Link>
    </section>
  );
}

export function HcTopics({ topics }: { topics: TopicCard[] }) {
  return (
    <section className="hcsec">
      <h2>Browse by topic</h2>
      <div className="hctopics">
        {topics.map((c) => (
          <Link key={c.id} className="card hctopic" href={`/help/${c.id}`}>
            <span className="sq"><Ic n={c.icon} s={20} /></span>
            <span className="stack" style={{ gap: 3, minWidth: 0 }}>
              <b>{c.title}</b>
              <span className="small muted">{c.description}</span>
              <span className="small hctopic-n">{c.n} articles</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Help home (hcHome, Update 8 "support desk"): banner with search and popular searches, topics beside the most asked questions, three help boxes. */
export function HelpHome({ popular, topics, chips, q0, hits0 }: { popular: PopItem[]; topics: TopicCard[]; chips: string[]; q0: string; hits0: HelpHit[] }) {
  useLegacyHash();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(q0);
  const [hits, setHits] = useState(hits0);
  const seq = useRef(0);
  useEffect(() => saveQ(q0), [q0]);
  useEffect(() => {
    if (sp.get("focus")) {
      const x = document.getElementById("hcq") as HTMLInputElement | null;
      x?.focus();
      x?.setSelectionRange(x.value.length, x.value.length);
    }
  }, [sp]);
  const change = (v: string) => {
    setQ(v);
    saveQ(v);
    const n = ++seq.current;
    window.history.replaceState(null, "", v.trim() ? `${path}?q=${encodeURIComponent(v)}` : path);
    if (!v.trim()) return setHits([]);
    fetch(`/api/help-search?q=${encodeURIComponent(v)}`).then((r) => r.json() as Promise<HelpHit[]>).then((r) => { if (n === seq.current) setHits(r); }).catch(() => {});
  };
  const t = q.trim();
  return (
    <>
      <section className="axhero">
        <div className="axin">
          <p className="axeye">SME Hub Help Centre</p>
          <h1>Hi, how can we help you today?</h1>
          <HcSearchBox big value={q} onChange={change} />
          {chips.length > 0 && (
            <div className="axchips">
              <span>Popular searches:</span>
              {chips.map((c) => <button key={c} type="button" className="axchip" onClick={() => change(c)}>{c}</button>)}
            </div>
          )}
        </div>
      </section>
      {t ? (
        <section className="hcsec">
          <h2 aria-live="polite">{hits.length} result{hits.length === 1 ? "" : "s"} for “{t}”</h2>
          {hits.length ? (
            <HcList items={hits} />
          ) : (
            <div className="card hcnone">
              <strong>No answers found.</strong>
              <span className="muted">Try other words, or browse the topics. You can also <Link href="/contact">contact the team</Link>.</span>
              <button type="button" className="btn sm ghost" onClick={() => change("")}>Clear search</button>
            </div>
          )}
        </section>
      ) : (
        <div className="axcols">
          <aside className="card axtopics">
            <h2>Topics</h2>
            <ul>
              {topics.map((c) => (
                <li key={c.id}>
                  <Link href={`/help/${c.id}`}>
                    <span className="axic"><Ic n={c.icon} s={20} /></span>
                    <span className="grow">{c.title}</span>
                    <span className="axn">{c.n}<span className="sr"> articles</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
          <div className="stack" style={{ gap: 16, minWidth: 0 }}>
            <section className="card axpop">
              <h2>Most asked questions</h2>
              {popular.map((a, i) => (
                <details key={a.id} open={i === 0}>
                  <summary>{a.title}</summary>
                  <p className="muted">{a.summary}</p>
                  <Link className="small" href={`/help/${a.id}`}>Read the full answer →</Link>
                </details>
              ))}
            </section>
            <div className="axhelp">
              <div className="card axbox ai">
                <span className="axbig"><Ic n="spark" s={22} /></span>
                <b>Ask the Hub AI</b>
                <span className="small muted">Get an instant answer in plain language.</span>
                <Link className="btn sm" href="/ask" prefetch={false}>Ask a question</Link>
              </div>
              <div className="card axbox">
                <span className="axbig"><Ic n="mail" s={22} /></span>
                <b>Email the team</b>
                <span className="small muted">support@smehub.ca · reply within 1 working day</span>
                <Link className="btn sm ghost" href="/contact">Contact us</Link>
              </div>
              <div className="card axbox">
                <span className="axbig"><Ic n="shield" s={22} /></span>
                <b>Safety and rules</b>
                <span className="small muted">Report a problem or read the community guidelines.</span>
                <Link className="btn sm ghost" href="/help/safety">Go to safety</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** The article text, with screenshots that open bigger when selected (hczoom). */
export function HcBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ src: string; alt: string; opener: HTMLElement } | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const click = (e: MouseEvent) => {
      const z = (e.target as HTMLElement).closest<HTMLElement>(".zoom");
      if (!z) return;
      e.preventDefault();
      setZoom({ src: z.getAttribute("data-zoom")!, alt: z.querySelector("img")?.alt ?? "", opener: z });
    };
    root.addEventListener("click", click);
    return () => root.removeEventListener("click", click);
  }, [html]);
  useEffect(() => {
    if (!zoom) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const close = () => { zoom.opener.focus(); setZoom(null); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [zoom]);
  const close = () => { zoom?.opener.focus(); setZoom(null); };
  return (
    <>
      <div ref={ref} className="hcbody" dangerouslySetInnerHTML={{ __html: html }} />
      {zoom && (
        <div className="overlay" onClick={close}>
          <div className="modal hczoom" role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.src} alt={zoom.alt} />
            <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span className="small muted">{zoom.alt}</span>
              <button type="button" className="btn sm" onClick={close} autoFocus>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** "Was this helpful?" The answer is saved for the team (help_feedback). */
export function HcFeedback({ id }: { id: string }) {
  const [fb, setFb] = useState<"y" | "n" | null>(null);
  const pick = (v: "y" | "n") => {
    setFb(v);
    void voteHelp(id, v === "y");
  };
  return (
    <div className="hcfb" aria-live="polite">
      {fb ? (
        <span className="small">{fb === "y" ? "Thanks for letting us know." : <>Thanks. We’ll use this to improve the article. Need help now? <Link href="/contact">Contact us</Link>.</>}</span>
      ) : (
        <>
          <span className="small"><b>Was this helpful?</b></span>
          <button type="button" className="btn sm ghost" onClick={() => pick("y")}>Yes</button>
          <button type="button" className="btn sm ghost" onClick={() => pick("n")}>No</button>
        </>
      )}
    </div>
  );
}

/** On a topic page, a way back to the last search (hcTopic). */
export function HcSearchLink() {
  const [q, setQ] = useState("");
  useEffect(() => setQ(readQ()), []);
  if (!q.trim()) return null;
  return <p className="small"><Link href={`/help?q=${encodeURIComponent(q)}`}>See search results for “{q}”</Link></p>;
}
