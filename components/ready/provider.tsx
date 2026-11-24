"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { uploadImage } from "@/lib/upload";
import { draftFromQuestions, readWebsite, saveCity, saveDraft, saveGate, saveHeadline, saveHelps, savePhoto, type ReadyResult } from "@/app/(hub)/ready-actions";
import { CITY_CHOICES, HELP_CHOICES, MAX_HELPS, READY_ROWS, logoInitials, roleParts, type Draft, type ReadyItems } from "@/lib/ready-shared";

export type ReadyMe = { id: string; name: string; avatar: string | null; headline: string; city: string; helps: string[]; items: ReadyItems; count: number; canReach: boolean };

type Modal =
  | { type: "ai"; step: "url" | "reading" | "qs" | "review" }
  | { type: "edit"; key: "headline" | "city" | "helps" }
  | { type: "gate"; label: "connect" | "askIntro" };

type Ctx = {
  me: ReadyMe;
  openAi: () => void;
  openEdit: (k: "headline" | "city" | "helps") => void;
  /** Runs `go` straight away when the member can reach others; otherwise asks for a photo and headline first, then runs it. */
  gate: (label: "connect" | "askIntro", go: () => void) => void;
  upload: (file: File | undefined) => void;
  next: () => void;
  toast: (t: string) => void;
};

const ReadyCtx = createContext<Ctx | null>(null);
/** Null for visitors, so the same buttons work for everyone. */
export const useReady = () => useContext(ReadyCtx);

const initials = (name: string) => name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

