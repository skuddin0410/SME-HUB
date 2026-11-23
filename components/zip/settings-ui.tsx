"use client";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { saveHubSettings } from "@/app/(hub)/team-actions";

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Store = { v: Obj; set: (path: string, val: unknown) => void; edit: (fn: (draft: Obj) => void) => void };
const Ctx = createContext<Store | null>(null);
const useS = () => useContext(Ctx)!;

function getAt(o: Obj, path: string) {
  return path.split(".").reduce<any>((a, k) => (a == null ? a : a[k]), o); // eslint-disable-line @typescript-eslint/no-explicit-any
}
function setAt(o: Obj, path: string, val: unknown) {
  const ks = path.split(".");
  let cur = o;
  ks.slice(0, -1).forEach((k) => { cur = cur[k] ??= {}; });
  cur[ks[ks.length - 1]] = val;
}

/** Holds a page's choices in memory until the team presses Save changes. */
export function SettingsForm({ pageKey, initial, children }: { pageKey: string; initial: Obj; children: ReactNode }) {
  const [v, setV] = useState<Obj>(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean }>({});
  const [pending, start] = useTransition();
  const edit = (fn: (d: Obj) => void) => { setV((cur) => { const d = structuredClone(cur); fn(d); return d; }); setDirty(true); setMsg({}); };
  const store: Store = { v, edit, set: (p, val) => edit((d) => setAt(d, p, val)) };
  const save = () => start(async () => { const r = await saveHubSettings(pageKey, JSON.stringify(v)); setMsg(r); if (r.ok) setDirty(false); });
  return (
    <Ctx.Provider value={store}>
      {children}
      <div className="card" role="region" aria-label="Save settings" style={{ position: "sticky", bottom: 12, marginTop: 20, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, zIndex: 5 }}>
        <span className="grow small" role="status">{msg.error ? <span style={{ color: "var(--ink)" }}>{msg.error}</span> : msg.ok ? "Saved. Members see the new settings." : dirty ? "You have changes that are not saved yet." : "Nothing changed yet."}</span>
        <button type="button" className="btn" disabled={pending || !dirty} onClick={save}>{pending ? "Saving…" : "Save changes"}</button>
      </div>
    </Ctx.Provider>
  );
}

export function Sw({ path, label }: { path: string; label: ReactNode }) {
  const s = useS();
  const on = !!getAt(s.v, path);
  return (
    <button type="button" className="sw" role="switch" aria-checked={on} onClick={() => s.set(path, !on)}>
      <i aria-hidden="true" /><span>{label}</span>
    </button>
  );
}

export function Radio({ path, opts, label }: { path: string; opts: [string, string][]; label?: string }) {
  const s = useS();
  const cur = String(getAt(s.v, path));
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {opts.map(([k, l]) => (
        <button key={k} type="button" className="chip" role="radio" aria-checked={cur === k} onClick={() => s.set(path, k)}>{l}</button>
      ))}
    </div>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className="chip" aria-pressed={on} onClick={onClick}>{children}</button>;
}

/** Hook-style access for pages that need lists (fields, types, tabs…). */
export function useSettings() {
  const s = useS();
  return { v: s.v, set: s.set, edit: s.edit, get: (p: string) => getAt(s.v, p) };
}

/** A list of removable words with an add box (group types, categories, blocked words). */
export function WordList({ path, id, placeholder, addLabel, remove, prefix = "" }: { path: string; id: string; placeholder: string; addLabel: string; remove: (w: string) => string; prefix?: string }) {
  const { get, edit } = useSettings();
  const [t, setT] = useState("");
  const list: string[] = get(path) ?? [];
  const add = () => {
    const w = t.trim().replace(/^#/, "");
    if (!w || list.some((x) => x.toLowerCase() === w.toLowerCase())) return;
    edit((d) => { const a: string[] = getAt(d, path); a.push(w); });
    setT("");
  };
  return (
    <>
      <div className="chips">
        {list.map((w, i) => (
          <span className="tag" key={w}>{prefix}{w}{" "}
            <button type="button" className="xbtn" style={{ padding: "0 2px", fontSize: 13 }} aria-label={remove(w)} onClick={() => edit((d) => { getAt(d, path).splice(i, 1); })}>×</button>
          </span>
        ))}
      </div>
      <div className="row">
        <label className="sr" htmlFor={id}>{addLabel}</label>
        <input id={id} className="field grow" placeholder={placeholder} value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="btn sm ghost" onClick={add}>Add</button>
      </div>
    </>
  );
}
