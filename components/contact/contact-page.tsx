"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Ic } from "@/components/zip/ic";
import { sendContact } from "@/app/contact-actions";
import { CTOPICS } from "@/lib/contact";
import { HumanCheck } from "@/components/safety/human-check";

/** Update 24: the Contact us page, as in the zip (form, who to contact, phone and office, safety note). */
export function ContactPage({ name: myName, human = false }: { name: string; human?: boolean }) {
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const [f, setF] = useState({ name: myName, email: "", business: "", topic: "", message: "", website: "" });
  const [err, setErr] = useState("");
  const [sent, setSent] = useState("");
  const [busy, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const send = () => {
    const name = f.name.trim(), email = f.email.trim(), message = f.message.trim();
    const local = !name ? "Please add your name." : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? "Please add an email address we can reply to." : !f.topic ? "Please choose what your message is about." : message.length < 5 ? "Please write a short message." : "";
    if (local) return setErr(local);
    setErr("");
    start(async () => {
      const r = await sendContact({ ...f, name, email, message, human: token });
      setRound((x) => x + 1);
      if (r.error) return setErr(r.error);
      setSent(email);
      setF((x) => ({ ...x, message: "" }));
    });
  };
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="xct">
        <nav className="crumbs small" aria-label="Breadcrumb"><Link href="/feed">Home</Link> / Contact us</nav>
        <section className="xcthero">
          <p className="pgkick2">Contact us</p>
          <h1>We’re here to help</h1>
          <p>Questions about your account, a membership plan, your business listing or working with CanadianSME? Send us a message, email or call. A real person on our Mississauga team answers every message.</p>
        </section>
        <div className="xctquick">
          <a href="mailto:support@smehub.ca"><Ic n="mail" s={20} /><span><b>Email support</b><small>support@smehub.ca</small></span></a>
          <a href="tel:+14377784446"><Ic n="msg" s={20} /><span><b>Call us</b><small>+1 437 778 4446</small></span></a>
          <Link href="/help"><Ic n="help" s={20} /><span><b>Quick answers</b><small>Help and FAQs</small></span></Link>
        </div>
        <div className="xctmain">
          <section className="xctcard">
            <h2>Send us a message</h2>
            {sent ? (
              <div className="xctok" role="status">
                <Ic n="check" s={26} />
                <h2>Thanks, your message is on its way</h2>
                <p>We answer every message, usually within one business day. We’ll reply to <b>{sent}</b>.</p>
                <button type="button" className="btn ghost" onClick={() => setSent("")}>Send another message</button>
              </div>
            ) : (
              <form className="xctform" noValidate onSubmit={(e) => { e.preventDefault(); send(); }}>
                <div className="xct2">
                  <label><span>Your name</span><input className="field" autoComplete="name" value={f.name} onChange={set("name")} /></label>
                  <label><span>Your email</span><input className="field" type="email" autoComplete="email" value={f.email} onChange={set("email")} placeholder="you@yourbusiness.ca" /></label>
                </div>
                <label><span>Business name <em>(optional)</em></span><input className="field" autoComplete="organization" value={f.business} onChange={set("business")} /></label>
                <label><span>What is it about?</span>
                  <select className="field" value={f.topic} onChange={set("topic")}>
                    <option value="">Choose a topic</option>
                    {CTOPICS.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}
                    <option value="other">Something else</option>
                  </select>
                </label>
                <label><span>Your message</span><textarea className="field" rows={6} placeholder="How can we help?" value={f.message} onChange={set("message")} /></label>
                {/* hidden from people; only bots fill it in */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set("website")} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
                <HumanCheck on={human} round={round} onToken={setToken} />
                {err && <p className="xcterr" role="alert">{err}</p>}
                <div className="xctsend"><button type="submit" className="btn" disabled={busy}><Ic n="send" s={16} />Send message</button><span className="small muted">We reply within one business day.</span></div>
              </form>
            )}
          </section>
          <aside className="xctside">
            <div className="xctcard"><h3>Who to contact</h3><ul className="xcttopics">{CTOPICS.map((t) => <li key={t[0]}><Ic n={t[3]} s={16} /><span><b>{t[1]}</b><a href={`mailto:${t[2]}`}>{t[2]}</a></span></li>)}<li><Ic n="hand" s={16} /><span><b>Accessibility help or a discrimination concern</b><a href="mailto:support@smehub.ca">support@smehub.ca</a></span></li></ul></div>
            <div className="xctcard">
              <h3>Phone</h3><p><a href="tel:+14377784446">+1 437 778 4446</a><br /><a href="tel:+14166550205">+1 416 655 0205</a></p>
              <p className="small muted">Need help taking part, or a document in another format? Call <a href="tel:+14166550205">416-655-0205</a>. See <Link href="/policies/accessibility">Accessibility</Link>.</p>
              <h3>Office</h3><p>Cmarketing Inc.<br />6345 Dixie Rd, Unit 202<br />Mississauga, ON L5T 2E6</p>
              <a className="xctdir" href="https://www.google.com/maps/search/?api=1&query=6345+Dixie+Rd+Unit+202+Mississauga+ON+L5T+2E6" target="_blank" rel="noopener"><Ic n="pin" s={15} />Get directions</a>
            </div>
            <div className="xctcard xctsafe"><Ic n="shield" s={18} /><p><b>See something unsafe?</b> Use <b>Report</b> on any post, message or profile and our team will review it quickly.</p></div>
          </aside>
        </div>
      </div>
    </div></div>
  );
}
