import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { courseMail, siteUrl } from "@/lib/courses-mail";
import { dur } from "@/lib/courses-shared";

type Session = { id: string; payment_intent?: string | null; metadata?: Record<string, string> | null; amount_total?: number | null; customer_details?: { email?: string | null } | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Stripe confirmed a course payment: enrol the buyer (once per payment), then send the receipt (with
 * CanadianSME's GST/HST number from the GST_NO server setting) and the enrolment email. Emails never block the enrolment.
 */
export async function enrolPaidCourse(db: SupabaseClient, stripe: Stripe, s: Session): Promise<{ ok: boolean }> {
  const m = s.metadata ?? {};
  if (!UUID.test(m.course_id ?? "") || !UUID.test(m.user_id ?? "")) return { ok: true };
  const pay = (typeof s.payment_intent === "string" && s.payment_intent) || s.id;
  const { data: receipt, error } = await db.rpc("enrol_paid", {
    p_member: m.user_id, cid: m.course_id, p_payment: pay, p_amount: +m.price_cents || 0, p_tax: +m.tax_cents || 0, p_tax_label: m.tax_label ?? "",
  });
  if (error) return { ok: false };
  try {
    const [{ data: c }, { data: ls }, { data: ins }, { data: u }] = await Promise.all([
      db.from("courses").select("id, slug, title").eq("id", m.course_id).maybeSingle(),
      db.from("lessons").select("id, title, minutes, position, section:course_sections(position)").eq("course_id", m.course_id),
      db.from("course_instructors").select("profiles(full_name)").eq("course_id", m.course_id).order("position"),
      db.auth.admin.getUserById(m.user_id),
    ]);
    const lessons = ((ls ?? []) as unknown as { id: string; title: string; minutes: number; position: number; section: { position: number } | null }[])
      .sort((a, b) => (a.section?.position ?? 0) - (b.section?.position ?? 0) || a.position - b.position);
    const email = u.user?.email ?? s.customer_details?.email ?? null;
    const name = (u.user?.user_metadata?.first_name as string | undefined) ?? "";
    if (!c || !email) return { ok: true };
    const start = lessons[0] ? `${siteUrl()}/courses/${c.slug}/learn/${lessons[0].id}` : `${siteUrl()}/courses/${c.slug}`;
    let card = "";
    try {
      if (typeof s.payment_intent === "string") {
        const pi = await stripe.paymentIntents.retrieve(s.payment_intent, { expand: ["latest_charge"] });
        const ch = pi.latest_charge as Stripe.Charge | null;
        const cd = ch?.payment_method_details?.card;
        if (cd) card = `${cd.brand ? cd.brand[0].toUpperCase() + cd.brand.slice(1) : "Card"} ending ${cd.last4}`;
      }
    } catch {}
    await courseMail("course-receipt", { email, name }, {
      paid_course: c.title, course_receipt_no: receipt as string, paid_date: new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(new Date()),
      paid_price: money(+m.price_cents || 0), paid_tax: money(+m.tax_cents || 0), paid_total: money((+m.price_cents || 0) + (+m.tax_cents || 0)),
      tax_label: m.tax_label ?? "", gst_no: process.env.GST_NO ?? "", card, invoice_url: `${siteUrl()}/billing`, start_url: start,
    }, `course-receipt-${pay}`);
    await courseMail("course-enrolled", { email, name }, {
      course_title: c.title, course_instructor: ((ins ?? []) as unknown as { profiles: { full_name: string } | null }[]).map((i) => i.profiles?.full_name).filter(Boolean).join(" and "),
      course_lessons: lessons.length, course_length: dur(lessons.reduce((n, l) => n + l.minutes, 0)), course_url: `${siteUrl()}/courses/${c.slug}`,
      first_lesson: lessons[0]?.title ?? "", start_url: start, reason: "You get this because you take a course on SME Hub.", unsubscribe_url: `${siteUrl()}/settings`,
    }, `course-enrolled-${m.user_id}-${c.id}`);
  } catch (e) {
    console.error("course purchase emails:", (e as Error).message);
  }
  return { ok: true };
}
