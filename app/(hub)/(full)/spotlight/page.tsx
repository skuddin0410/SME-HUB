import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { getMyReady } from "@/lib/ready";
import { Ic } from "@/components/zip/ic";
import { ReadyRows } from "@/components/ready/card";
import { SpotlightForm } from "@/components/ready/spotlight";
import { pageMeta } from "@/lib/seo";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/profile-completion.css";

export const metadata = pageMeta({ title: "Member Spotlight", description: "Get featured in CanadianSME Small Business Magazine and its newsletter.", path: "/spotlight" });

/** Member Spotlight: members with a ready profile apply once; the Hub team picks members each month. */
export default async function SpotlightPage() {
  const { supabase, userId } = await getViewer();
  const head = (
    <div className="pagehead">
      <p className="eyebrow">Member Spotlight</p>
      <h1>Get featured in CanadianSME</h1>
      <p className="muted" style={{ fontSize: 15, maxWidth: 720 }}>Every month, CanadianSME Small Business Magazine and its newsletter feature SME Hub members and their businesses. Apply once. The editorial team picks members each month.</p>
    </div>
  );
  const wrap = (body: React.ReactNode) => (
    <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>{head}{body}</div></div>
  );
  if (!userId) {
    return wrap(
      <div className="card pcspot">
        <p>Join SME Hub free to apply.</p>
        <Link className="btn" href="/auth/sign-up" style={{ alignSelf: "flex-start" }}>Join free</Link>
      </div>,
    );
  }
  const me = await getMyReady();
  const { data } = await supabase.from("spotlight_applications").select("status").eq("member_id", userId).in("status", ["received", "chosen", "published"]).order("created_at", { ascending: false }).limit(1);
  const app = ((data ?? []) as { status: string }[])[0];
  if (app) {
    const chosen = app.status !== "received";
    return wrap(
      <div className="card pcspot pcdone">
        <span className="sq big"><Ic n="check" s={22} /></span>
        <h2>{chosen ? "You’re in the next Member Spotlight" : "Application received"}</h2>
        <p className="muted">{chosen ? "The CanadianSME editorial team chose you. We messaged you the next steps." : "The CanadianSME editorial team picks members each month. We’ll message you if you’re chosen. Keep your profile up to date in the meantime."}</p>
        <Link className="btn ghost" href={`/members/${userId}`} style={{ alignSelf: "flex-start" }}>View my profile</Link>
      </div>,
    );
  }
  if (!me || me.count < 5) {
    return wrap(
      <div className="card pcspot">
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <span className="sq big"><Ic n="lock" s={22} /></span>
          <div className="stack" style={{ gap: 6 }}>
            <h2>Finish your profile to apply</h2>
            <p className="muted">Editors look at your profile and business page first. You’re {me?.count ?? 0} of 5 ready.</p>
          </div>
        </div>
        <ReadyRows />
      </div>,
    );
  }
  return wrap(
    <div className="pcsplit">
      <SpotlightForm />
      <aside className="card pcspot">
        <span className="eyebrow">What you get</span>
        <ul className="pclist">
          <li>A feature in CanadianSME Small Business Magazine</li>
          <li>A mention in the newsletter</li>
          <li>A post on CanadianSME social media</li>
          <li>A Spotlight badge on your profile for 30 days</li>
        </ul>
        <p className="muted small">Free for every member with a ready profile.</p>
      </aside>
    </div>,
  );
}
