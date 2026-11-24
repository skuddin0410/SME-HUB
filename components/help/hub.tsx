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
export type PopItem = { id: string; title: string };

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

/** Help home (hcHome): results update as you type; with no search, popular questions and the topics. */
export function HelpHome({ count, popular, topics, q0, hits0 }: { count: number; popular: PopItem[]; topics: TopicCard[]; q0: string; hits0: HelpHit[] }) {
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
      <section className="hchero">
        <p className="eyebrow">Help Centre</p>
        <h1>How can we help?</h1>
        <p className="muted">{count} step-by-step answers with screenshots.</p>
        <HcSearchBox big value={q} onChange={change} />
      </section>
      {t ? (
        <>
          <section className="hcsec">
            <h2 aria-live="polite">{hits.length} result{hits.length === 1 ? "" : "s"} for “{t}”</h2>
            {hits.length ? (
              <HcList items={hits} />
            ) : (
              <div className="card hcnone">
                <strong>No answers found.</strong>
                <span className="muted">Try other words, or browse the topics below. You can also <Link href="/contact">contact the team</Link>.</span>
                <button type="button" className="btn sm ghost" onClick={() => change("")}>Clear search</button>
              </div>
            )}
          </section>
          <HcTopics topics={topics} />
        </>
      ) : (
        <>
          <section className="hcsec">
            <h2>Popular questions</h2>
            <div className="hcpop">
              {popular.map((a) => <Link key={a.id} className="hcpopi" href={`/help/${a.id}`}><Ic n="help" s={16} /><span>{a.title}</span></Link>)}
            </div>
          </section>
          <HcTopics topics={topics} />
          <HcContact />
        </>
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
