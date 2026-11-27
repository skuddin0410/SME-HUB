import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { getViewer } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import { EmailBtn } from "@/components/zip/email-btn";
import { CARD_STYLES, bizLine, cardBg, cardLink, fromPublic, initials } from "@/lib/business-card";
import "@/styles/u31-40.css";

export const dynamic = "force-dynamic";

/** Update 31: the public card page, what people see when they scan a member's code. Works without an account. */
const getCard = cache(async (handle: string) => {
  if (!/^[a-z0-9-]{2,60}$/i.test(handle)) return null;
  const { supabase } = await getViewer();
  const { data, error } = await supabase.rpc("card_public", { p_handle: handle.toLowerCase() });
  if (error || !data) return null;
  return { ...fromPublic(data as Record<string, unknown>), paused: (data as { paused?: boolean }).paused === true };
});

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const c = await getCard(handle);
  if (!c || c.paused) return { title: "Card not available", robots: { index: false, follow: false } };
  const desc = [c.title, bizLine(c)].filter(Boolean).join(" · ") || "SME Hub member";
  // search engines only when the member turned it on (Settings and privacy, Business card)
  return { title: `${c.name}: business card`, description: desc, robots: c.searchable ? undefined : { index: false, follow: false }, openGraph: { title: `${c.name} on SME Hub`, description: desc } };
}

export default async function Page({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ s?: string }> }) {
  const { handle } = await params;
  await searchParams;
  const c = await getCard(handle);
  const { supabase, userId } = await getViewer();
  if (!c) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div className="card bcgone">
          <h1>This card is no longer available</h1>
          <p className="muted" style={{ margin: 0 }}>The member may have switched it off. Meet other Canadian small business owners on SME Hub.</p>
          {!userId && <Link className="btn dark" href="/auth/sign-up">Join free</Link>}
        </div>
      </div></div>
    );
  }
  if (c.paused && userId !== c.id) {
    // Update 33: "Pause my profile" also pauses the card page
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div className="card bcgone">
          <h1>This member is taking a break</h1>
          <p className="muted" style={{ margin: 0 }}>{c.name.split(" ")[0]} has paused their profile for now. Check back later.</p>
          {!userId && <Link className="btn dark" href="/auth/sign-up">Join free</Link>}
        </div>
      </div></div>
    );
  }
  if (c.handle !== handle.toLowerCase()) redirect(`/c/${c.handle}`); // an old link from before a name change
  const own = userId === c.id;
  if (!own) {
    // anonymous totals only; one address can't push the count up (60 opens per 10 minutes)
    const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
    const { data: allowed } = await supabase.rpc("rate_hit", { p_key: `card:${ip}`, p_max: 60, p_window: "10 minutes" });
    if (allowed !== false) await supabase.rpc("card_count", { p_handle: c.handle, p_kind: "open" });
  }
  const t = CARD_STYLES[c.style];
  const line = bizLine(c);
  const msg = userId ? `/messages?with=${c.id}` : `/auth/sign-up?next=${encodeURIComponent(`/messages?with=${c.id}`)}`;
  const site = c.website ? (/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`) : null;
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="bcpub">
        {own && (
          <div className="bcnote"><Ic n="eye" s={14} /><span>This is what people see when they scan your code.</span><Link href="/mycard">Back to my card</Link></div>
        )}
        <div className="bcphero" style={{ background: cardBg(t), color: t.ink }}>
          {t.stripe && <i className="bcstripe" style={{ background: t.acc }} />}
          {c.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="bcph" src={c.avatar} alt="" width={96} height={96} style={{ borderColor: t.ring }} />
          ) : (
            <span className="bcini" style={{ background: t.acc === "#111111" ? "#111111" : "#B3241A", borderColor: t.ring }}>{initials(c.name)}</span>
          )}
          <h1>{c.name}</h1>
          {c.title && <p style={{ color: t.sub }}>{c.title}</p>}
          {line && <p className="bpb">{line}</p>}
          <span className="bcmem" style={{ color: t.acc }}>SME HUB MEMBER</span>
        </div>
        <div className="bcpbtns">
          <a className="btn dark" href={`/c/${c.handle}/contact.vcf`} download={`${c.handle}.vcf`}><Ic n="users" s={15} />Save contact</a>
          {c.phone && <a className="btn ghost" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}><Ic n="phone" s={15} />Call</a>}
          {c.email && <EmailBtn enc={Buffer.from(c.email).toString("base64").split("").reverse().join("")} />}
          {!own && <Link className="btn ghost" href={msg}><Ic n="msg" s={15} />Message</Link>}
        </div>
        {site && (
          <a className="card bcplink" href={site} target="_blank" rel="noopener nofollow">
            <Ic n="globe" s={18} /><span><b>{c.website!.replace(/^https?:\/\//, "")}</b><small>Website</small></span>
          </a>
        )}
        {c.bizSlug && (
          <Link className="card bcplink" href={`/businesses/${c.bizSlug}`}>
            <Ic n="store" s={18} />
            <span>
              <b>{c.bizName}</b>
              <small>{c.bizReviews ? `${c.bizRating} ★ · ${c.bizReviews} review${c.bizReviews === 1 ? "" : "s"} · ` : ""}See services, hours and reviews on SME Hub</small>
            </span>
          </Link>
        )}
        {!userId ? (
          <div className="card bcjoin">
            <b>Not on SME Hub yet?</b>
            <span className="small muted">Make your own free business card and meet other Canadian small business owners.</span>
            <Link className="btn dark sm" href={`/auth/sign-up?next=${encodeURIComponent(`/members/${c.id}`)}`}>Join free</Link>
          </div>
        ) : !own ? (
          <div className="card bcjoin">
            <b>Met {c.name.split(" ")[0]} in person?</b>
            <span className="small muted">Connect on SME Hub to keep in touch.</span>
            <Link className="btn dark sm" href={`/members/${c.id}`}><Ic n="users" s={14} />Connect</Link>
          </div>
        ) : null}
        <p className="small muted" style={{ textAlign: "center", margin: 0 }}>{cardLink(c.handle)}</p>
      </div>
    </div></div>
  );
}
