import Link from "next/link";

/** The guide's round avatar: a photo if there is one, otherwise the person's initial. */
export function ZipAv({ name, src, size }: { name: string; src?: string | null; size?: "s" | "l" | "xl" }) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <span className={`av${size ? ` ${size}` : ""}`} aria-hidden="true">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" />
      ) : (
        initial
      )}
    </span>
  );
}

export function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  const d = Math.floor(s / 86400);
  if (d < 14) return d === 1 ? "Yesterday" : `${d} days ago`;
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

export function Join({ children, className = "btn", label, start }: { children: React.ReactNode; className?: string; label?: string; start?: boolean }) {
  return (
    <Link href="/auth/sign-up" className={className} aria-label={label} style={start ? { alignSelf: "flex-start" } : undefined}>
      {children}
    </Link>
  );
}
