import type { ReactionKind } from "@/lib/reactions";

/**
 * The hub's own reaction icons: a coloured round badge with a white symbol, drawn the same on every device
 * (phone emoji look different on Windows, Mac and Android). Works in server and client components (no hooks).
 */
const RX: Record<ReactionKind, { from: string; to: string; fill?: boolean; d: string }> = {
  like: { from: "#4F8BFF", to: "#1D5FE0", fill: true, d: '<path d="M7 10v11H4.5A1.5 1.5 0 0 1 3 19.5v-8A1.5 1.5 0 0 1 4.5 10Z"/><path d="M9 21h8.6a2 2 0 0 0 1.97-1.66l1.2-7A2 2 0 0 0 18.8 10H14l.8-4.2A2.2 2.2 0 0 0 12.6 3.2L9 9.8Z"/>' },
  celebrate: { from: "#34C38F", to: "#0E8A5F", d: '<path d="M5.8 11.3 2 22l10.7-3.8"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/><path d="M14 10l.9-1.6c.3-.6.9-.9 1.5-.9h.5c.9 0 1.5-.8 1.4-1.6a2.9 2.9 0 0 1 2-3.1L22 2"/><path d="M11 2l.3.8c.3.9-.2 1.8-1.1 2-.7.1-1.2.7-1.2 1.4V7"/><path d="M17 15h.6c.7 0 1.3-.5 1.4-1.2.2-.9 1.1-1.5 2-1.1l1 .3"/>' },
  support: { from: "#A78BFA", to: "#6D3FE0", d: '<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 15 6 6"/><path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z"/>' },
  love: { from: "#FF6B8A", to: "#E0244C", fill: true, d: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
  insight: { from: "#FFC24D", to: "#E08A00", d: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>' },
  funny: { from: "#FF9A4D", to: "#E85D0C", d: '<circle cx="12" cy="12" r="9.2"/><path d="M17.5 13a5.5 5.5 0 0 1-11 0Z" fill="#fff"/><path d="M8.6 9.2h.01M15.4 9.2h.01" stroke-width="2.8"/>' },
};

export function RxIcon({ kind, size = 20, ring = true }: { kind: ReactionKind; size?: number; ring?: boolean }) {
  const r = RX[kind];
  const g = Math.round(size * 0.56);
  return (
    <span
      aria-hidden="true"
      className="rxi"
      style={{
        width: size, height: size, borderRadius: "50%", display: "inline-grid", placeItems: "center", flex: "none", color: "#fff",
        background: `linear-gradient(160deg, ${r.from}, ${r.to})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.12)${ring ? ", 0 0 0 1.5px var(--surface, #fff)" : ""}`,
      }}
    >
      <svg viewBox="0 0 24 24" width={g} height={g} fill={r.fill ? "#fff" : "none"} stroke="#fff" strokeWidth={r.fill ? 1.2 : 2.1} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: r.d }} />
    </span>
  );
}

/** The reaction's symbol alone, in the current text colour (no badge): used on the React button once you have reacted. */
export function RxGlyph({ kind, size = 17 }: { kind: ReactionKind; size?: number }) {
  const r = RX[kind];
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill={r.fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={r.fill ? 1.2 : 1.9} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: r.d }} />;
}
