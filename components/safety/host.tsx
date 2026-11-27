"use client";

import { useEffect, useRef, useState } from "react";
import { checkLink, myTrustedSites, myWelcomeWeek, trustSite, type LinkVerdict, type WelcomeWeek } from "@/app/(hub)/safety-actions";
import { SAFETY_EVENT, type SafetyStop } from "@/lib/safety/client";
import { Ic } from "@/components/zip/ic";

/**
 * Update 41, for members: the "This unlocks soon" window (a welcome-week or daily limit), the "Your welcome week"
 * window, and the "You're leaving SME Hub" screen before any link to another site.
 */

export const WHY_EVENT = "hub:safety-why";
const OWN = /(^|\.)smehub\.ca$|(^|\.)canadiansme\.ca$/;
const domainOf = (u: string) => String(u || "").toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];

type Modal = { type: "stop"; stop: SafetyStop; week: WelcomeWeek } | { type: "link"; url: string; v: LinkVerdict | null } | null;

export function SafetyHost({ leave, member }: { leave: boolean; member: boolean }) {
  const [modal, setModal] = useState<Modal>(null);
  const trusted = useRef<Set<string>>(new Set());
  const box = useRef<HTMLInputElement>(null);
  const focusBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (member) myTrustedSites().then((l) => { trusted.current = new Set(l); }).catch(() => {});
  }, [member]);

  useEffect(() => {
    const open = (stop: SafetyStop) => {
      setModal({ type: "stop", stop, week: null });
      if (stop.week) myWelcomeWeek().then((w) => setModal((m) => (m?.type === "stop" && m.stop === stop ? { ...m, week: w } : m))).catch(() => {});
    };
    const onStop = (e: Event) => open((e as CustomEvent<SafetyStop>).detail);
    const onWhy = () => open({ title: "Your welcome week", text: "Every new member gets one. It stops spam accounts from posting links and messaging everyone the minute they join.", week: true });
    window.addEventListener(SAFETY_EVENT, onStop);
    window.addEventListener(WHY_EVENT, onWhy);
    return () => {
      window.removeEventListener(SAFETY_EVENT, onStop);
      window.removeEventListener(WHY_EVENT, onWhy);
    };
  }, []);

  // every link to another site goes through the leaving screen first (unless the member trusted that site)
  useEffect(() => {
    if (!leave) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button > 1) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("data-sfok") || a.closest("[data-sfok]")) return;
      const href = a.getAttribute("href") ?? "";
      if (!/^https?:\/\//i.test(href)) return;
      const d = domainOf(href);
      if (!d || OWN.test(d) || d === location.hostname.replace(/^www\./, "")) return;
      if (trusted.current.has(d)) return;
      e.preventDefault();
      e.stopPropagation();
      setModal({ type: "link", url: href, v: null });
      checkLink(href)
        .then((v) => setModal((m) => (m?.type === "link" && m.url === href ? { ...m, v } : m)))
        .catch(() => setModal((m) => (m?.type === "link" && m.url === href ? { ...m, v: { domain: d, blocked: false, why: "", lookalike: false, trusted: false } } : m)));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [leave]);

  useEffect(() => {
    if (!modal) return;
    const t = window.setTimeout(() => focusBtn.current?.focus(), 30);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", esc);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", esc); };
  }, [modal?.type, modal && modal.type === "link" ? modal.v : null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!modal) return null;
  const close = () => setModal(null);

  let body: React.ReactNode;
  if (modal.type === "stop") {
    const { stop, week } = modal;
    const d = week?.left ?? 0;
    body = (
      <div className="sfnm">
        <span className="sfnmi"><Ic n="spark" s={22} /></span>
        <h2 id="mt">{stop.title}</h2>
        <p>{stop.text}</p>
        {stop.week && week && (
          <>
            <div className="sfnl">
              <p className="sffl">During your welcome week</p>
              <ul>
                <li><Ic n="x" s={13} />No links in posts, comments or messages</li>
                <li><Ic n="x" s={13} />No new groups, offers or businesses for sale</li>
                <li><Ic n="check" s={13} />Up to {week.conn_day} connection requests and {week.msgs_day} messages a day</li>
                <li><Ic n="check" s={13} />Everything else: posting, asking, commenting, events</li>
              </ul>
            </div>
            <p className="sfmut">
              {week.limited
                ? `This lasts ${d <= 1 ? "until tomorrow" : `${d} more days`}.`
                : d <= 1
                  ? "It all unlocks tomorrow."
                  : `It all unlocks in ${d} days, or after ${week.fast} days if you add a photo and make a connection.`}{" "}
              Spammers usually give up long before then, which keeps the Hub useful for you.
            </p>
          </>
        )}
        <div className="sfjf"><button ref={focusBtn} type="button" className="btn dark" onClick={close}>Got it</button></div>
      </div>
    );
  } else if (!modal.v) {
    body = (
      <div className="sfnm" aria-busy="true">
        <span className="sfnmi"><Ic n="link" s={22} /></span>
        <h2 id="mt">You’re leaving SME Hub</h2>
        <p className="sfmut">Checking this link…</p>
        <div className="sfjf"><button ref={focusBtn} type="button" className="btn ghost" onClick={close}>Stay on SME Hub</button></div>
      </div>
    );
  } else if (modal.v.blocked) {
    const v = modal.v;
    body = (
      <div className="sfnm">
        <span className="sfnmi bad"><Ic n="alert" s={22} /></span>
        <h2 id="mt">This link is blocked</h2>
        <p><b className="sfdom">{v.domain}</b></p>
        <p>
          {v.lookalike
            ? "This site pretends to be SME Hub. Our only website is smehub.ca, and we never ask for your password or a code in a message."
            : `This site is on a list of sites known for ${/phishing/i.test(v.why) ? "phishing (stealing passwords)" : "spam or scams"}.`}
        </p>
        <p className="sfmut sm">If someone sent you this, please report the message so we can stop it reaching others.</p>
        <div className="sfjf"><button ref={focusBtn} type="button" className="btn dark" onClick={close}>Go back to safety</button></div>
      </div>
    );
  } else {
    const { url } = modal;
    const d = modal.v.domain;
    body = (
      <div className="sfnm">
        <span className="sfnmi"><Ic n="link" s={22} /></span>
        <h2 id="mt">You’re leaving SME Hub</h2>
        <p>This link goes to:</p>
        <p className="sfdomw"><b className="sfdom">{d}</b><small>{url.length > 80 ? `${url.slice(0, 80)}…` : url}</small></p>
        <p className="sfok"><Ic n="check" s={14} />No known problems with this site. Still, never enter your SME Hub password on another site.</p>
        {member && (
          <label className="sfcb"><input ref={box} type="checkbox" id="sftrust" /> Don’t warn me again about {d}</label>
        )}
        <div className="sfjf">
          <button type="button" className="btn ghost" onClick={close}>Stay on SME Hub</button>
          <button
            ref={focusBtn}
            type="button"
            className="btn dark"
            onClick={() => {
              if (box.current?.checked) {
                trusted.current.add(d);
                trustSite(url).catch(() => {});
              }
              close();
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Continue to site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="zip" style={{ display: "contents" }}>
      <div className="overlay" onClick={close}>
        <div className="modal sfmodal" role="dialog" aria-modal="true" aria-labelledby="mt" onClick={(e) => e.stopPropagation()}>
          {body}
        </div>
      </div>
    </div>
  );
}
