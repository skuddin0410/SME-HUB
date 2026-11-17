"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function AdminLoginForm() {
  const router = useRouter();
  const denied = useSearchParams().get("denied");
  const [error, setError] = useState<string | null>(denied ? "This account does not have admin access." : null);
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
    router.push("/admin");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-2xl font-bold">SMB Hub admin</h1>
      <p className="mb-5 text-sm text-muted-foreground">Sign in with a staff account to manage the Hub.</p>
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
        Sign in to admin
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="cover flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
