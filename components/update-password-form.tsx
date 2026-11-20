"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { changePassword, type PasswordState } from "@/app/auth/update-password/actions";
import { BODY, CARD, FORM_ERROR, ICON, INPUT, LABEL, PRIMARY, TITLE } from "@/components/auth-ui";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, { error: null });
  const [show, setShow] = useState(false);

  return (
    <form action={action} noValidate className={`${CARD} space-y-4`}>
      <div className="space-y-1.5">
        <h1 className={TITLE}>Choose a new password</h1>
        <p className={BODY}>Use 8 or more characters with a number and a symbol. You stay signed in here and are signed out on your other devices.</p>
      </div>
      {(["password", "confirm"] as const).map((name) => (
        <div key={name}>
          <label htmlFor={name} className={LABEL}>
            {name === "password" ? "New password" : "Confirm new password"}
          </label>
          <div className="relative">
            <Lock className={ICON} />
            <input
              id={name}
              name={name}
              type={show ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="new-password"
              autoFocus={name === "password"}
              required
              minLength={8}
              maxLength={72}
              className={INPUT.replace("pr-3.5", "pr-10")}
            />
            {name === "password" && (
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label="Toggle password visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      ))}
      {state.error && (
        <p role="alert" className={FORM_ERROR}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={PRIMARY}>
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>Save new password</span>
        {!pending && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
      </button>
    </form>
  );
}
