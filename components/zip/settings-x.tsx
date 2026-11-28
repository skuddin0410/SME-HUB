"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { applyPreset, changeSignInEmail, closeAccount, keepAccount, setRecordViews, setSetting, setVisibility, type SettingKey } from "@/app/(hub)/settings-actions";
import { endOtherSessions, forgotPassword, setEmailCode, type SessionRow } from "@/app/auth/actions";
import { setSaleEmails } from "@/app/(hub)/forsale-actions";
import { saveCard } from "@/app/(hub)/card-actions";
import { CARD_STYLES, cardLink, type CardStyle } from "@/lib/business-card";
import { DEFAULT_SETTINGS, PRESETS, PRESET_LABEL, VIS_LONG, VIS_SHORT, type MemberSettings, type PresetKey } from "@/lib/settings";

/**
 * Update 33: Settings and privacy. A privacy check strip, the list of sections on the left (tabs on phones) and
 * one section on the right. Every choice saves as soon as it's made, except a new sign-in email.
 */
export type SxField = { k: string; l: string; g: string; vis: string; lock: boolean };
export type SxData = {
  email: string;
  planLabel: string;
  founding: boolean;
  sessions: SessionRow[];
  twoStep: boolean;
  settings: MemberSettings | null;
  fields: SxField[];
  vis: Record<string, string>;
  pvSwitch: boolean;
  recordViews: boolean;
  blocked: number;
  card: { handle: string; style: CardStyle; searchable: boolean } | null;
  forsaleEmails: boolean;
  exportData: boolean;
  canClose: boolean;
  closeRule: "all" | "free" | "none";
  sections: [string, string, string][];
  profilePath: string;
};

type SecId = "account" | "privacy" | "contact" | "notif" | "card" | "data" | "close" | "apps" | "consult";

function Sw({ on, onClick, title, sub, disabled }: { on: boolean; onClick: () => void; title: string; sub?: string; disabled?: boolean }) {
  return (
    <button type="button" className="sxsw" role="switch" aria-checked={on} onClick={onClick} disabled={disabled}>
      <span><b>{title}</b>{sub && <small>{sub}</small>}</span>
      <i />
    </button>
  );
}
function Seg<T extends string>({ opts, cur, label, onPick }: { opts: [T, string][]; cur: T; label: string; onPick: (v: T) => void }) {
  return (
    <div className="sxseg" role="radiogroup" aria-label={label}>
      {opts.map(([v, t]) => (
        <button key={v} type="button" role="radio" aria-checked={cur === v} onClick={() => cur !== v && onPick(v)}>{t}</button>
      ))}
    </div>
  );
}
function Row({ title, sub, children }: { title: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="sxrow">
      <span className="sxl"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      <span className="sxr">{children}</span>
    </div>
  );
}
function Sec({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="sxsec" aria-labelledby={`sxh-${id}`}>
      <header><h2 id={`sxh-${id}`}>{title}</h2>{intro && <p>{intro}</p>}</header>
      {children}
    </section>
  );
}

