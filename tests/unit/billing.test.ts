import { describe, expect, it } from "vitest";
import { eventToArgs, planForPrice, priceFor, type StripeSubEvent } from "@/lib/billing";

const env = { STRIPE_PRICE_PLUS_MONTHLY: "price_pm", STRIPE_PRICE_PLUS_YEARLY: "price_py", STRIPE_PRICE_ADVISOR_YEARLY: "price_ay" };
const ev = (over: Partial<StripeSubEvent> = {}, price = "price_py", status = "active"): StripeSubEvent => ({
  id: "evt_1",
  type: "customer.subscription.updated",
  created: 1_800_000_000,
  data: { object: { id: "sub_1", customer: "cus_1", status, cancel_at_period_end: false, metadata: { user_id: "u1" }, items: { data: [{ price: { id: price }, current_period_end: 1_810_000_000 }] } } },
  ...over,
});

describe("plans and prices", () => {
  it("maps a Stripe price to a plan and period", () => {
    expect(planForPrice("price_pm", env)).toEqual({ plan: "plus", interval: "month" });
    expect(planForPrice("price_ay", env)).toEqual({ plan: "advisor", interval: "year" });
    expect(planForPrice("price_other", env)).toBeNull();
    expect(planForPrice(undefined, env)).toBeNull();
  });
  it("has no unset price match an empty setting", () => {
    expect(planForPrice("", {})).toBeNull();
    expect(planForPrice("x", { STRIPE_PRICE_PLUS_MONTHLY: undefined })).toBeNull();
  });
  it("sells Advisor yearly only", () => {
    expect(priceFor("advisor", "month", env)).toBeUndefined();
    expect(priceFor("advisor", "year", env)).toBe("price_ay");
    expect(priceFor("plus", "month", env)).toBe("price_pm");
  });
});

describe("a Stripe event becomes database arguments", () => {
  it("reads plan, member, period and status", () => {
    const a = eventToArgs(ev(), env)!;
    expect(a).toMatchObject({ p_event: "evt_1", p_user: "u1", p_customer: "cus_1", p_sub: "sub_1", p_plan: "plus", p_interval: "year", p_status: "active", p_cancel: false });
    expect(a.p_period_end).toBe(new Date(1_810_000_000 * 1000).toISOString());
  });
  it("treats a deleted subscription as cancelled whatever Stripe last said", () => {
    expect(eventToArgs(ev({ type: "customer.subscription.deleted" }), env)!.p_status).toBe("canceled");
  });
  it("ignores other events and prices we do not sell", () => {
    expect(eventToArgs(ev({ type: "invoice.paid" }), env)).toBeNull();
    expect(eventToArgs(ev({}, "price_unknown"), env)).toBeNull();
  });
  it("accepts an expanded customer and falls back to the subscription period", () => {
    const e = ev();
    (e.data.object as { customer: unknown }).customer = { id: "cus_9" };
    e.data.object.items!.data[0].current_period_end = undefined;
    (e.data.object as { current_period_end?: number }).current_period_end = 1_820_000_000;
    const a = eventToArgs(e, env)!;
    expect(a.p_customer).toBe("cus_9");
    expect(a.p_period_end).toBe(new Date(1_820_000_000 * 1000).toISOString());
  });
});
