import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { CARD_STYLES, bizLine, cardLink, fromPublic } from "@/lib/business-card";

/** Update 31: the share preview for a card link: the card's style, name, title and business. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SME Hub business card";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data } = /^[a-z0-9-]{2,60}$/i.test(handle) ? await supabase.rpc("card_public", { p_handle: handle.toLowerCase() }) : { data: null };
  const c = data ? fromPublic(data as Record<string, unknown>) : null;
  const t = CARD_STYLES[c?.style ?? "classic"];
  const bg = t.g ? `linear-gradient(160deg, ${t.bg}, ${t.g})` : t.bg;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: bg, color: t.ink, position: "relative" }}>
        {t.stripe && <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 18, background: t.acc }} />}
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: t.acc }}>SME HUB MEMBER</div>
        <div style={{ fontSize: 76, fontWeight: 800, marginTop: 18 }}>{c?.name ?? "SME Hub"}</div>
        {c?.title && <div style={{ fontSize: 36, color: t.sub, marginTop: 8 }}>{c.title}</div>}
        {c && bizLine(c) && <div style={{ fontSize: 36, fontWeight: 700, marginTop: 6 }}>{bizLine(c)}</div>}
        <div style={{ fontSize: 28, color: t.sub, marginTop: 40 }}>{c ? cardLink(c.handle) : "smehub.ca"}</div>
      </div>
    ),
    size,
  );
}
