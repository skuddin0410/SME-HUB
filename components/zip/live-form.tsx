"use client";

import { useRef } from "react";

/** A GET form that re-submits when a select or checkbox changes, so filters apply at once like the guide's. */
export function LiveForm({ children, className, role }: { children: React.ReactNode; className?: string; role?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className={className}
      role={role}
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "SELECT" || (t instanceof HTMLInputElement && t.type === "checkbox")) ref.current?.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
