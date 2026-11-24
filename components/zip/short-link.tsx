import { Ic } from "@/components/zip/ic";
import { splitLinks, type TextPiece } from "@/lib/zip/post-text";

/** Update 10: a web address in a post or comment, shown short; it opens the full address in a new tab. */
export function ShortLink({ piece }: { piece: TextPiece }) {
  return (
    <a className="cplink" href={piece.href} target="_blank" rel="noopener nofollow ugc" title={piece.text}>
      <Ic n="ext" s={13} />{piece.short}
    </a>
  );
}

/** Text with its web addresses shown short (comments). */
export function LinkedText({ text }: { text: string }) {
  return <>{splitLinks(text).map((p, i) => (p.href ? <ShortLink key={i} piece={p} /> : p.text))}</>;
}
