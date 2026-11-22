/** Plans and prices, and the translation of a Stripe subscription into what the database stores. No secrets here. */
export type PlanKey = "free" | "plus" | "advisor";
export type Interval = "month" | "year";

export const PLAN_INFO = {
  free: { name: "Free", blurb: "Join the conversation and start building your network.", month: 0, year: 0 },
  plus: { name: "Plus", blurb: "More reach for your company and your voice.", month: 19, year: 190 },
  advisor: { name: "Advisor", blurb: "For experts who serve small businesses.", month: null, year: 1990 },
} as const;

export const PLAN_FEATURES: Record<PlanKey, string[]> = {
  free: [
    "Profile, connections and messages",
    "One company listing",
    "Join any group and read every article",
    "Post questions, wins, jobs and introductions",
    "Blog posts reviewed before they go live",
    "3 people to meet every day and warm introductions",
    "10 AI questions a month",
    "See 2 names in “who viewed my profile”",
  ],
  plus: [
    "Everything in Free",
    "Featured company listing, shown first",
    "2 offers a month to all members",
    "Host 1 private group",
    "Blog posts published straight away",
    "Shown more often in daily suggestions",
    "100 AI questions a month plus grant application help",
    "Discounts on CanadianSME events",
    "The full profile-viewer list",
  ],
  advisor: [
    "Everything in Plus",
    "SMB Advisor badge",
    "A place on the Advisors page and in the feed slider",
    "Members book free intro calls",
    "4 offers a month",
    "Host 3 private groups",
    "Host events and sell courses",
    "One podcast interview and one advertorial a year",
    "AI leads: members asking about your specialty",
  ],
};

/** Plain-language meaning of each plan limit, for the comparison table. */
export const LIMIT_ROWS: { key: string; label: string; unit?: string }[] = [
  { key: "offers_per_month", label: "Offers you can post", unit: "a month" },
  { key: "private_groups", label: "Private groups you can host" },
  { key: "ai_per_month", label: "AI questions", unit: "a month" },
  { key: "viewer_names", label: "Profile viewers you can see by name" },
  { key: "daily_matches", label: "People to meet each day" },
];

export const DOWNGRADE_RULES = [
  "Nothing you made is deleted. Posts, groups, offers and your company listing stay.",
  "Private groups above your new limit are archived, oldest kept. Archived groups can still be read but take no new posts.",
  "Archived groups come back when you upgrade again, or when you are under the limit.",
  "Offers already posted stay up. You just cannot post new ones beyond your plan.",
  "Your Founding Member badge is kept for good.",
];

export function money(n: number) {
  return `$${n.toLocaleString("en-CA")}`;
}

// ---------- Stripe -> database ----------
export type PriceEnv = Record<string, string | undefined>;

/** Which of our plans a Stripe price id is. The ids live in server settings, never in code. */
export function planForPrice(priceId: string | undefined, env: PriceEnv): { plan: "plus" | "advisor"; interval: Interval } | null {
  if (!priceId) return null;
  const map: [string | undefined, "plus" | "advisor", Interval][] = [
    [env.STRIPE_PRICE_PLUS_MONTHLY, "plus", "month"],
    [env.STRIPE_PRICE_PLUS_YEARLY, "plus", "year"],
    [env.STRIPE_PRICE_ADVISOR_YEARLY, "advisor", "year"],
  ];
  const hit = map.find(([id]) => id && id === priceId);
  return hit ? { plan: hit[1], interval: hit[2] } : null;
}

export function priceFor(plan: "plus" | "advisor", interval: Interval, env: PriceEnv): string | undefined {
  if (plan === "plus") return interval === "month" ? env.STRIPE_PRICE_PLUS_MONTHLY : env.STRIPE_PRICE_PLUS_YEARLY;
  return interval === "year" ? env.STRIPE_PRICE_ADVISOR_YEARLY : undefined;
}

/** The parts of a Stripe event we read. */
export type StripeSubEvent = {
  id: string;
  type: string;
  created: number;
  data: {
    object: {
      id: string;
      customer: string | { id: string };
      status: string;
      cancel_at_period_end?: boolean;
      current_period_end?: number;
      metadata?: Record<string, string>;
      items?: { data: { price?: { id: string }; current_period_end?: number }[] };
    };
  };
};

export const HANDLED_EVENTS = ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"];

export type RpcArgs = {
  p_event: string;
  p_type: string;
  p_created: string;
  p_user: string | null;
  p_customer: string;
  p_sub: string;
  p_plan: string;
  p_interval: string;
  p_status: string;
  p_period_end: string | null;
  p_cancel: boolean;
};

/** Returns null for an event we do not act on (an unknown price, a different event type). */
export function eventToArgs(ev: StripeSubEvent, env: PriceEnv): RpcArgs | null {
  if (!HANDLED_EVENTS.includes(ev.type)) return null;
  const sub = ev.data.object;
  const item = sub.items?.data?.[0];
  const price = planForPrice(item?.price?.id, env);
  if (!price) return null;
  const end = item?.current_period_end ?? sub.current_period_end;
  return {
    p_event: ev.id,
    p_type: ev.type,
    p_created: new Date(ev.created * 1000).toISOString(),
    p_user: sub.metadata?.user_id ?? null,
    p_customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    p_sub: sub.id,
    p_plan: price.plan,
    p_interval: price.interval,
    p_status: ev.type === "customer.subscription.deleted" ? "canceled" : sub.status,
    p_period_end: end ? new Date(end * 1000).toISOString() : null,
    p_cancel: !!sub.cancel_at_period_end,
  };
}
