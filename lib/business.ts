export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABEL: Record<Day, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
export type Hours = Partial<Record<Day, [string, string][]>>;

export const KINDS = { storefront: "Storefront", service: "Service business", online: "Online only" } as const;
export type Kind = keyof typeof KINDS;
export const ROLES = { owner: "Owner", manager: "Manager", editor: "Editor", responder: "Responder" } as const;
export type Role = keyof typeof ROLES;
export const ROLE_CAN: Record<Role, string> = {
  owner: "Everything, including the team",
  manager: "Edit the page, post, answer messages",
  editor: "Post as the business",
  responder: "Answer messages and quote requests",
};
export const ACTIONS = { message: "Message", call: "Call", web: "Visit website", book: "Book" } as const;
export const PRICE_TYPES = { fixed: "Fixed price", from: "Starting at", quote: "Ask for a quote" } as const;
export const SOCIALS = ["instagram", "facebook", "linkedin"] as const;
export const STATUS_LABEL: Record<string, string> = { draft: "Draft", pending: "Waiting for approval", published: "Published", rejected: "Not approved", deleted: "Deleted" };

/** "9:00 AM" from "09:00". */
export function clock(t: string) {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return `${((h + 11) % 12) + 1}:${String(m ?? 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function dayLine(hours: Hours, day: Day) {
  const spans = hours[day] ?? [];
  return spans.length ? spans.map(([a, b]) => `${clock(a)} to ${clock(b)}`).join(", ") : "Closed";
}

/** Reads the hours form: for every day an "open" and "close" field (blank = closed). */
export function parseHours(form: FormData): Hours {
  const out: Hours = {};
  for (const d of DAYS) {
    const a = String(form.get(`${d}_open`) ?? "");
    const b = String(form.get(`${d}_close`) ?? "");
    out[d] = /^\d\d:\d\d$/.test(a) && /^\d\d:\d\d$/.test(b) ? [[a, b]] : [];
  }
  return out;
}

export function websiteUrl(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export const money = (n: number | string | null) => (n == null ? "" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(n)));

export type BusinessSettings = {
  create_mode: "all" | "paid";
  member_limit: number;
  pub_approval: boolean;
  review_approval: boolean;
  criteria: string[];
  categories: string[];
  tabs: { photos: boolean; events: boolean; jobs: boolean; shop: boolean };
};
