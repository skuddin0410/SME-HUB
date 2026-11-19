"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { changePassword, type PasswordState } from "@/app/auth/update-password/actions";
import { AUTH_ALERT, AUTH_CTA, AUTH_ICON, AUTH_INPUT, NAVY } from "@/components/auth-ui";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, { error: null });
  const [show, setShow] = useState(false);

  return (
    <form action={action} noValidate>
      <h1 className={`text-[28px] font-semibold leading-tight ${NAVY}`}>Choose a new password</h1>
      <p className="mt-2 text-[15px] leading-6 text-slate-600">
        Use 8 or more characters with a mix of letters, numbers or symbols. You will stay signed in here and be signed out everywhere else.
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        {(["password", "confirm"] as const).map((name) => (
          <label key={name} className="relative block">
            <Lock className={AUTH_ICON} />
            <input
              name={name}
              type={show ? "text" : "password"}
              placeholder={name === "password" ? "New password" : "Type it again"}
              aria-label={name === "password" ? "New password" : "Confirm new password"}
              autoComplete="new-password"
              autoFocus={name === "password"}
              required
              minLength={8}
              maxLength={72}
              className={`${AUTH_INPUT} pr-12`}
            />
            {name === "password" && (
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide passwords" : "Show passwords"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            )}
          </label>
        ))}
      </div>
      {state.error && (
        <p role="alert" className={`mt-3 ${AUTH_ALERT}`}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`mt-4 ${AUTH_CTA}`}>
        {pending && <Loader2 className="h-5 w-5 animate-spin" />}
        Save new password
      </button>
    </form>
  );
}
