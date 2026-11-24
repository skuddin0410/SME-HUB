import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { serviceClient } from "@/lib/supabase/service";
import { eventToArgs, type StripeSubEvent } from "@/lib/billing";
import { enrolPaidCourse } from "@/lib/course-payments";

export const runtime = "nodejs";

/**
 * Stripe tells us when a subscription starts, changes or ends. The signature is checked on the raw body,
 * each event is applied once, and events that arrive late or out of order are ignored by the database.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = serviceClient();
  if (!stripe || !secret || !db) return NextResponse.json({ error: "Billing is not set up" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  // Update 4: a paid course. Enrol only after Stripe confirms the payment (never on the browser redirect).
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as { id: string; payment_status?: string; payment_intent?: string | null; metadata?: Record<string, string> | null; amount_total?: number | null; customer_details?: { email?: string | null } | null };
    if (s.metadata?.kind === "course") {
      if (s.payment_status !== "paid") return NextResponse.json({ received: true, pending: true });
      const r = await enrolPaidCourse(db, stripe, s);
      return r.ok ? NextResponse.json({ received: true, course: true }) : NextResponse.json({ error: "Could not enrol" }, { status: 500 });
    }
  }

  // a full refund of a course payment (issued by the Hub team in Stripe) removes that enrolment
  if (event.type === "charge.refunded") {
    const ch = event.data.object as { refunded?: boolean; payment_intent?: string | null };
    if (ch.refunded && typeof ch.payment_intent === "string") {
      const { error } = await db.from("enrolments").delete().eq("payment_id", ch.payment_intent);
      if (error) return NextResponse.json({ error: "Could not apply" }, { status: 500 });
    }
  }

  const args = eventToArgs(event as unknown as StripeSubEvent, process.env);
  if (!args) return NextResponse.json({ received: true, ignored: true });

  // the member comes from the checkout we created; failing that, from the Stripe customer we already know
  let userId = args.p_user;
  if (!userId) {
    const { data } = await db.from("billing_customers").select("user_id").eq("stripe_customer_id", args.p_customer).maybeSingle();
    userId = (data?.user_id as string | undefined) ?? null;
  }
  if (!userId) return NextResponse.json({ received: true, ignored: true });

  const { data, error } = await db.rpc("apply_subscription", { ...args, p_user: userId });
  // a database error asks Stripe to retry later
  if (error) return NextResponse.json({ error: "Could not apply" }, { status: 500 });
  return NextResponse.json({ received: true, result: data });
}
