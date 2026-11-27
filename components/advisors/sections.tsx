import { getViewer } from "@/lib/hub";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { advWhen, type AdvSlot } from "@/lib/advisors";
import { AdvisorBooking, ReviewAdvisor, SeatButton } from "./booking";
import { ConsultBook, type ConsultBookData } from "./consult-book";
import { consultTimes } from "@/lib/apps/consult-server";
import type { BookedView } from "@/app/(hub)/consult-actions";
import Link from "next/link";

const Stars = ({ r }: { r: number }) => <span className="stars" role="img" aria-label={`Rated ${r} out of 5`}>{"★★★★★".slice(0, Math.round(r))}</span>;

type AP = { field: string; years: number; helped: number; rating: number | null; reply: string; langs: string; creds: string[]; services: { name: string; text: string }[]; session_title: string; session_at: string | null; active: boolean };

/** An SMB Advisor's sections on their profile (handoff: advSections). */
export async function AdvisorSections({ memberId, name }: { memberId: string; name: string }) {
  const { supabase, userId } = await getViewer();
  // The session and "active" fields come with the advisor booking update (migration 0063). Until that update is on a
  // database, read the original advisor fields instead of hiding the advisor's sections.
  const full = await supabase.from("advisor_profiles").select("field, years, helped, rating, reply, langs, creds, services, session_title, session_at, active").eq("user_id", memberId).maybeSingle();
  let apRow = full.data as AP | null;
  if (full.error) {
    const base = await supabase.from("advisor_profiles").select("field, years, helped, rating, reply, langs, creds, services").eq("user_id", memberId).maybeSingle();
    apRow = base.data ? ({ ...(base.data as Omit<AP, "session_title" | "session_at" | "active">), session_title: "", session_at: null, active: true }) : null;
  }
  const ap = apRow;
  // Update 36: SME Advisors (the Advisor plan) take free consultations booked from a calendar on their profile
  const { data: pl } = await supabase.from("profiles").select("plan, profile_type").eq("id", memberId).maybeSingle();
  const smeAdvisor = (pl as { plan?: string } | null)?.plan === "advisor" || (pl as { profile_type?: string } | null)?.profile_type === "advisor";
  const consult = smeAdvisor ? await consultCard(memberId, name, userId) : null;
  if (!ap || !ap.active) return consult;
  const now = new Date().toISOString();
  const [slotsRes, mineRes, seatRes, revRes, pastRes] = await Promise.all([
    supabase.from("advisor_slots").select("id, starts_at, minutes").eq("advisor_id", memberId).is("booked_by", null).gt("starts_at", now).order("starts_at").limit(6),
    userId ? supabase.from("advisor_slots").select("id, starts_at").eq("advisor_id", memberId).eq("booked_by", userId).gt("starts_at", now).order("starts_at").limit(1) : Promise.resolve({ data: [] }),
    userId ? supabase.from("advisor_seats").select("advisor_id").eq("advisor_id", memberId).eq("member_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("advisor_reviews").select("member_id, rating, body, status, member:profiles!advisor_reviews_member_id_fkey(full_name, avatar_url, headline)").eq("advisor_id", memberId).eq("status", "published").order("created_at", { ascending: false }).limit(10),
    userId ? supabase.from("advisor_slots").select("id").eq("advisor_id", memberId).eq("booked_by", userId).lt("starts_at", now).limit(1) : Promise.resolve({ data: [] }),
  ]);
  const first = name.split(" ")[0] || name;
  const slots: AdvSlot[] = ((slotsRes.data ?? []) as { id: string; starts_at: string; minutes: number }[]).map((s) => ({ id: s.id, at: s.starts_at, minutes: s.minutes }));
  const mine = ((mineRes.data ?? []) as { id: string; starts_at: string }[])[0];
  const reviews = (revRes.data ?? []) as unknown as { member_id: string; rating: number; body: string; member: { full_name: string | null; avatar_url: string | null; headline: string | null } | null }[];
  const rating = ap.rating ?? (reviews.length ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10 : null);
  // a past intro call or a past free consultation (Update 36) lets the member review the Advisor
  const pastCall = ((pastRes.data ?? []) as unknown[]).length > 0 || (!!userId && userId !== memberId && !!(await supabase.from("consult_bookings").select("id").eq("advisor_id", memberId).eq("member_id", userId).eq("status", "booked").lt("starts_at", now).limit(1).maybeSingle()).data);
  const canReview = !!userId && userId !== memberId && pastCall && !reviews.some((r) => r.member_id === userId);
  const isMe = userId === memberId;
  return (
    <>
      <div className="card psec">
        <div className="row"><h2 className="grow">SMB Advisor</h2>{ap.field && <span className="tag">{ap.field}</span>}</div>
        <div className="advband">
          <div><b>{ap.years}</b><span>years of experience</span></div>
          <div><b>{ap.helped}</b><span>members helped</span></div>
          <div><b>{rating ?? "New"} {rating ? <Stars r={rating} /> : null}</b><span>average rating</span></div>
          <div><b style={{ fontSize: 16, lineHeight: "25px" }}>{ap.reply || "Within 1 day"}</b><span>usual reply time</span></div>
        </div>
        {(ap.creds.length > 0 || ap.langs) && (
          <div className="stack small" style={{ gap: 4 }}>
            {ap.creds.map((c) => <span key={c}>✓ {c}</span>)}
            {ap.langs && <span className="muted">Languages: {ap.langs}</span>}
          </div>
        )}
      </div>
      {ap.services.length > 0 && (
        <div className="card psec"><h2>How {first} can help</h2><div className="svc">{ap.services.map((s) => <div key={s.name}><strong>{s.name}</strong><span className="muted">{s.text}</span></div>)}</div></div>
      )}
      {consult ?? (isMe ? (
        <div className="card psec" id="advbook">
          <h2>Your intro call times</h2>
          <p className="muted">{slots.length ? `${slots.length} open time${slots.length === 1 ? "" : "s"}: ${slots.slice(0, 3).map((s) => advWhen(s.at)).join(", ")}${slots.length > 3 ? "…" : ""}` : "You have no open times. Members cannot book a call until you add some."}</p>
          <Link className="btn sm" href="/team/advisors?mine=1" style={{ alignSelf: "flex-start" }}><Ic n="cal" />Manage my call times</Link>
        </div>
      ) : (
        <AdvisorBooking advisorId={memberId} first={first} slots={slots} booked={mine ? { id: mine.id, at: mine.starts_at } : null} member={!!userId} />
      ))}
      {ap.session_title && ap.session_at && new Date(ap.session_at) > new Date() && (
        <div className="card psec">
          <h2>Next live session</h2>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <span className="sq big"><Ic n="cal" s={22} /></span>
            <span className="grow"><strong>{ap.session_title}</strong><br /><span className="muted">{advWhen(ap.session_at)}</span></span>
            {!isMe && <SeatButton advisorId={memberId} initial={!!seatRes.data} member={!!userId} />}
          </div>
        </div>
      )}
      {(reviews.length > 0 || canReview) && (
        <div className="card psec">
          <div className="row"><h2 className="grow">What members say</h2>{rating ? <span><Stars r={rating} /> <b>{rating}</b></span> : null}</div>
          <div>
            {reviews.map((r) => (
              <div key={r.member_id} className="review">
                <ZipAv name={r.member?.full_name || "A member"} src={r.member?.avatar_url ?? null} size="s" />
                <div className="stack grow" style={{ gap: 2 }}>
                  <span><Link className="namebtn" href={`/members/${r.member_id}`}>{r.member?.full_name || "A member"}</Link> <span className="muted small">· {r.member?.headline ?? ""}</span></span>
                  <Stars r={r.rating} />
                  <span>{r.body}</span>
                </div>
              </div>
            ))}
          </div>
          {canReview && <ReviewAdvisor advisorId={memberId} first={first} />}
        </div>
      )}
    </>
  );
}

/** Update 36: the booking calendar (members) or "Your free consultations" (the Advisor on their own profile). */
async function consultCard(advisorId: string, name: string, userId: string | null) {
  const { supabase } = await getViewer();
  const first = name.split(" ")[0] || name;
  if (userId === advisorId) {
    const [{ data: open }, { count }] = await Promise.all([
      supabase.rpc("consult_open", { p_advisor: advisorId }),
      supabase.from("consult_bookings").select("id", { count: "exact", head: true }).eq("advisor_id", advisorId).eq("status", "booked").gt("starts_at", new Date().toISOString()),
    ]);
    return (
      <div className="card psec" id="advbook">
        <h2>Your free consultations</h2>
        <p className="muted">{open === true ? `Members can book a free call with you from this profile. ${count ? `${count} upcoming call${count === 1 ? "" : "s"}.` : "No calls booked yet."}` : "Members can’t book you yet. Connect Zoom and choose when you are available."}</p>
        <Link className="btn sm" href="/settings/consultations" style={{ alignSelf: "flex-start" }}><Ic n="cal" />Free consultation settings</Link>
      </div>
    );
  }
  const { pub, days } = await consultTimes(supabase, advisorId);
  let viewer: ConsultBookData["viewer"] = { signedIn: false, email: "", name: "", biz: "", web: "" };
  let booked: BookedView | null = null;
  if (userId) {
    const [u, me, co, bk] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("full_name, location, website").eq("id", userId).maybeSingle(),
      supabase.from("companies").select("name").eq("owner_id", userId).limit(1).maybeSingle(),
      supabase.from("consult_bookings").select("id, starts_at, minutes, topic, biz, join_url").eq("advisor_id", advisorId).eq("member_id", userId).eq("status", "booked")
        .gt("starts_at", new Date(Date.now() - 3600_000).toISOString()).order("starts_at").limit(1).maybeSingle(),
    ]);
    const p = (me.data ?? {}) as { full_name?: string | null; location?: string | null; website?: string | null };
    const city = (p.location ?? "").split(",")[0].trim();
    const coName = (co.data as { name?: string } | null)?.name ?? "";
    viewer = { signedIn: true, email: u.data.user?.email ?? "", name: p.full_name || "SME Hub member", biz: [coName, city].filter(Boolean).join(", "), web: p.website ?? "" };
    const b = bk.data as { id: string; starts_at: string; minutes: number; topic: string; biz: string; join_url: string | null } | null;
    if (b) booked = { id: b.id, at: b.starts_at, minutes: b.minutes, topic: b.topic, biz: b.biz, joinUrl: b.join_url };
  }
  const { data: av } = await supabase.from("profiles").select("avatar_url").eq("id", advisorId).maybeSingle();
  const d: ConsultBookData = {
    advisorId, name, first, avatar: (av as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    open: pub.open, len: pub.open ? pub.len : 30, q: pub.open ? { biz: pub.q_biz, topic: pub.q_topic, web: pub.q_web } : { biz: true, topic: true, web: false },
    days, viewer, booked,
  };
  return <ConsultBook d={d} />;
}
