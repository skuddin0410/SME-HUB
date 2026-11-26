import { TYPES } from "@/lib/zip/types";

/**
 * A member's type badge. The two top tiers get a premium medallion badge (option B): SME Advisor in gold with a crown,
 * Business owner in blue with a storefront, each with a coin icon that catches a light sweep now and then.
 * Every other type stays a plain tag, so the two tiers stand out. Works in server and client components.
 */
const CROWN = '<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3L21.18 5.5a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.66a1 1 0 0 0 1.52-.29z"/><path d="M5 21h14"/>';
const STORE = '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>';

export function TypeBadge({ type, size }: { type: string | null | undefined; size?: "sm" }) {
  const key = type && TYPES[type] ? type : "owner";
  const [label, bg, fg] = TYPES[key];
  if (key === "advisor" || key === "owner") {
    const adv = key === "advisor";
    return (
      <span className={`tbadge ${adv ? "adv" : "own"}${size === "sm" ? " sm" : ""}`}>
        <span className="tcoin" aria-hidden="true">
          <svg viewBox="0 0 24 24" width={size === "sm" ? 9 : 11} height={size === "sm" ? 9 : 11} fill={adv ? "currentColor" : "none"} stroke="currentColor" strokeWidth={adv ? 1.4 : 2.2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: adv ? CROWN : STORE }} />
        </span>
        {label}
      </span>
    );
  }
  return <span className="tag ptype" style={{ background: bg, color: fg }}>{label}</span>;
}
