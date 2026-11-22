"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function CmsLoginForm() {
  const router = useRouter();
  const denied = useSearchParams().get("denied");
  const [error, setError] = useState<string | null>(denied ? "This account does not have CMS access. Ask an admin to add you." : null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (denied) await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError("Wrong email or password.");
      setBusy(false);
      return;
    }
    router.push("/cms");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-7 shadow-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/smb-hub-logo.png" alt="SMB Hub" width={874} height={224} className="h-8 w-auto" />
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-[0.75rem] font-semibold text-white">
        <ShieldCheck className="h-3.5 w-3.5" /> CMS
      </span>
      <h1 className="mt-4 text-2xl font-bold">SMB Hub CMS</h1>
      <p className="mb-5 text-sm text-muted-foreground">Sign in with an admin account to manage the hub.</p>
      <label className="mb-3 grid gap-1.5 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className="field font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className="field font-normal" />
      </label>
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="press mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in to the CMS
      </button>
    </form>
  );
}

export default function CmsLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <Suspense>
        <CmsLoginForm />
      </Suspense>
    </main>
  );
}
