"use client";
import { useFormStatus } from "react-dom";

/** Submit button in the guide's style; dims while the form is being sent. */
export function ZipSubmit({ children, className = "btn", disabled = false, name, value }: { children: React.ReactNode; className?: string; disabled?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} className={className} disabled={pending || disabled} style={pending || disabled ? { opacity: 0.6 } : undefined}>
      {children}
    </button>
  );
}
