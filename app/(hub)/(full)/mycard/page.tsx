import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { Crumbs } from "@/components/zip/crumbs";
import { CardStudio, type StudioInit } from "@/components/zip/card-studio";
import { qrSvg, type CardStyle } from "@/lib/business-card";
import "@/styles/u31-40.css";

export const metadata = { title: "My business card", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Update 31: My business card. One screen: the live card on the left, the style and switches on the right. */
export default async function Page() {
  const { supabase, userId, profile } = await getViewer();
  if (!userId) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div className="card" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center", alignItems: "center" }}>
          <h1 style={{ font: "800 20px var(--display)", margin: 0 }}>Make your free business card</h1>
          <p className="muted">Join SME Hub to make a card people can scan to save your contact.</p>
          <Link className="btn dark" href="/auth/sign-up?next=/mycard">Join free</Link>
        </div>
      </div></div>
    );
  }
  const h = await supabase.from("profiles").select("handle").eq("id", userId).maybeSingle();
  const handle = (h.data as { handle?: string | null } | null)?.handle ?? null;
  let card = h.error ? null : (await supabase.from("business_cards").select("*").eq("member_id", userId).maybeSingle());
  if (card && !card.error && !card.data && handle) {
    // the first visit makes the card with the safe defaults, so the card page works straight away
    await supabase.from("business_cards").insert({ member_id: userId });
    card = await supabase.from("business_cards").select("*").eq("member_id", userId).maybeSingle();
  }
  if (!handle || !card || card.error || !card.data) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div className="card bcgone"><h1>My business card is almost ready</h1><p className="muted" style={{ margin: 0 }}>You’ll be able to make your free card very soon.</p></div>
      </div></div>
    );
  }
  const c = card.data as Record<string, unknown>;
  const [details, biz, stats] = await Promise.all([
    supabase.from("profile_details").select("core").eq("user_id", userId).maybeSingle(),
    supabase.from("companies").select("name").eq("owner_id", userId).eq("status", "published").order("created_at").limit(1).maybeSingle(),
    supabase.from("business_card_stats").select("opens, saves").eq("member_id", userId).eq("month", new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" }).slice(0, 8) + "01").maybeSingle(),
  ]);
  const core = ((details.data as { core?: Record<string, string> } | null)?.core ?? {}) as Record<string, string>;
  const headline = profile?.headline ?? "";
  const [t0, ...rest] = headline.split(", ");
  const init: StudioInit = {
    handle,
    name: profile?.full_name || "SME Hub member",
    avatar: profile?.avatar_url ?? null,
    style: (c.style as CardStyle) ?? "classic",
    show: { title: !!c.show_title, business: !!c.show_business, city: !!c.show_city, phone: !!c.show_phone, email: !!c.show_email, website: !!c.show_website },
    own: { title: (c.title as string) ?? "", phone: (c.phone as string) ?? "", email: (c.email as string) ?? "", website: (c.website as string) ?? "" },
    profile: {
      title: (t0 ?? "").trim(),
      business: (biz.data as { name?: string } | null)?.name ?? rest.join(", ").trim(),
      city: profile?.location ?? "",
      phone: core.phone ?? "",
      email: core.email ?? "",
      website: (profile as { website?: string } | null)?.website ?? "",
    },
    stats: (stats.data as { opens: number; saves: number } | null) ?? { opens: 0, saves: 0 },
  };
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <Crumbs items={[["My business card"]]} />
      <CardStudio init={init} qr={qrSvg(handle, "#0F172A", 2)} qrBig={qrSvg(handle)} />
    </div></div>
  );
}