/** The member's own avatar: their photo, or two grey initials until they add one. */
export function ReadyAv({ me, size }: { me: Pick<ReadyMe, "name" | "avatar">; size?: string }) {
  if (me.avatar) {
    return (
      <span className={`av ${size ?? ""}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={me.avatar} alt="" />
      </span>
    );
  }
  return <span className={`av pcnoav ${size ?? ""}`} aria-hidden="true">{initials(me.name)}</span>;
}

const SKIP_KEY = "smehub.setup.skipped";

export function ReadyProvider({ me, website, autoOpen, children }: { me: ReadyMe; website?: string; autoOpen: boolean; children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [modal, setModal] = useState<Modal | null>(null);
  const [note, setNote] = useState("");
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const after = useRef<(() => void) | null>(null);

  const toast = useCallback((t: string) => {
    setNote(t);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(""), 3200);
  }, []);

  // AI set-up state, kept here so closing and reopening the window does not lose what was typed
  const [url, setUrl] = useState(website ?? "");
  const [qa, setQa] = useState({ title: "Owner", biz: "", city: "", helps: "" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftId, setDraftId] = useState("");
  const [mkBiz, setMkBiz] = useState(true);
  const [k, setK] = useState(0);
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    setModal(null);
    after.current = null;
  }, []);

  const openAi = useCallback(() => {
    const [t, b] = roleParts(me.headline);
    setQa((q) => ({ ...q, title: t || "Owner", biz: b, city: q.city || me.city }));
    setMkBiz(!me.items.biz);
    setModal({ type: "ai", step: "url" });
  }, [me.headline, me.city, me.items.biz]);

  const runRead = useCallback(async (u: string) => {
    setModal({ type: "ai", step: "reading" });
    setK(0);
    const tick = setInterval(() => setK((n) => Math.min(n + 1, 3)), 520);
    const res = await readWebsite(u, qa.title, qa.biz);
    clearInterval(tick);
    if (res.draft) {
      setDraft(res.draft);
      setDraftId(res.id ?? "");
      setModal({ type: "ai", step: "review" });
    } else {
      toast(res.error ?? "We couldn’t read that website.");
      setModal({ type: "ai", step: "qs" });
    }
  }, [qa.title, qa.biz, toast]);

  // first visit of a new member: open the set-up (straight into reading if they gave a website when joining)
  useEffect(() => {
    if (!autoOpen || path !== "/feed") return;
    try {
      if (localStorage.getItem(SKIP_KEY) === me.id) return;
    } catch {}
    const t = setTimeout(() => {
      if (website) void runRead(website);
      else openAi();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const skip = () => {
    try {
      localStorage.setItem(SKIP_KEY, me.id);
    } catch {}
    close();
  };

  const upload = useCallback(async (file: File | undefined) => {
    if (!file) return;
    try {
      const addr = await uploadImage(file, "avatar");
      const r = await savePhoto(addr);
      if (r.error) return toast(r.error);
      toast(r.ready ? "Photo added. Your profile is ready." : `Photo added. ${r.count} of 5 ready.`);
      router.refresh();
    } catch (e) {
      toast((e as Error).message || "That file isn’t a photo. Try a JPG or PNG.");
    }
  }, [router, toast]);

  const gate = useCallback((label: "connect" | "askIntro", go: () => void) => {
    if (me.canReach) return go();
    after.current = go;
    setModal({ type: "gate", label });
  }, [me.canReach]);

  const nextStep = useCallback(() => {
    const nx = READY_ROWS.find(([key]) => !me.items[key]);
    if (!nx) return;
    if (nx[0] === "biz") return openAi();
    if (nx[0] === "photo") {
      router.push("/feed");
      setTimeout(() => {
        const c = document.getElementById("pccard");
        if (c) c.scrollIntoView({ block: "center" });
        document.getElementById("pcphoto")?.focus();
      }, 400);
      return;
    }
    setModal({ type: "edit", key: nx[0] as "headline" | "city" | "helps" });
  }, [me.items, openAi, router]);

  const value = useMemo<Ctx>(() => ({ me, openAi, openEdit: (key) => setModal({ type: "edit", key }), gate, upload: (f) => void upload(f), next: nextStep, toast }), [me, openAi, gate, upload, nextStep, toast]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, close]);

  const done = (r: ReadyResult, then?: () => void) => {
    if (r.error) return toast(r.error);
    toast(r.ready ? "Saved. Your profile is ready." : `Saved. Your profile is ${r.count} of 5 ready.`);
    close();
    router.refresh();
    then?.();
  };

  return (
    <ReadyCtx.Provider value={value}>
      {children}
      <div className="zip" style={{ display: "contents" }}>
        {modal && (
          <div className="overlay" onClick={close}>
            <div className={`modal${modal.type === "ai" && modal.step === "review" ? " pcwide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="mt" onClick={(e) => e.stopPropagation()}>
              {modal.type === "ai" && (
                <AiBody
                  step={modal.step}
                  me={me}
                  url={url}
                  setUrl={setUrl}
                  qa={qa}
                  setQa={setQa}
                  k={k}
                  draft={draft}
                  setDraft={setDraft}
                  mkBiz={mkBiz}
                  setMkBiz={setMkBiz}
                  busy={busy}
                  onRead={() => {
                    if (!url.trim() || !/\./.test(url)) return toast("Paste your website, for example yourbusiness.ca");
                    void runRead(url.trim());
                  }}
                  onQs={() => setModal({ type: "ai", step: "qs" })}
                  onBack={() => setModal({ type: "ai", step: "url" })}
                  onSkip={skip}
                  onQsGo={async () => {
                    if (!qa.biz.trim() || !qa.city.trim()) return toast("Add your business name and city");
                    setBusy(true);
                    const r = await draftFromQuestions(qa);
                    setBusy(false);
                    if (!r.draft) return toast(r.error ?? "Try again");
                    setUrl("");
                    setDraft(r.draft);
                    setDraftId(r.id ?? "");
                    setModal({ type: "ai", step: "review" });
                  }}
                  onSave={async () => {
                    if (!draft) return;
                    if (!draft.title.trim() || !draft.biz.trim()) return toast("Add your role and business name");
                    setBusy(true);
                    const r = await saveDraft(draftId, draft, mkBiz);
                    setBusy(false);
                    if (r.error) return toast(r.error);
                    toast(r.ready ? "Saved. Your profile is ready." : `Saved. Your profile is ${r.count} of 5 ready.${mkBiz ? " Business page saved as a draft." : ""}`);
                    close();
                    router.refresh();
                  }}
                />
              )}
              {modal.type === "edit" && <EditBody me={me} k={modal.key} onClose={close} onSave={done} />}
              {modal.type === "gate" && (
                <GateBody
                  me={me}
                  label={modal.label}
                  onClose={close}
                  upload={(f) => void upload(f)}
                  onGo={async (title, biz) => {
                    if (!me.items.headline) {
                      if (!title.trim() || !biz.trim()) return toast("Add your role and business name");
                      const r = await saveGate(title, biz);
                      if (r.error) return toast(r.error);
                    }
                    if (!me.items.photo) return toast("Add a photo first");
                    const go = after.current;
                    close();
                    router.refresh();
                    go?.();
                  }}
                />
              )}
            </div>
          </div>
        )}
        {note && <div className="toast" role="status">{note}</div>}
      </div>
    </ReadyCtx.Provider>
  );
}

function Cities() {
  return (
    <datalist id="pccities">
      {CITY_CHOICES.map((c) => <option key={c} value={c} />)}
    </datalist>
  );
}

function AiBody(p: {
  step: "url" | "reading" | "qs" | "review";
  me: ReadyMe;
  url: string;
  setUrl: (v: string) => void;
  qa: { title: string; biz: string; city: string; helps: string };
  setQa: (v: { title: string; biz: string; city: string; helps: string }) => void;
  k: number;
  draft: Draft | null;
  setDraft: (d: Draft) => void;
  mkBiz: boolean;
  setMkBiz: (v: boolean) => void;
  busy: boolean;
  onRead: () => void;
  onQs: () => void;
  onBack: () => void;
  onSkip: () => void;
  onQsGo: () => void;
  onSave: () => void;
}) {
  const { step, qa, setQa, draft: d } = p;
  if (step === "url") {
    return (
      <>
        <h2 id="mt" style={{ fontSize: 20 }}><Ic n="spark" s={18} /> Let AI set up your profile</h2>
        <p className="muted">Paste your business website or Google Business Profile link. AI reads it and drafts your profile and business page. You check everything before it’s saved.</p>
        <label htmlFor="pc-url">Website or Google listing<input className="field" id="pc-url" type="url" inputMode="url" placeholder="yourbusiness.ca" value={p.url} onChange={(e) => p.setUrl(e.target.value)} autoComplete="url" autoFocus /></label>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={p.onRead}>Set up my profile</button>
          <button type="button" className="btn ghost" onClick={p.onQs}>No website? Answer 3 questions</button>
        </div>
        <button type="button" className="linkbtn small muted" onClick={p.onSkip} style={{ alignSelf: "flex-start" }}>Skip for now. I’ll do it later.</button>
      </>
    );
  }
  if (step === "reading") {
    const L = [`Opening ${d?.dom || p.url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0] || "your website"}`, "Finding your services and where you work", "Writing your introduction", "Drafting your business page"];
    return (
      <>
        <h2 id="mt" style={{ fontSize: 20 }}>Setting up your profile…</h2>
        <ol className="pcsteps" aria-live="polite">
          {L.map((t, i) => (
            <li key={t} className={i < p.k ? "done" : i === p.k ? "now" : ""}><span className="gsck" aria-hidden="true">{i < p.k ? "✓" : ""}</span>{t}</li>
          ))}
        </ol>
      </>
    );
  }
  if (step === "qs") {
    return (
      <>
        <h2 id="mt" style={{ fontSize: 20 }}>3 quick questions</h2>
        <p className="muted">AI writes your profile from your answers. You can change anything after.</p>
        <div className="row2">
          <label htmlFor="pc-title">1. Your role<input className="field" id="pc-title" placeholder="Owner" value={qa.title} onChange={(e) => setQa({ ...qa, title: e.target.value })} /></label>
          <label htmlFor="pc-biz">Business name<input className="field" id="pc-biz" placeholder="Morgan Home Renovations" value={qa.biz} onChange={(e) => setQa({ ...qa, biz: e.target.value })} /></label>
        </div>
        <label htmlFor="pc-city">2. Where are you based?<input className="field" id="pc-city" list="pccities" placeholder="Start typing your city" value={qa.city} onChange={(e) => setQa({ ...qa, city: e.target.value })} /></label>
        <Cities />
        <label htmlFor="pc-helps">3. What can you help other owners with?<input className="field" id="pc-helps" placeholder="For example: bookkeeping, payroll, HST filing" value={qa.helps} onChange={(e) => setQa({ ...qa, helps: e.target.value })} /><span className="muted small">Separate with commas.</span></label>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={p.busy} onClick={p.onQsGo}><Ic n="spark" s={14} />Write my profile</button>
          <button type="button" className="btn ghost" onClick={p.onBack}>Back</button>
        </div>
      </>
    );
  }
  if (!d) return null;
  const set = (patch: Partial<Draft>) => p.setDraft({ ...d, ...patch });
  return (
    <>
      <h2 id="mt" style={{ fontSize: 20 }}>Here’s your draft. Does it look right?</h2>
      <p className="muted small">{d.src === "web" ? <>Found on <strong>{d.dom}</strong>. </> : "Written from your answers. "}Change anything, then save. Nothing is public until you save.</p>
      <div className="pcrev">
        <section className="pcbox">
          <p className="eyebrow">Your profile</p>
          <div className="row2">
            <label htmlFor="pcd-title">Role<input className="field" id="pcd-title" value={d.title} onChange={(e) => set({ title: e.target.value })} /></label>
            <label htmlFor="pcd-biz">Business<input className="field" id="pcd-biz" value={d.biz} onChange={(e) => set({ biz: e.target.value })} /></label>
          </div>
          <label htmlFor="pcd-city">City<input className="field" id="pcd-city" list="pccities" value={d.city} onChange={(e) => set({ city: e.target.value })} /></label>
          <Cities />
          <label htmlFor="pcd-about">Introduction<textarea className="field" id="pcd-about" rows={3} value={d.about} onChange={(e) => set({ about: e.target.value })} /></label>
          <div className="stack" style={{ gap: 6 }}>
            <span className="lbl">Can help with</span>
            <div className="chips">
              {d.helps.map((h, i) => (
                <span className="tag" key={`${h}-${i}`}>{h} <button type="button" className="xbtn" aria-label={`Remove ${h}`} onClick={() => set({ helps: d.helps.filter((_, j) => j !== i) })}>×</button></span>
              ))}
            </div>
          </div>
        </section>
        <section className="pcbox">
          <div className="row">
            <p className="eyebrow grow">Your business page</p>
            <label className="pcsw"><input type="checkbox" id="pcd-mk" checked={p.mkBiz} onChange={(e) => p.setMkBiz(e.target.checked)} /> Create it</label>
          </div>
          {p.mkBiz ? (
            <>
              <div className="row" style={{ gap: 12 }}>
                <span className="pclogo" aria-hidden="true">{logoInitials(d.biz)}</span>
                <div className="stack" style={{ gap: 0 }}><strong>{d.biz}</strong><span className="muted small">{d.cat} · {d.city}</span></div>
              </div>
              <label htmlFor="pcd-desc">Short description<textarea className="field" id="pcd-desc" rows={3} value={d.desc} onChange={(e) => set({ desc: e.target.value })} /></label>
              <div className="stack" style={{ gap: 6 }}>
                <span className="lbl">Services</span>
                <div className="chips">{d.services.map((s) => <span className="tag" key={s}>{s}</span>)}</div>
              </div>
              <p className="muted small">Saved as a draft. You add your logo and hours, then submit it for review.</p>
            </>
          ) : (
            <p className="muted small">You can add your business page later from My Businesses.</p>
          )}
        </section>
      </div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={p.busy} onClick={p.onSave}>Looks good, save</button>
        <button type="button" className="btn ghost" onClick={p.onBack}>Start again</button>
      </div>
    </>
  );
}

function EditBody({ me, k, onClose, onSave }: { me: ReadyMe; k: "headline" | "city" | "helps"; onClose: () => void; onSave: (r: ReadyResult) => void }) {
  const [r0, r1] = roleParts(me.headline);
  const [title, setTitle] = useState(r0 || "Owner");
  const [biz, setBiz] = useState(r1);
  const [city, setCity] = useState(me.city);
  const [helps, setHelps] = useState<string[]>(me.helps);
  const [nw, setNw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const heading = { headline: "Your headline", city: "Your city", helps: "What can you help with?" }[k];
  const toggle = (x: string) => {
    setErr("");
    if (helps.includes(x)) return setHelps(helps.filter((h) => h !== x));
    if (helps.length >= MAX_HELPS) return setErr("Pick up to 5");
    setHelps([...helps, x]);
  };
  const add = () => {
    const x = nw.trim();
    if (!x) return;
    if (!helps.includes(x)) {
      if (helps.length >= MAX_HELPS) return setErr("Pick up to 5");
      setHelps([...helps, x.slice(0, 40)]);
    }
    setNw("");
  };
  const save = async () => {
    setErr("");
    setBusy(true);
    const r = k === "headline" ? await saveHeadline(title, biz) : k === "city" ? await saveCity(city) : await saveHelps(helps);
    setBusy(false);
    if (r.error) return setErr(r.error);
    onSave(r);
  };
  return (
    <>
      <h2 id="mt" style={{ fontSize: 20 }}>{heading}</h2>
      {k === "headline" && (
        <>
          <p className="muted">Shown under your name everywhere on SME Hub.</p>
          <div className="row2">
            <label htmlFor="pce-title">Role<input className="field" id="pce-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
            <label htmlFor="pce-biz">Business name<input className="field" id="pce-biz" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Morgan Home Renovations" /></label>
          </div>
        </>
      )}
      {k === "city" && (
        <>
          <p className="muted">Owners search by city. Only your city shows, never your address.</p>
          <label htmlFor="pce-city">City and province<input className="field" id="pce-city" list="pccities" placeholder="Start typing" value={city} onChange={(e) => setCity(e.target.value)} autoFocus /></label>
          <Cities />
        </>
      )}
      {k === "helps" && (
        <>
          <p className="muted">Pick up to 5. These decide who finds you in search and suggestions.</p>
          <div className="chips">
            {HELP_CHOICES.concat(helps.filter((x) => !HELP_CHOICES.includes(x))).map((x) => (
              <button type="button" className="chip" key={x} aria-pressed={helps.includes(x)} onClick={() => toggle(x)}>{x}</button>
            ))}
          </div>
          <div className="row">
            <label className="sr" htmlFor="pce-new">Add your own</label>
            <input className="field grow" id="pce-new" placeholder="Add your own" value={nw} onChange={(e) => setNw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
            <button type="button" className="btn sm ghost" onClick={add}>Add</button>
          </div>
        </>
      )}
      {err && <p role="alert" className="small" style={{ color: "#B42318" }}>{err}</p>}
      <div className="row">
        <button type="button" className="btn" disabled={busy} onClick={save}>Save</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

function GateBody({ me, label, onClose, upload, onGo }: { me: ReadyMe; label: "connect" | "askIntro"; onClose: () => void; upload: (f: File | undefined) => void; onGo: (title: string, biz: string) => void }) {
  const [r0, r1] = roleParts(me.headline);
  const [title, setTitle] = useState(r0 || "Owner");
  const [biz, setBiz] = useState(r1);
  return (
    <>
      <h2 id="mt" style={{ fontSize: 20 }}>Add a photo and headline first</h2>
      <p className="muted">Owners ignore requests from blank profiles. It takes 30 seconds, and they will see who you are.</p>
      <div className="pcgate">
        <div className="row" style={{ gap: 12 }}>
          <ReadyAv me={me} size="l" />
          <div className="stack" style={{ gap: 4 }}>
            <strong>{me.name}</strong>
            {me.items.photo ? (
              <span className="small pcok">✓ Photo added</span>
            ) : (
              <label className="btn sm ghost pcup" style={{ alignSelf: "flex-start" }}><Ic n="upl" s={14} />Add photo<input type="file" accept="image/*" className="sr" id="pcphoto" onChange={(e) => upload(e.target.files?.[0])} /></label>
            )}
          </div>
        </div>
        {me.items.headline ? (
          <span className="small pcok">✓ Headline: {me.headline}</span>
        ) : (
          <div className="row2">
            <label htmlFor="pce-title">Role<input className="field" id="pce-title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label htmlFor="pce-biz">Business name<input className="field" id="pce-biz" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Your business" /></label>
          </div>
        )}
      </div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={() => onGo(title, biz)}>{label === "askIntro" ? "Save and ask for the introduction" : "Save and send request"}</button>
        <button type="button" className="btn ghost" onClick={onClose}>Not now</button>
      </div>
    </>
  );
}
