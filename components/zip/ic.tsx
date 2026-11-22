import { ICON } from "@/lib/zip/icons";

/** The guide's icon: a 24x24 stroke icon drawn from its own path set. */
export function Ic({ n, s = 14, fill = "none", className, style }: { n: string; s?: number; fill?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill={fill} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style} dangerouslySetInnerHTML={{ __html: ICON[n] ?? "" }} />
  );
}
