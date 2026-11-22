"use client";

import { AlertTriangle } from "lucide-react";

/** A CMS action or page that failed: says what went wrong and lets the admin try again. */
export default function CmsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-white p-6">
      <p className="flex items-center gap-2 font-semibold text-rose-700">
        <AlertTriangle className="h-4 w-4" /> That did not work
      </p>
      <p className="mt-1 text-[0.875rem] text-zinc-600">{error.message || "Something went wrong on the server."}</p>
      <button type="button" onClick={reset} className="mt-4 h-9 rounded-lg bg-zinc-900 px-3 text-[0.875rem] font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
