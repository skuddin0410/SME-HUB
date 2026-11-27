"use client";

import { useMemo, useState, useTransition } from "react";
import { Ic } from "@/components/zip/ic";
import { remindLeadTomorrow, saveLeadContact, saveLeadNote, setLeadStatus } from "@/app/(hub)/lead-actions";
import type { Lead, LeadStatus } from "@/lib/leads";

/**
 * Update 30: My leads. Only people who contacted the member through SME Hub appear. Nothing is sent in the
 * member's name: the Hub suggests a message, and the member sends it from SME Hub, their email or their phone.
 */
const SRC: Record<Lead["source"], [string, string]> = {
  message: ["Message", "msg"],
  page: ["Business page", "store"],
  quote: ["Business page", "store"],
  request: ["Customer request", "home"],
  consult: ["Free consultation", "cal"],
  event: ["Event", "ticket"],
};
const ST: Record<LeadStatus, [string, string]> = { new: ["New", "due"], quoted: ["Quoted", "q"], won: ["Won", "paid"], lost: ["Lost", "lost"] };
const FILTERS = ["all", "new", "quoted", "won", "lost"] as const;
type Filter = (typeof FILTERS)[number];
const COLS = ["#2563EB", "#DB2777", "#0891B2", "#7C3AED", "#16A34A", "#EA580C", "#0F766E", "#B45309"];
const TZ = "America/Toronto";

const ymd = (t: number | string) => new Date(t).toLocaleDateString("en-CA", { timeZone: TZ });
const short = (t: string) => new Date(t).toLocaleDateString("en-CA", { timeZone: TZ, month: "short", day: "numeric" });
const name = (l: Lead) => l.contact?.full_name || "A member";
const first = (l: Lead) => name(l).split(" ")[0];
const initials = (n: string) => n.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
const colour = (id: string) => COLS[parseInt(id.replace(/-/g, "").slice(0, 6), 16) % COLS.length];

function when(t: string, now: number) {
  const d = Math.round((Date.parse(ymd(now)) - Date.parse(ymd(t))) / 864e5);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return short(t);
}
function dueLabel(t: string | null, now: number) {
  if (!t) return "";
  const d = Math.round((Date.parse(ymd(t)) - Date.parse(ymd(now))) / 864e5);
  if (d <= 0) return "today";
  if (d === 1) return "tomorrow";
  return short(t);
}
/** The next step and when, from the lead's status. */
function next(l: Lead, now: number): { verb: string; due: string } {
  if (l.status === "lost") return { verb: l.lost_reason || "No longer interested", due: "" };
  const due = dueLabel(l.follow_up_at, now);
  if (l.status === "won") return { verb: "Send thank-you", due };
  if (l.status === "quoted") return { verb: "Follow up", due };
  return { verb: l.replied_at ? "Follow up" : "Reply", due };
}
function draft(l: Lead, me: { first: string; business: string }) {
  const sign = [me.first, me.business].filter(Boolean).join(", ");
  const hi = `Hi ${first(l)}, `;
  const end = sign ? ` ${sign}` : "";
  switch (l.status) {
    case "quoted":
      return `${hi}just checking in on the quote I sent. Happy to walk through it or adjust anything. Would a quick call this week work?${end}`;
    case "won":
      return `${hi}thank you for choosing ${me.business || "us"}. I’ll be in touch shortly with next steps.${me.first ? ` ${me.first}` : ""}`;
    case "lost":
      return `${hi}thanks for considering us. If anything changes, we’d be happy to help in the future.${end}`;
    default:
      return `${hi}thanks for reaching out on SME Hub. I’d be happy to help. When’s a good time for a quick call?${end}`;
  }
}
function csv(leads: Lead[], now: number) {
  const rows = [["Name", "Location", "Came from", "What they need", "Status", "Next step", "Email", "Phone", "Notes", "First contact"]].concat(
    leads.map((l) => {
      const n = next(l, now);
      return [name(l), l.contact?.location ?? "", SRC[l.source][0], l.need ?? "", ST[l.status][0], `${n.verb}${n.due ? ` ${n.due}` : ""}`, l.contact_email ?? "", l.contact_phone ?? "", l.note ?? "", ymd(l.created_at)];
    }),
  );
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

function Avatar({ l, lg }: { l: Lead; lg?: boolean }) {
  const src = l.contact?.avatar_url;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`cuav${lg ? " lg" : ""}`} src={src} alt="" style={{ objectFit: "cover" }} />
  ) : (
    <span className={`cuav${lg ? " lg" : ""}`} style={{ background: colour(l.id) }} aria-hidden="true">{initials(name(l))}</span>
  );
}

