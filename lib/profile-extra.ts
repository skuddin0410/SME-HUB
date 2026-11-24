import { CATNAMES } from "@/lib/categories";
// Shared rules for the Phase 2 profile fields. Pure, so the browser, the server and the tests all agree.

export const AVAILABILITY = ["Weekday mornings", "Weekday afternoons", "Evenings", "Weekends"] as const;

export const VISIBILITY_LEVELS = { public: "Public", members: "All members", conn: "My connections", only: "Only me" } as const;
export type VisibilityLevel = keyof typeof VISIBILITY_LEVELS;

/** Fields a member can restrict, with the label shown in settings. Keep in step with validate_profile_details in the database. */
export const VISIBILITY_FIELDS = [
  ["location", "City and province"],
  ["helps_with", "Helps with"],
  ["needs", "Looking for"],
  ["availability", "Availability"],
  ["social_links", "Social links"],
  ["followers", "Follower count"],
] as const;

export const SOCIAL_NETWORKS = [
  ["linkedin", "LinkedIn"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["x", "X"], ["youtube", "YouTube"], ["tiktok", "TikTok"],
  ["whatsapp", "WhatsApp"], ["pinterest", "Pinterest"], ["threads", "Threads"], ["reddit", "Reddit"], ["medium", "Medium"], ["telegram", "Telegram"], ["snapchat", "Snapchat"],
] as const;

export const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;

export const PROFILE_TYPES = { owner: "Business owner", maker: "Maker", provider: "Service provider", advisor: "Advisor", team: "Team" } as const;
/** Types a member may pick for themselves; advisor and team are given by the team. */
export const SELF_TYPES = ["owner", "maker", "provider"] as const;

export const RELATIONSHIPS = { client: "Client", referral_partner: "Referral partner", colleague: "Colleague", supplier: "Supplier", other: "Other" } as const;

/** Splits "a, b ,c" into at most `max` unique items of 1 to 60 characters. */
export function splitList(raw: string, max = 12): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,\n]/)) {
    const t = part.trim().slice(0, 60);
    if (t) seen.add(t);
  }
  return [...seen].slice(0, max);
}

/** Social links must be plain https addresses. A bare "linkedin.com/in/x" is accepted and given https://. */
export function cleanSocialUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t || /^[a-z][a-z0-9+.-]*:(?!\/\/)/i.test(t)) return null; // javascript:, data:, mailto: and the like
  const url = /^https?:\/\//i.test(t) ? t.replace(/^http:\/\//i, "https://") : `https://${t}`;
  return /^https:\/\/[^\s<>"']{3,200}$/.test(url) ? url : null;
}

export type StrengthInput = {
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  bio: string | null;
  website: string | null;
  full_name: string | null;
  helps_with?: string[];
  needs?: string[];
  has_business?: boolean;
  recommendations?: number;
};

const STEPS: { done: (p: StrengthInput) => boolean; label: string }[] = [
  { done: (p) => !!p.full_name, label: "Add your name" },
  { done: (p) => !!p.avatar_url, label: "Add a photo" },
  { done: (p) => !!p.headline, label: "Add a headline" },
  { done: (p) => !!p.location, label: "Add your city" },
  { done: (p) => (p.bio ?? "").trim().length >= 40, label: "Write an about (40+ characters)" },
  { done: (p) => !!p.website, label: "Add your website" },
  { done: (p) => (p.helps_with?.length ?? 0) > 0, label: "Say what you help with" },
  { done: (p) => (p.needs?.length ?? 0) > 0, label: "Say what you are looking for" },
  { done: (p) => !!p.has_business, label: "List your business" },
  { done: (p) => (p.recommendations ?? 0) > 0, label: "Get a recommendation" },
];

/** Percent complete (0 to 100), the next step to take, and how much each step adds. */
export function profileStrength(p: StrengthInput) {
  const left = STEPS.filter((s) => !s.done(p));
  const percent = Math.round(((STEPS.length - left.length) / STEPS.length) * 100);
  return { percent, next: left[0]?.label ?? null, remaining: left.map((s) => s.label), step: Math.round(100 / STEPS.length) };
}

/** The Details section's choices (from the hand-off's profile page). */
/** Update 15: the master category list (old answers are moved across by the database). */
export const INDUSTRIES = CATNAMES;
export const TEAM_SIZES = ["Just me", "2 to 5 people", "6 to 20 people", "21 to 50 people"] as const;
export type CoreAnswers = { nick?: string; industry?: string; founded?: string; team?: string; email?: string; phone?: string; history?: { role: string; org: string; years: string }[] };
/** Two-letter marks for the social network buttons in Details, as in the hand-off. */
export const SOCIAL_MARK: Record<string, string> = { linkedin: "in", facebook: "fb", instagram: "ig", x: "x", youtube: "yt", tiktok: "tt", whatsapp: "wa", pinterest: "pi", threads: "th", reddit: "re", medium: "md", telegram: "tg", snapchat: "sc" };
