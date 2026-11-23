"use client";

import { useEffect, useRef, useState } from "react";
import { passwordChecks, passwordScore, SCORE_LABEL } from "@/lib/auth/password";

export const Spin = () => <span className="spin" aria-hidden="true" />;

export function Err({ id, children }: { id: string; children?: React.ReactNode }) {
  return (
    <div className="er" id={`${id}-err`} aria-live="polite">
      {children}
    </div>
  );
}

/** A password box with Show / Hide and, when `meter` is set, the strength bar and the four rules. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  email,
  meter,
  autoComplete = "new-password",
  labelExtra,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: React.ReactNode;
  email?: string;
  meter?: boolean;
  autoComplete?: string;
  labelExtra?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const r = passwordChecks(value, email);
  const s = passwordScore(value, email);
  return (
    <div className="f">
      <label className="l" htmlFor={id}>
        {label}
        {labelExtra}
      </label>
      <div className="in">
        <input
          className="t"
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={`${id}-err`}
        />
        <button type="button" className="eye" aria-label={`${show ? "Hide" : "Show"} password`} aria-pressed={show} onClick={() => setShow(!show)}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <Err id={id}>{error}</Err>
      {meter && (
        <div>
          <div className="meter" data-s={value ? s : 0} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="mtx" aria-live="polite">
            {value ? SCORE_LABEL[s] : "Use 8 or more characters."}
          </div>
          <ul className="rules">
            <li className={r.len ? "ok" : ""}>8 or more characters</li>
            <li className={r.num ? "ok" : ""}>At least one number</li>
            <li className={r.mix ? "ok" : ""}>Upper and lower case, or a symbol</li>
            <li className={r.common ? "ok" : ""}>Not a common password</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** Six one-digit boxes that move on by themselves and accept a pasted code. */
export function CodeBoxes({ value, onChange, invalid, autoFocus }: { value: string; onChange: (v: string) => void; invalid?: boolean; autoFocus?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);
  const digits = value.padEnd(6, " ").split("");
  const set = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d || " ";
    onChange(next.join("").replace(/ +$/, ""));
  };
  const box = (i: number) => (
    <input
      key={i}
      ref={(el) => {
        refs.current[i] = el;
      }}
      inputMode="numeric"
      maxLength={1}
      autoComplete={i === 0 ? "one-time-code" : "off"}
      aria-label={`Digit ${i + 1}`}
      aria-invalid={invalid && digits[i] === " " ? "true" : undefined}
      value={digits[i] === " " ? "" : digits[i]}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, "").slice(-1);
        set(i, d);
        if (d) refs.current[i + 1]?.focus();
      }}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && !digits[i]?.trim() && i > 0) refs.current[i - 1]?.focus();
      }}
      onPaste={(e) => {
        const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!t) return;
        e.preventDefault();
        onChange(t);
        refs.current[Math.min(t.length, 5)]?.focus();
      }}
    />
  );
  return (
    <div className="code" role="group" aria-label="6-digit code">
      {[0, 1, 2].map(box)}
      <span className="dash">–</span>
      {[3, 4, 5].map(box)}
    </div>
  );
}

/** Counts down from `secs`, then lets the person press again. */
export function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, start: (secs: number) => setLeft(secs) };
}

export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
export const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="4" fill="#0A66C2" />
    <path fill="#fff" d="M7.1 9.5h2.6V18H7.1zM8.4 5.3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.3 9.5h2.5v1.2c.4-.7 1.2-1.4 2.6-1.4 2.7 0 3.2 1.8 3.2 4.1V18h-2.6v-4.1c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V18h-2.6z" />
  </svg>
);
export const MailIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
export const LockIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const CheckIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);
export const ClockIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