export function LeadsView({ initial, me, now }: { initial: Lead[]; me: { first: string; business: string }; now: number }) {
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [selId, setSelId] = useState<string | null>(initial[0]?.id ?? null);
  const [editNote, setEditNote] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [askLost, setAskLost] = useState(false);
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [, start] = useTransition();

  const counts = useMemo(() => {
    const c = { all: leads.length, new: 0, quoted: 0, won: 0, lost: 0 } as Record<Filter, number>;
    leads.forEach((l) => c[l.status]++);
    return c;
  }, [leads]);
  const month = ymd(now).slice(0, 7);
  const thisMonth = leads.filter((l) => ymd(l.created_at).slice(0, 7) === month).length;
  const waiting = leads.filter((l) => l.status === "new" && !l.replied_at).length;
  const list = leads.filter((l) => filter === "all" || l.status === filter);
  const sel = leads.find((l) => l.id === selId) ?? list[0] ?? null;

  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((x) => (x === t ? "" : x)), 3500);
  };
  const patch = (id: string, p: Partial<Lead>, event?: string) =>
    setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, ...p, events: event ? [{ body: event, created_at: new Date().toISOString() }, ...l.events] : l.events } : l)));
  const run = (fn: () => Promise<{ error?: string }>, undo: Lead[], ok: string) =>
    start(async () => {
      const r = await fn().catch(() => ({ error: "Could not save that. Check your connection and try again." }));
      if (r.error) {
        setLeads(undo);
        say(r.error);
      } else say(ok);
    });

  const pickFilter = (f: Filter) => {
    setFilter(f);
    const l = leads.filter((x) => f === "all" || x.status === f);
    if (l.length && !l.some((x) => x.id === selId)) setSelId(l[0].id);
  };
  const choose = (id: string) => {
    setSelId(id);
    setEditNote(false);
    setEditContact(false);
    setAskLost(false);
  };
  const status = (s: LeadStatus, reason?: string) => {
    if (!sel || (sel.status === s && s !== "lost")) return;
    const undo = leads;
    const day = 864e5;
    const follow = s === "new" ? now + day : s === "quoted" ? now + 3 * day : s === "won" ? now : null;
    patch(sel.id, { status: s, lost_reason: s === "lost" ? reason || null : null, follow_up_at: follow ? new Date(follow).toISOString() : null }, `Marked as ${s}${s === "lost" && reason ? `: ${reason}` : ""}`);
    setAskLost(false);
    run(() => setLeadStatus(sel.id, s, reason), undo, `${name(sel)} marked as ${s}.`);
  };
  const later = () => {
    if (!sel) return;
    const undo = leads;
    patch(sel.id, { follow_up_at: new Date(now + 864e5).toISOString() });
    run(() => remindLeadTomorrow(sel.id), undo, `We’ll remind you about ${name(sel)} tomorrow.`);
  };
  const exportCsv = () => {
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["﻿" + csv(leads, now)], { type: "text/csv;charset=utf-8" }));
      a.download = "my-leads.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      say("Downloaded my-leads.csv");
    } catch {
      say("The download didn’t start. Try again.");
    }
  };

  const message = sel ? msgs[sel.id] ?? draft(sel, me) : "";
  const replyHref = sel
    ? sel.inquiry_id && sel.company
      ? `/businesses/mine/${sel.company.slug}/inbox`
      : `/messages?with=${sel.contact?.id ?? ""}&text=${encodeURIComponent(message)}`
    : "#";
  const n = sel ? next(sel, now) : null;

  return (
    <>
      <header className="smhero">
        <div>
          <p className="tdkick">My leads</p>
          <h1>Every enquiry from SME Hub, in one place</h1>
          <p>People who message you or contact you from your business page appear here automatically. Nothing to upload, and nothing is sent in your name.</p>
        </div>
        <div className="lsafe">
          <Ic n="shield" s={18} />
          <span><b>Only SME Hub enquiries</b><small>Your own customer list stays with you</small></span>
        </div>
      </header>

      <div className="tdstats">
        <div className="tdst"><span className="tdsi p"><Ic n="users" s={18} /></span><b>{thisMonth}</b><span>leads from SME Hub this month</span></div>
        <button type="button" className={`tdst${waiting ? " hot" : ""}`} onClick={() => pickFilter("new")}><span className="tdsi"><Ic n="msg" s={18} /></span><b>{waiting}</b><span>waiting for your reply</span></button>
        <button type="button" className="tdst" onClick={() => pickFilter("quoted")}><span className="tdsi a"><Ic n="doc" s={18} /></span><b>{counts.quoted}</b><span>quoted, waiting to hear back</span></button>
        <button type="button" className="tdst" onClick={() => pickFilter("won")}><span className="tdsi g"><Ic n="trophy" s={18} /></span><b>{counts.won} won</b><span>jobs you won from SME Hub leads</span></button>
      </div>

      <div className="cucols">
        <section className="tdcard" aria-label="Your leads">
          <div className="cutool">
            <div className="cufilt" role="group" aria-label="Show">
              {FILTERS.map((f) => (
                <button key={f} type="button" className={filter === f ? "on" : ""} aria-pressed={filter === f} onClick={() => pickFilter(f)}>
                  {f === "all" ? "All" : ST[f][0]} <span className="lcnt">{counts[f]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="lhead small" aria-hidden="true"><span /><span>Lead</span><span>Came from</span><span>When</span><span>Status</span><span>Next step</span></div>
          {list.length ? (
            list.map((l) => {
              const x = next(l, now);
              return (
                <button key={l.id} type="button" className={`lr${sel?.id === l.id ? " on" : ""}`} aria-pressed={sel?.id === l.id} onClick={() => choose(l.id)}>
                  <Avatar l={l} />
                  <span className="cun"><b>{name(l)}</b><small>{l.need || (l.source === "quote" ? "Asked for a quote" : l.contact?.location || "")}</small></span>
                  <span className="lsrc small"><Ic n={SRC[l.source][1]} s={13} />{SRC[l.source][0]}</span>
                  <span className="small muted">{when(l.created_at, now)}</span>
                  <span><em className={`smst ${ST[l.status][1]}`}>{ST[l.status][0]}</em></span>
                  <span className="small lnext">{l.status === "lost" ? <span className="muted">{x.verb}</span> : <><Ic n="clock" s={13} />{x.verb}{x.due ? ` ${x.due}` : ""}</>}</span>
                </button>
              );
            })
          ) : leads.length ? (
            <p className="muted" style={{ padding: "20px 8px" }}>No {filter} leads.</p>
          ) : (
            <div style={{ padding: "28px 8px", textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600 }}>No leads yet</p>
              <p className="small muted" style={{ margin: 0 }}>When someone messages you for the first time, or asks for a quote on your business page, they’ll appear here.</p>
            </div>
          )}
        </section>

        {sel && n ? (
          <aside className="tdcard cudet" aria-label="Lead details">
            <div className="cudh">
              <Avatar l={sel} lg />
              <div>
                <h2>{name(sel)}</h2>
                <small>
                  {[sel.contact?.location, `${SRC[sel.source][0]} on SME Hub`].filter(Boolean).join(" · ")}
                  {sel.company ? ` · ${sel.company.name}` : ""}
                </small>
              </div>
            </div>
            <div className="lstat" role="group" aria-label="Status">
              {(["new", "quoted", "won", "lost"] as LeadStatus[]).map((s) => (
                <button key={s} type="button" aria-pressed={sel.status === s} onClick={() => (s === "lost" && sel.status !== "lost" ? setAskLost(true) : status(s))}>
                  {ST[s][0]}
                </button>
              ))}
            </div>
            {askLost && (
              <form
                className="cunote"
                style={{ marginBottom: 12 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  status("lost", String(new FormData(e.currentTarget).get("why") ?? "").trim());
                }}
              >
                <label className="small" htmlFor="ldwhy"><b>Why was it lost?</b> (optional, only you see this)</label>
                <input id="ldwhy" name="why" className="field" maxLength={160} placeholder="Chose a cheaper quote" style={{ width: "100%", margin: "6px 0" }} autoFocus />
                <div className="row" style={{ gap: 6 }}>
                  <button type="submit" className="btn sm">Mark as lost</button>
                  <button type="button" className="btn sm ghost" onClick={() => setAskLost(false)}>Cancel</button>
                </div>
              </form>
            )}
            {sel.status === "lost" ? (
              <div className="cunote" style={{ marginBottom: 4 }}><b>Reason:</b> {sel.lost_reason || "No longer interested"}</div>
            ) : (
              <div className="lnudge">
                <div className="lnh"><Ic n="clock" s={15} /><b>{n.due ? `${n.due[0].toUpperCase()}${n.due.slice(1)}: ` : ""}{n.verb}</b></div>
                <label className="small muted" htmlFor="ldmsg" style={{ display: "block", margin: "2px 0 8px" }}>Ready-to-send message (you can edit it before sending):</label>
                <textarea id="ldmsg" className="lmsg ldmsgta" value={message} maxLength={2000} rows={4} onChange={(e) => setMsgs((m) => ({ ...m, [sel.id]: e.target.value }))} />
                <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  <a
                    className="btn sm"
                    href={replyHref}
                    onClick={() => {
                      if (sel.inquiry_id && sel.company) navigator.clipboard?.writeText(message).then(() => say("Message copied. Paste it into the reply.")).catch(() => {});
                    }}
                  >
                    <Ic n="msg" s={14} />Reply on SME Hub
                  </a>
                  {sel.contact_email ? (
                    <a className="btn sm ghost" href={`mailto:${sel.contact_email}?subject=${encodeURIComponent("Your enquiry on SME Hub")}&body=${encodeURIComponent(message)}`}>Open in my email</a>
                  ) : null}
                  {sel.contact_phone ? (
                    <a className="btn sm ghost" href={`sms:${sel.contact_phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(message)}`}>Open in my texts</a>
                  ) : null}
                  <button type="button" className="btn sm ghost" onClick={later}>Remind me tomorrow</button>
                </div>
                {!sel.contact_email && !sel.contact_phone && (
                  <p className="small muted" style={{ margin: "8px 0 0" }}>
                    Email and text appear once you add their email or phone below.
                  </p>
                )}
              </div>
            )}

            <div className="ldnh">
              <h3 className="cuh3">Their email and phone</h3>
              {!editContact && <button type="button" className="linkbtn small" onClick={() => setEditContact(true)}>{sel.contact_email || sel.contact_phone ? "Edit" : "Add"}</button>}
            </div>
            {editContact ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const em = String(f.get("em") ?? "").trim();
                  const ph = String(f.get("ph") ?? "").trim();
                  const undo = leads;
                  patch(sel.id, { contact_email: em || null, contact_phone: ph || null });
                  setEditContact(false);
                  run(() => saveLeadContact(sel.id, em, ph), undo, "Saved. Only you and your team see these.");
                }}
              >
                <label className="sr" htmlFor="ldem">Email</label>
                <input id="ldem" name="em" type="email" className="field" placeholder="Email they gave you" defaultValue={sel.contact_email ?? ""} maxLength={254} style={{ width: "100%", marginBottom: 6 }} />
                <label className="sr" htmlFor="ldph">Phone</label>
                <input id="ldph" name="ph" type="tel" className="field" placeholder="Phone they gave you" defaultValue={sel.contact_phone ?? ""} maxLength={20} style={{ width: "100%" }} />
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <button type="submit" className="btn sm">Save</button>
                  <button type="button" className="btn sm ghost" onClick={() => setEditContact(false)}>Cancel</button>
                </div>
              </form>
            ) : sel.contact_email || sel.contact_phone ? (
              <p className="small" style={{ margin: 0 }}>{[sel.contact_email, sel.contact_phone].filter(Boolean).join(" · ")}</p>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>Only add details they gave you themselves.</p>
            )}

            <div className="ldnh">
              <h3 className="cuh3">Notes (only you see these)</h3>
              {!editNote && <button type="button" className="linkbtn small" onClick={() => setEditNote(true)}>{sel.note ? "Edit" : "Add a note"}</button>}
            </div>
            {editNote ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = String(new FormData(e.currentTarget).get("note") ?? "").trim();
                  const undo = leads;
                  patch(sel.id, { note: t || null });
                  setEditNote(false);
                  run(() => saveLeadNote(sel.id, t), undo, "Note saved. Only you can see it.");
                }}
              >
                <label className="sr" htmlFor="ldnote">Notes about {name(sel)}</label>
                <textarea id="ldnote" name="note" className="field ldta" defaultValue={sel.note ?? ""} maxLength={2000} autoFocus />
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <button type="submit" className="btn sm">Save note</button>
                  <button type="button" className="btn sm ghost" onClick={() => setEditNote(false)}>Cancel</button>
                </div>
              </form>
            ) : sel.note ? (
              <div className="cunote">{sel.note}</div>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>No notes yet.</p>
            )}

            <h3 className="cuh3">History</h3>
            <ol className="cutl">
              {sel.events.map((h, i) => (
                <li key={i}><b>{short(h.created_at)}</b> {h.body}</li>
              ))}
            </ol>
          </aside>
        ) : null}
      </div>

      <div className="tdcols" style={{ marginTop: 0 }}>
        <section className="tdcard">
          <div className="tdch"><h2>How it works</h2></div>
          <ol className="lhow">
            <li><Ic n="home" s={16} /><span><b>Leads come in from SME Hub</b><small>Messages and your business page. You never upload contacts.</small></span></li>
            <li><Ic n="clock" s={16} /><span><b>We remind you when to follow up</b><small>After 1 day with no reply, and 3 and 7 days after a quote.</small></span></li>
            <li><Ic n="send" s={16} /><span><b>You send the message yourself</b><small>From SME Hub, your own email or your phone. Nothing goes out in your name without you.</small></span></li>
            <li><Ic n="dl" s={16} /><span><b>Download anytime</b><small>Your leads are yours. Export them as a spreadsheet whenever you like.</small></span></li>
          </ol>
          <button type="button" className="btn sm ghost" onClick={exportCsv} style={{ marginTop: 12 }} disabled={!leads.length}>
            <Ic n="dl" s={14} />Download my leads
          </button>
        </section>
        <section className="tdcard tdtip">
          <p className="tdkick">Need a full CRM?</p>
          <b>Member deal: a full customer management system at a discount.</b>
          <p className="small">For owners who want to manage all their customers, invoices and automations in one dedicated tool. Partner to be announced.</p>
        </section>
      </div>
      {toast && <div className="ldtoast" role="status">{toast}</div>}
    </>
  );
}
