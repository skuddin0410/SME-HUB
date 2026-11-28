/** Maple's avatar: a white maple leaf on red, never a human face (Update 46). */
export const MAPLE_LEAF = "M50 4 57 19 65 14 62 38 76 24 80 33 93 31 88 47 96 52 73 68 76 77 54 74 54 96 46 96 46 74 24 77 27 68 4 52 12 47 7 31 20 33 24 24 38 38 35 14 43 19Z";

export function MapleLeaf({ size, big = false }: { size: number; big?: boolean }) {
  const s = Math.round(size * 0.62);
  return (
    <span className={`mlav${big ? " big" : ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <path d={MAPLE_LEAF} fill="#fff" />
      </svg>
    </span>
  );
}

export function MapleTag({ lg = false }: { lg?: boolean }) {
  return <span className={`mltag${lg ? " lg" : ""}`}>AI</span>;
}