const date = (d: string) => new Date(d).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
const ago = (d: string) => {
  const m = Math.round((Date.now() - Date.parse(d)) / 60000);
  if (m < 5) return "Active now";
  if (m < 60) return `Last active ${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `Last active ${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.round(h / 24);
  return days === 1 ? "Last active yesterday" : `Last active ${days} days ago`;
};

/** `extra`: a section that lives on its own page (Update 36: Connected apps, Free consultations), in the same frame. */
export function SettingsX({ data, initial, extra }: { data: SxData; initial: string; extra?: { id: "apps" | "consult"; node: React.ReactNode } }) {
  const router = useRouter();
  const ready = data.settings !== null;
  const [sec, setSec] = useState<SecId>(extra ? extra.id : ((["account", "privacy", "contact", "notif", "card", "data", "close"].includes(initial) ? initial : "account") as SecId));
  const [s, setS] = useState<MemberSettings>(data.settings ?? DEFAULT_SETTINGS);
  const [vis, setVis] = useState<Record<string, string>>(data.vis);
  const [twoStep, setTwoStep] = useState(data.twoStep);
  const [views, setViews] = useState(data.recordViews);
  const [sessions, setSessions] = useState(data.sessions);
  const [editEmail, setEditEmail] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [cardSearch, setCardSearch] = useState(data.card?.searchable ?? false);
  const [forsale, setForsale] = useState(data.forsaleEmails);
  const [delOk, setDelOk] = useState(false);
  const [closing, setClosing] = useState(false);

  // keep the address bar in step, so a section can be linked to and the Back button works
  useEffect(() => {
    if (extra) return;
    const u = new URL(window.location.href);
    if (u.searchParams.get("s") !== sec) {
      u.searchParams.set("s", sec);
      window.history.replaceState(null, "", u.toString());
    }
  }, [sec, extra]);

  const go = (id: string) => {
    if (id === "billing") return router.push("/billing");
    if (extra && id !== extra.id && id !== "apps" && id !== "consult") return router.push(`/settings?s=${id}`);
    if (id === "apps" || id === "consult") return router.push(`/settings/${id === "apps" ? "apps" : "consultations"}`);
    setSec(id as SecId);
    setEditEmail(false);
    if (typeof window !== "undefined" && window.innerWidth < 760) document.querySelector(".sxmain")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const put = async (key: SettingKey, value: boolean | string, patch: Partial<MemberSettings>, ok?: string) => {
    const was = s;
    setS((v) => ({ ...v, ...patch }));
    const r = await setSetting(key, value).catch(() => ({ ok: false as const, error: "Could not save that. Check your connection and try again." }));
    if (!r.ok) {
      setS(was);
      toast(r.error);
    } else if (ok) toast(ok);
  };

  // ---------- privacy helpers ----------
  const editable = data.fields.filter((f) => !f.lock);
  const visOf = (k: string) => vis[k] ?? data.fields.find((f) => f.k === k)?.vis ?? "public";
  const preset = ((): PresetKey | "custom" => {
    for (const p of Object.keys(PRESETS) as PresetKey[]) {
      if (editable.every((f) => !(f.k in PRESETS[p]) || visOf(f.k) === PRESETS[p][f.k])) return p;
    }
    return "custom";
  })();
  const pickVis = async (k: string, v: string) => {
    const was = vis;
    setVis((x) => ({ ...x, [k]: v }));
    const r = await setVisibility(k, v).catch(() => ({ ok: false as const, error: "Could not save that." }));
    if (!r.ok) {
      setVis(was);
      toast(r.error);
    }
  };
  const pickPreset = async (p: PresetKey) => {
    const was = vis;
    setVis((x) => ({ ...x, ...PRESETS[p] }));
    const r = await applyPreset(p).catch(() => ({ ok: false as const, error: "Could not save that." }));
    if (!r.ok) {
      setVis(was);
      toast(r.error);
    } else toast(`${PRESET_LABEL[p][0]} privacy applied`);
  };

  // ---------- privacy check ----------
  const ep = visOf("email");
  const ph = visOf("phone");
  const contact = ep === ph ? VIS_LONG[ep] : `${VIS_LONG[ep]} / ${VIS_LONG[ph]}`;
  const paused = !!s.paused_at;
  const tiles: [SecId, string, string, string, "" | "warn" | "good"][] = [
    ["privacy", "eye", "Profile", preset === "custom" ? "Custom mix" : PRESET_LABEL[preset][0], ""],
    ["privacy", "phone", "Phone and email", contact, ep === "public" || ph === "public" ? "warn" : ""],
    ["account", "key", "Two-step sign-in", twoStep ? "On" : "Off", twoStep ? "good" : "warn"],
    ["close", "pause", "Your profile", paused ? "Paused" : "Visible", paused ? "warn" : ""],
  ];

  const notReady = !ready && <p className="small muted sxnote">Some of these settings are almost ready and will save very soon.</p>;

  const account = (
    <Sec id="account" title="Account" intro="Your sign-in details and plan.">
      <Row title="Name and photo" sub="Shown on your profile and business card"><Link className="btn sm ghost" href="/profile/edit">Edit profile</Link></Row>
      {editEmail ? (
        <div className="sxrow sxedit">
          <span className="sxl"><b>Sign-in email</b><small>We email the new address so you can confirm it.</small></span>
          <form
            className="sxr"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = draft.trim();
              if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return toast("Please enter a full email address");
              setSending(true);
              const r = await changeSignInEmail(v).catch(() => ({ ok: false as const, error: "Could not send the confirmation. Try again." }));
              setSending(false);
              if (!r.ok) return toast(r.error);
              setEditEmail(false);
              setDraft("");
              toast(`We sent a confirmation link to ${v}`);
            }}
          >
            <label className="sr" htmlFor="sx-email">New email</label>
            <input id="sx-email" className="field" type="email" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="name@business.ca" autoFocus maxLength={254} />
            <button type="submit" className="btn sm dark" disabled={sending}>{sending ? "Sending…" : "Save"}</button>
            <button type="button" className="btn sm ghost" onClick={() => setEditEmail(false)}>Cancel</button>
          </form>
        </div>
      ) : (
        <Row title="Sign-in email" sub={data.email}><button type="button" className="btn sm ghost" onClick={() => setEditEmail(true)}>Change</button></Row>
      )}
      <Row title="Password" sub={<>Or change it on <Link href="/settings/security">Security and sign-in</Link></>}>
        <button
          type="button"
          className="btn sm ghost"
          onClick={async () => {
            const r = await forgotPassword(data.email).catch(() => ({ ok: false as const, error: "Could not send it. Try again." }));
            toast(r.ok ? `We emailed a reset link to ${data.email}` : r.error);
          }}
        >
          Email me a reset link
        </button>
      </Row>
      <Sw
        on={twoStep}
        title="Two-step sign-in"
        sub="Each sign-in on a new device also asks for a 6-digit code we email to you. Recommended."
        onClick={async () => {
          const next = !twoStep;
          setTwoStep(next);
          const r = await setEmailCode(next).catch(() => ({ ok: false }));
          if (!r.ok) {
            setTwoStep(!next);
            toast("Could not change that. Try again.");
          } else toast(next ? "Two-step sign-in is on" : "Two-step sign-in is off");
        }}
      />
      <Row title="Language" sub="Menus, emails and the Help Centre">
        <Seg opts={[["en", "English"], ["fr", "Français"]]} cur={s.language} label="Language" onPick={(v) => put("language", v, { language: v }, v === "fr" ? "Saved. SME Hub in French is coming soon." : "Saved")} />
      </Row>
      <Row title="Membership" sub={`${data.planLabel}${data.founding ? " · Founding Member" : ""}`}><Link className="btn sm ghost" href="/billing"><Ic n="crown" s={14} />Plan and billing</Link></Row>
      <div className="sxsub">
        <h3>Where you are signed in</h3>
        {sessions.map((x) => (
          <div className="sxdev" key={x.id}>
            <Ic n={/iphone|android|mobile|ipad/i.test(x.device) ? "mobile" : "device"} s={18} />
            <span><b>{x.device}</b><small>{[x.where, x.current ? "This device" : ago(x.lastSeen)].filter(Boolean).join(" · ")}</small></span>
          </div>
        ))}
        {sessions.some((x) => !x.current) ? (
          <button
            type="button"
            className="btn sm ghost sxbtn"
            onClick={async () => {
              const r = await endOtherSessions().catch(() => ({ ok: false }));
              if (r.ok) {
                setSessions((v) => v.filter((x) => x.current));
                toast("Signed out of your other devices");
              } else toast("Could not sign out the other devices. Try again.");
            }}
          >
            Sign out of other devices
          </button>
        ) : (
          <p className="small muted">You are signed in on this device only.</p>
        )}
      </div>
    </Sec>
  );

  const groups: [string, SxField[]][] = [];
  for (const f of editable) {
    const g = groups.find((x) => x[0] === f.g);
    if (g) g[1].push(f);
    else groups.push([f.g, [f]]);
  }
  const privacy = (
    <Sec id="privacy" title="Profile privacy" intro="Choose who sees each part of your profile.">
      <div className="sxpre" role="radiogroup" aria-label="Quick setting">
        {(Object.keys(PRESETS) as PresetKey[]).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={preset === p} className={`sxpb${preset === p ? " on" : ""}`} onClick={() => pickPreset(p)}>
            <b>{PRESET_LABEL[p][0]}{p === "balanced" && <em>Recommended</em>}</b>
            <small>{PRESET_LABEL[p][1]}</small>
          </button>
        ))}
      </div>
      {preset === "custom" && <p className="small muted">You have your own mix below. Pick a quick setting above to reset everything at once.</p>}
      <div className="sxlock">
        <Ic n="lock" s={14} />
        <span><b>Always public:</b> {data.fields.filter((f) => f.lock).map((f) => f.l.toLowerCase()).join(", ")}. Customers need these to find your business.</span>
      </div>
      {groups.map(([g, fs]) => (
        <div className="sxsub" key={g}>
          <h3>{g}</h3>
          {fs.map((f) => (
            <div className="sxrow" key={f.k}>
              <span className="sxl"><b>{f.l}</b></span>
              <span className="sxr">
                <Seg opts={Object.entries(VIS_SHORT) as [string, string][]} cur={visOf(f.k)} label={`Who can see ${f.l}`} onPick={(v) => pickVis(f.k, v)} />
              </span>
            </div>
          ))}
        </div>
      ))}
      <p className="small muted sxnote">Public means anyone on the internet. Members means signed-in SME Hub members. Connections means people you have accepted.</p>
      <div className="sxsub">
        <h3>Activity</h3>
        <Sw on={s.show_online} title="Show when I am online" sub="A green dot on your photo while you are on the Hub." onClick={() => put("show_online", !s.show_online, { show_online: !s.show_online })} />
        {data.pvSwitch && (
          <Sw
            on={views}
            title="Record profile views"
            sub="Members you visit can see that you looked, and you can see who viewed you. Turning it off stops both."
            onClick={async () => {
              const next = !views;
              setViews(next);
              const r = await setRecordViews(next).catch(() => ({ ok: false as const, error: "Could not save that." }));
              if (!r.ok) {
                setViews(!next);
                toast(r.error);
              }
            }}
          />
        )}
        <Sw on={s.in_directory} title="Show me in the member directory" sub="Members can find you by name, city or industry." onClick={() => put("in_directory", !s.in_directory, { in_directory: !s.in_directory })} />
        <Sw on={s.indexable} title="Let Google show my profile" sub="The public parts of your profile can appear in search results. Off by default." onClick={() => put("indexable", !s.indexable, { indexable: !s.indexable })} />
        <Sw on={s.allow_tags} title="Let members tag me in posts" sub="You get a notification and can remove a tag at any time." onClick={() => put("allow_tags", !s.allow_tags, { allow_tags: !s.allow_tags })} />
      </div>
      {notReady}
      <Link className="btn sm ghost sxbtn" href={data.profilePath}><Ic n="eye" s={14} />See my profile</Link>
    </Sec>
  );

  const contactSec = (
    <Sec id="contact" title="Messages and connections" intro="Control who can reach you on the Hub.">
      <Row title="Who can message me" sub="With Connections only, other members can still reply to a conversation you started.">
        <Seg opts={[["anyone", "Any member"], ["conn", "Connections only"]]} cur={s.who_message} label="Who can message me" onPick={(v) => put("who_message", v, { who_message: v })} />
      </Row>
      <Row title="Who can send me connection requests">
        <Seg opts={[["everyone", "Any member"], ["shared", "Shared groups only"]]} cur={s.who_request} label="Who can send me connection requests" onPick={(v) => put("who_request", v, { who_request: v })} />
      </Row>
      <Row title="Blocked members" sub="Blocked members cannot see your profile or message you.">
        {data.blocked ? <Link className="btn sm ghost" href="/blocked">See {data.blocked} blocked</Link> : <span className="small muted">None</span>}
      </Row>
      {notReady}
    </Sec>
  );

  const alert = (k: "alert_messages" | "alert_requests" | "alert_leads" | "alert_deadlines" | "alert_events" | "alert_news" | "alert_mag" | "alert_partner", title: string, sub = "") => (
    <Sw on={s[k]} title={title} sub={sub || undefined} onClick={() => put(k, !s[k], { [k]: !s[k] } as Partial<MemberSettings>)} />
  );
  const notif = (
    <Sec id="notif" title="Notifications" intro="Pick what reaches your inbox.">
      <Row title="Email summary" sub="One email with what you missed">
        <Seg opts={[["daily", "Daily"], ["weekly", "Weekly"], ["off", "Off"]]} cur={s.digest} label="Email summary" onPick={(v) => put("digest", v, { digest: v })} />
      </Row>
      <div className="sxsub">
        <h3>Tell me right away about</h3>
        {alert("alert_messages", "New messages")}
        {alert("alert_requests", "Connection requests")}
        {alert("alert_leads", "New leads", "Enquiries in My leads waiting for your reply")}
        {alert("alert_deadlines", "Deadline reminders", "GST/HST and other dates in My deadlines")}
        {alert("alert_events", "Event reminders", "Before events you saved or registered for")}
        <Sw
          on={forsale}
          title="Businesses for sale"
          sub="Your listing going live, new buyer enquiries, enquiries you send, and changes to listings you saved."
          onClick={async () => {
            const next = !forsale;
            setForsale(next);
            const r = await setSaleEmails(next).catch(() => ({ error: "Could not save that." }));
            if ((r as { error?: string }).error) {
              setForsale(!next);
              toast((r as { error: string }).error);
            }
          }}
        />
      </div>
      <div className="sxsub">
        <h3>Marketing email <span className="polopt">Optional</span></h3>
        {alert("alert_news", "SME Hub newsletter", "Member stories, events and offers, about twice a month")}
        {alert("alert_mag", "CanadianSME Small Business Magazine", "Each list is separate. Joining one doesn’t sign you up for the others.")}
        {alert("alert_partner", "Offers from partners", "We never share your details with a partner unless you say yes to that partner by name.")}
        <p className="small muted sxnote">Unsubscribe requests are free and done within 10 business days. <Link href="/policies/email-preferences">Email and marketing preferences</Link></p>
      </div>
      <p className="small muted sxnote">Security, billing and legal emails are always sent, because they are about your account.</p>
      {notReady}
    </Sec>
  );

  const cardSec = (
    <Sec id="card" title="Business card" intro="Your digital card and its public page.">
      <Row title="My business card" sub={data.card ? `${CARD_STYLES[data.card.style].n} style · ${cardLink(data.card.handle)}` : "Make a card people can scan to save your contact."}>
        <Link className="btn sm ghost" href="/mycard"><Ic n="qr" s={14} />Open my card</Link>
      </Row>
      <Sw
        on={cardSearch}
        title="Let Google show my card page"
        sub="Off by default. Anyone with your link or code can always open it."
        disabled={!data.card}
        onClick={async () => {
          const next = !cardSearch;
          setCardSearch(next);
          const r = await saveCard({ searchable: next }).catch(() => ({ ok: false as const, error: "Could not save that." }));
          if (!r.ok) {
            setCardSearch(!next);
            toast(r.error);
          }
        }}
      />
      <p className="small muted sxnote">You choose what shows on the card itself (title, phone, email and so on) on <Link href="/mycard">My business card</Link>.</p>
    </Sec>
  );

  const dataSec = (
    <Sec id="data" title="My data" intro="Your information belongs to you.">
      {data.exportData ? (
        <Row title="Download my data" sub="Your profile, posts, comments, connections, messages and business pages in one file.">
          <a className="btn sm dark" href="/settings/export" download><Ic n="dl" s={14} />Download my data</a>
        </Row>
      ) : (
        <Row title="Download my data" sub="The Hub team sends you a copy on request."><Link className="btn sm ghost" href="/contact">Ask the Hub team</Link></Row>
      )}
      <Row title="See, fix or delete your information" sub="Ask what we hold about you, how it’s used and who it was shared with. We reply within 30 days.">
        <Link className="btn sm ghost" href="/policies/privacy-policy"><Ic n="lock" s={14} />How to ask</Link>
      </Row>
      <div className="sxsub">
        <h3>What SME Hub never does</h3>
        <ul className="sxlist">
          <li><Ic n="check" s={14} />Sell your details or your contact list</li>
          <li><Ic n="check" s={14} />Send messages in your name</li>
          <li><Ic n="check" s={14} />Give your details to a sponsor without asking you first</li>
          <li><Ic n="check" s={14} />Show your phone or email unless you switch it on</li>
        </ul>
      </div>
    </Sec>
  );

  const closeSec = (
    <Sec id="close" title="Close or pause" intro="Take a break, or leave for good.">
      {s.close_at ? (
        <div className="warnbox" style={{ alignItems: "center" }}>
          <Ic n="flag" s={16} />
          <span style={{ flex: 1 }}>Your account closes on <b>{date(s.close_at)}</b>. Until then your profile is paused and you can change your mind.</span>
          <button
            type="button"
            className="btn sm ghost"
            onClick={async () => {
              const r = await keepAccount().catch(() => ({ ok: false as const, error: "Could not save that." }));
              if (!r.ok) return toast(r.error);
              setS((v) => ({ ...v, close_at: null, paused_at: null }));
              toast("Welcome back. Your account stays open");
            }}
          >
            Keep my account
          </button>
        </div>
      ) : (
        <Sw
          on={paused}
          title="Pause my profile"
          sub="Hide your profile and business page while you take a break. Nothing is deleted, and you can switch it back on at any time."
          onClick={() => put("paused", !paused, { paused_at: paused ? null : new Date().toISOString() }, paused ? "Your profile is visible again" : "Your profile is paused")}
        />
      )}
      {!s.close_at && (
        <div className="sxsub sxdanger">
          <h3>Close my account</h3>
          {data.canClose ? (
            <>
              <div className="warnbox"><Ic n="flag" s={16} /><span>Closing your account removes your profile, posts and messages. You have 30 days to change your mind.</span></div>
              <button type="button" className="sw" role="switch" aria-checked={delOk} onClick={() => setDelOk(!delOk)}><i aria-hidden="true" />I understand what will be removed</button>
              <button
                type="button"
                className={`btn sm sxdel${delOk ? "" : " off"}`}
                aria-disabled={!delOk || closing}
                onClick={async () => {
                  if (!delOk || closing) return;
                  setClosing(true);
                  const r = await closeAccount().catch(() => ({ ok: false as const, error: "Could not close your account. Try again." }));
                  setClosing(false);
                  if (!r.ok) return toast(r.error);
                  setS((v) => ({ ...v, close_at: r.on, paused_at: v.paused_at ?? new Date().toISOString() }));
                  toast(`Your account closes on ${date(r.on)}`);
                }}
              >
                {closing ? "Closing…" : "Close my account"}
              </button>
            </>
          ) : (
            <>
              <p className="muted small">{data.closeRule === "free" ? "You are on a paid plan, so the Hub team closes the account for you. We stop your renewals when we close it and confirm the date by email." : "The Hub team closes accounts on request."}</p>
              <Link className="btn sm ghost sxbtn" href="/contact">Ask the Hub team to close it</Link>
            </>
          )}
        </div>
      )}
      {notReady}
    </Sec>
  );

  const body: Record<SecId, React.ReactNode> = { account, privacy, contact: contactSec, notif, card: cardSec, data: dataSec, close: closeSec, apps: extra?.node, consult: extra?.node };

  return (
    <div className="sxpage">
      <div className="sxhead">
        <div>
          <p className="sxeye"><Ic n="lock" s={12} />Only you can see this page</p>
          <h1>Settings and privacy</h1>
        </div>
        <Link className="btn sm ghost" href="/help"><Ic n="help" s={14} />Help with settings</Link>
      </div>
      <div className="sxcheck" role="group" aria-label="Privacy check">
        {tiles.map(([to, i, label, v, tone]) => (
          <button key={label} type="button" className={`sxct${tone ? ` ${tone}` : ""}`} onClick={() => go(to)}>
            <Ic n={i} s={16} />
            <span><small>{label}</small><b>{v}</b></span>
            {tone === "warn" && <em>Check</em>}
          </button>
        ))}
      </div>
      <div className="sxgrid">
        <SxNav sections={data.sections} cur={sec} onGo={go} />
        <div className="sxmain">{body[sec]}</div>
      </div>
    </div>
  );
}

/** The list of sections (scrolling tabs on phones). Plan and billing and the Advisor pages are their own pages. */
export function SxNav({ sections, cur, onGo }: { sections: [string, string, string][]; cur: string; onGo?: (id: string) => void }) {
  const href = (id: string) => (id === "billing" ? "/billing" : id === "apps" ? "/settings/apps" : id === "consult" ? "/settings/consultations" : `/settings?s=${id}`);
  return (
    <nav className="sxnav" aria-label="Settings sections">
      {sections.map(([id, label, icon]) =>
        onGo && !["billing", "apps", "consult"].includes(id) ? (
          <button key={id} type="button" className={cur === id ? "on" : ""} aria-current={cur === id ? "true" : undefined} onClick={() => onGo(id)}>
            <Ic n={icon} s={16} /><span>{label}</span>
          </button>
        ) : (
          <Link key={id} href={href(id)} className={cur === id ? "on" : ""} aria-current={cur === id ? "page" : undefined}>
            <Ic n={icon} s={16} /><span>{label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}

/** The settings building blocks, for the sections that live on their own pages (Update 36). */
export { Sw as SxSw, Seg as SxSeg, Row as SxRow, Sec as SxSec };
