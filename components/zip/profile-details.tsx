import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { CopyProfileLink } from "@/components/zip/member-actions";
import { SOCIAL_MARK, SOCIAL_NETWORKS, VISIBILITY_LEVELS } from "@/lib/profile-extra";
import type { Field } from "@/lib/zip/settings";

export type DetailCell = { vis: string; ok: boolean; v: unknown };

const visLabel = (v: string) => VISIBILITY_LEVELS[v as keyof typeof VISIBILITY_LEVELS] ?? VISIBILITY_LEVELS.public;
const webHref = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

function Value({ k, v, nets }: { k: string; v: unknown; nets: Record<string, boolean> }) {
  if (k === "social" && v && typeof v === "object") {
    const links = SOCIAL_NETWORKS.filter(([n]) => (v as Record<string, string>)[n] && nets[n] !== false).slice(0, 13);
    if (!links.length) return null;
    return (
      <span className="socs">
        {links.map(([n, label]) => (
          <a key={n} className="soc" href={(v as Record<string, string>)[n]} target="_blank" rel="noopener nofollow ugc" title={label} aria-label={label}>{SOCIAL_MARK[n] ?? n}</a>
        ))}
      </span>
    );
  }
  if (k === "history" && Array.isArray(v)) {
    return (
      <span className="stack" style={{ gap: 8 }}>
        {(v as { role: string; org?: string; years?: string }[]).map((r, i) => (
          <span key={i} className="stack" style={{ gap: 1 }}>
            <strong>{r.role}</strong>
            <span className="muted small">{[r.org, r.years].filter(Boolean).join(" · ")}</span>
          </span>
        ))}
      </span>
    );
  }
  if (k === "web" && typeof v === "string") {
    return <a className="linkbtn" style={{ color: "var(--accent)", fontWeight: 600 }} href={webHref(v)} target="_blank" rel="noopener nofollow ugc">{v.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</a>;
  }
  if (k === "email" && typeof v === "string") return <a href={`mailto:${v}`}>{v}</a>;
  if (k === "phone" && typeof v === "string") return <a href={`tel:${v.replace(/[^0-9+]/g, "")}`}>{v}</a>;
  if (typeof v === "string" || typeof v === "number") return <>{String(v)}</>;
  return null;
}

/**
 * The Details section of a profile (the hand-off's pDetails): the team's profile fields in their groups, each shown
 * only to the audience chosen for it. The member sees every field, with who can see it and "Not filled in yet";
 * other viewers see what they are allowed to, and a line listing what is not shown to them.
 */
export function ProfileDetails({ fields, cells, me, path, nets }: { fields: Field[]; cells: Record<string, DetailCell>; me: boolean; path: string; nets: Record<string, boolean> }) {
  const groups: string[] = [];
  for (const f of fields) if (!groups.includes(f.g)) groups.push(f.g);
  const hidden: string[] = [];
  const blocks = groups.map((g) => {
    const rows = fields.filter((f) => f.g === g).flatMap((f) => {
      const c = cells[f.k];
      if (!c) return [];
      if (!c.ok) { hidden.push(`${f.l} (${visLabel(c.vis).toLowerCase()})`); return []; }
      const has = c.v !== null && c.v !== undefined && c.v !== "" && !(Array.isArray(c.v) && !c.v.length);
      const shown = has ? <Value k={f.k} v={c.v} nets={nets} /> : null;
      if (!shown && !me) return [];
      return [(
        <div className="frow" key={f.k}>
          <span className="fl">{f.l}{me && <span className="fv"><Ic n={c.vis === "public" ? "eye" : "lock"} s={11} />{visLabel(c.vis)}</span>}</span>
          <span className="fd">{shown ?? <span className="muted">Not filled in yet</span>}</span>
        </div>
      )];
    });
    return rows.length ? <div className="fgroup" key={g}><h3>{g}</h3>{rows}</div> : null;
  });
  return (
    <div className="card psec">
      <div className="row">
        <h2 className="grow">Details</h2>
        {me && <Link className="btn sm ghost" href="/settings"><Ic n="lock" s={14} />Who can see this</Link>}
      </div>
      <div className="fgrid">
        {blocks}
        <div className="fgroup">
          <h3>Profile link</h3>
          <div className="frow"><span className="fl">Web address</span><span className="fd"><CopyProfileLink path={path} /></span></div>
        </div>
      </div>
      {hidden.length > 0 && (
        <p className="muted small" style={{ display: "flex", gap: 6, alignItems: "center" }}><Ic n="lock" s={13} />Not shown to you: {hidden.join(", ")}.</p>
      )}
    </div>
  );
}
