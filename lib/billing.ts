/** Plans and prices, and the translation of a Stripe subscription into what the database stores. No secrets here. */
export type PlanKey = "free" | "plus" | "advisor";
export type Interval = "month" | "year";

export const PLAN_INFO = {
  free: { name: "Free", forWho: "For every small-business owner. Free for as long as you like.", month: 0, year: 0 },
  plus: { name: "Plus", forWho: "For owners who want more customers to see them.", month: 19, year: 190 },
  advisor: { name: "Advisor", forWho: "For accountants, lawyers, consultants and coaches who serve small businesses.", month: null, year: 1990 },
} as const;

/** A line starting with "=" is a heading inside the list. Wording is from the design guide. */
export const PLAN_FEATURES: Record<PlanKey, string[]> = {
  free: [
    "Profile, connections and messages",
    "One company listing in the directory",
    "Join any group, read every article",
    "Post questions, wins, jobs and introductions",
    "Write blog posts (reviewed before they go live)",
    "3 people to meet every day, and warm introductions",
    "10 AI questions a month",
  ],
  plus: [
    "=Everything in Free, and:",
    "Featured company listing, shown first",
    "Post 2 offers a month to all members",
    "List your business for sale, with your name hidden if you like",
    "Host 1 private group of your own",
    "Publish blog posts straight away",
    "Shown more often in other members\u2019 daily suggestions",
    "100 AI questions a month, plus grant application help",
    "Discounts on CanadianSME events",
  ],
  advisor: [
    "=Everything in Plus, and:",
    "SME Advisor badge on your profile and posts",
    "A place on the Advisors page and in the feed slider",
    "Members book free intro calls with you",
    "Post 4 offers a month",
    "Host 3 private groups, such as a client circle",
    "Host events and sell courses",
    "One podcast interview and one advertorial a year",
    "AI leads: members asking about your specialty",
  ],
};

/** The comparison table. "g" starts a group; 1 is a tick, 0 a dash, text is shown as is. */
export type CompareRow = ["g", string] | [string, string | 0 | 1, string | 0 | 1, string | 0 | 1];
export const COMPARE: CompareRow[] = [
  ["g", "Take part"],
  ["Profile, connections and messages", 1, 1, 1],
  ["Join groups and live sessions", 1, 1, 1],
  ["Post questions, wins, jobs and introductions", 1, 1, 1],
  ["Post offers to members", "None", "2 a month", "4 a month"],
  ["List a business for sale", 0, 1, 1],
  ["Ask for a new public group", 1, 1, 1],
  ["Host a private group", 0, "1 group", "3 groups"],
  ["Write blog posts", "After review", "Straight away", "Straight away"],
  ["g", "Get found"],
  ["Company listing in the directory", "Standard", "Featured", "Featured"],
  ["Made in Canada Pavilion listing", 1, 1, 1],
  ["SME Advisor badge and Advisors page", 0, 0, 1],
  ["Shown in the advisor slider in the feed", 0, 0, 1],
  ["g", "AI tools"],
  ["People to meet and warm introductions", 1, 1, 1],
  ["Shown more often in daily suggestions", 0, 1, 1],
  ["Ask the Hub AI", "10 a month", "100 a month", "100 a month"],
  ["AI Profile Builder rewrites", "5 a day", "Unlimited", "Unlimited"],
  ["Grant application help", 0, 1, 1],
  ["AI leads for your specialty", 0, 0, 1],
  ["g", "Events and media"],
  ["Discounts on CanadianSME events", 0, 1, 1],
  ["Host events and sell courses", 0, 0, 1],
  ["Podcast interview and advertorial", 0, 0, "1 each a year"],
];

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
  p_founding: boolean;
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
    p_founding: sub.metadata?.founding === "1",
  };
}
