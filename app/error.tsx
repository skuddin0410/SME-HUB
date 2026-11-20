"use client";

import { useEffect } from "react";

/** Shown instead of a blank "Application error" screen when a page or a save fails unexpectedly. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">That did not work</h1>
      <p className="mt-2 text-sm text-muted-foreground">Nothing was saved. Try again; if it keeps happening, reload the page.</p>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={reset} className="press rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90">
          Try again
        </button>
        <a href="/feed" className="press rounded-xl border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
          Go to the feed
        </a>
      </div>
      {error.digest && <p className="mt-4 text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </main>
  );
}
