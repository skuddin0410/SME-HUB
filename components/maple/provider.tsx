"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "@/components/toast";
import { askMaple, deleteMapleHistory, mapleChat, rateMaple, setMapleSetting } from "@/app/(hub)/maple-actions";
import { MAPLE_DEFAULTS, type MapleLeft, type MapleMsg, type MapleSettings } from "@/lib/maple";

/** Updates 46 to 48: one Maple for every page (the chat page, the Messaging panel, the side tab, the prompts). */
type Plan = "free" | "plus" | "advisor";
type Ctx = {
  member: boolean;
  first: string;
  isNew: boolean;
  plan: Plan;
  settings: MapleSettings;
  msgs: MapleMsg[];
  loaded: boolean;
  left: MapleLeft | null;
  busy: boolean;
  draft: string;
  setDraft: (v: string) => void;
  dock: boolean;
  greeted: boolean;
  /** messages from before "New chat" are hidden here (they stay in the history) */
  since: string | null;
  openDock: () => void;
  closeDock: () => void;
  toggleDock: () => void;
  load: () => void;
  ask: (q: string) => void;
  /** from a prompt, tile or suggestion: turns Maple on if needed, and opens the Messaging panel unless the chat page is open */
  askFrom: (q: string) => void;
  rate: (id: string, v: "up" | "dn") => void;
  setSetting: (k: keyof MapleSettings, v: boolean) => Promise<boolean>;
  deleteHistory: () => Promise<boolean>;
  newChat: () => void;
};
const MapleCtx = createContext<Ctx | null>(null);
export const useMaple = () => useContext(MapleCtx);

const UI_KEY = "smehub.maple.ui.v1";

export function MapleProvider({ member, first, isNew, plan, settings: s0, children }: { member: boolean; first: string; isNew: boolean; plan: Plan; settings: MapleSettings | null; children: React.ReactNode }) {
  const path = usePathname();
  const [settings, setSettings] = useState<MapleSettings>(s0 ?? MAPLE_DEFAULTS);
  const [msgs, setMsgs] = useState<MapleMsg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [left, setLeft] = useState<MapleLeft | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [dock, setDock] = useState(false);
  const [greeted, setGreeted] = useState(true);
  const [since, setSince] = useState<string | null>(null);
  const loading = useRef(false);

  useEffect(() => setSettings(s0 ?? MAPLE_DEFAULTS), [s0]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(UI_KEY) || "null") as { greeted?: boolean; since?: string | null } | null;
      setGreeted(!!v?.greeted);
      setSince(v?.since ?? null);
    } catch {
      setGreeted(false);
    }
  }, []);
  const saveUi = (v: { greeted?: boolean; since?: string | null }) => {
    try {
      const cur = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
      localStorage.setItem(UI_KEY, JSON.stringify({ ...cur, ...v }));
    } catch {
      /* private browsing: fine */
    }
  };
  // the chat page has its own Maple; the panel closes there
  useEffect(() => {
    if (path === "/ask") setDock(false);
  }, [path]);

  const load = useCallback(() => {
    if (!member || loaded || loading.current) return;
    loading.current = true;
    mapleChat()
      .then((r) => {
        if ("error" in r) return;
        setMsgs(r.msgs);
        setLeft(r.left);
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => {
        loading.current = false;
      });
  }, [member, loaded]);

  const greet = () => {
    setGreeted(true);
    saveUi({ greeted: true });
  };

  const ask = useCallback(
    (text: string) => {
      const q = text.replace(/\s+/g, " ").trim();
      if (!q || busy) return;
      if (!member) return void (window.location.href = "/auth/sign-up?next=/ask");
      const mine: MapleMsg = { id: `me${Date.now()}`, by: "me", t: q, at: new Date().toISOString() };
      setMsgs((m) => [...m, mine]);
      setDraft("");
      setBusy(true);
      askMaple(q)
        .then((r) => {
          if (r.error || !r.msg) {
            setMsgs((m) => m.filter((x) => x.id !== mine.id));
            setDraft(q);
            toast(r.error ?? "Maple couldn’t answer just now. Please try again in a moment.");
            return;
          }
          setMsgs((m) => [...m, r.msg!]);
          if (r.left) setLeft(r.left);
        })
        .catch(() => {
          setMsgs((m) => m.filter((x) => x.id !== mine.id));
          setDraft(q);
          toast("Maple couldn’t answer just now. Please try again in a moment.");
        })
        .finally(() => setBusy(false));
    },
    [busy, member],
  );

  const setSetting = useCallback(async (k: keyof MapleSettings, v: boolean) => {
    const before = settings;
    setSettings((x) => ({ ...x, [k]: v }));
    if (k === "on" && !v) setDock(false);
    const r = await setMapleSetting(k, v).catch(() => ({ error: "Could not save that." }));
    if (r.error) {
      setSettings(before);
      toast(r.error);
      return false;
    }
    toast(k === "on" ? (v ? "Maple is on" : "Maple is off. Turn it back on in Settings any time.") : "Saved");
    return true;
  }, [settings]);

  const value = useMemo<Ctx>(
    () => ({
      member,
      first,
      isNew,
      plan,
      settings,
      msgs,
      loaded,
      left,
      busy,
      draft,
      setDraft,
      dock,
      greeted,
      since,
      load,
      openDock: () => {
        load();
        setDock(true);
        greet();
      },
      closeDock: () => setDock(false),
      toggleDock: () => {
        load();
        setDock((d) => !d);
        greet();
      },
      ask,
      askFrom: (q: string) => {
        if (!member) return void (window.location.href = "/auth/sign-up?next=/ask");
        if (!settings.on) void setSetting("on", true);
        load();
        if (path !== "/ask") {
          setDock(true);
          greet();
        }
        ask(q);
      },
      rate: (id: string, v: "up" | "dn") => {
        const cur = msgs.find((m) => m.id === id)?.fb ?? 0;
        const want = v === "up" ? 1 : -1;
        const next = (cur === want ? 0 : want) as -1 | 0 | 1;
        setMsgs((m) => m.map((x) => (x.id === id ? { ...x, fb: next } : x)));
        rateMaple(id, next).catch(() => {});
        if (next) toast(next === 1 ? "Thanks. That helps Maple get better." : "Thanks for telling us. The team reviews unhelpful answers.");
      },
      setSetting,
      deleteHistory: async () => {
        const r = await deleteMapleHistory().catch(() => ({ error: "Could not delete it. Please try again." }));
        if (r.error) {
          toast(r.error);
          return false;
        }
        setMsgs([]);
        setSince(null);
        saveUi({ since: null });
        toast("Your Maple history is deleted");
        return true;
      },
      newChat: () => {
        const now = new Date().toISOString();
        setSince(now);
        saveUi({ since: now });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, first, isNew, plan, settings, msgs, loaded, left, busy, draft, dock, greeted, since, load, ask, setSetting, path],
  );
  return <MapleCtx.Provider value={value}>{children}</MapleCtx.Provider>;
}
