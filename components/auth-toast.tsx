"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; message: string; leaving: boolean };
const ToastContext = createContext<(message: string) => void>(() => {});

/** Small dark notices, bottom right, gone after about three seconds (design: showToast). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, leaving: false }]);
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), 2600);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2820);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium shadow-popover auth-fade-in transition-opacity duration-200"
            style={{ opacity: t.leaving ? 0 : 1 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
