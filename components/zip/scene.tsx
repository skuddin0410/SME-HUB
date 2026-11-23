import { scene } from "@/lib/zip/scene";

/** One of the guide's illustrations. They are drawn from our own code, so the markup is safe to insert. */
export function Scene({ n, h = 190, className }: { n: string; h?: number; className?: string }) {
  return <span className={className} style={{ display: "block", lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: scene(n, h) }} />;
}
