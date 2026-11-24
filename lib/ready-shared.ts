/**
 * Profile completion (Update 3), the parts the browser and the server share.
 * A profile is READY when it has all five: photo, headline, city, at least one "can help with" tag, and a business page.
 */

export type ReadyKey = "photo" | "headline" | "city" | "helps" | "biz";
export type ReadyItems = Record<ReadyKey, boolean>;

/** [key, title, text, button label], in the order the card shows them. */
export const READY_ROWS: [ReadyKey, string, string, string][] = [
  ["photo", "Add a profile photo", "Owners reply to people they can see.", "Add photo"],
  ["headline", "Add your headline", "Your role and business, for example “Owner, Morgan Home Renovations”.", "Add"],
  ["city", "Add your city", "So owners near you can find you.", "Add"],
  ["helps", "Say what you can help with", "Short tags. They decide who finds you in search.", "Add"],
  ["biz", "Add your business page", "Puts your business in the Business Directory.", "Set up from my website"],
];

export const READY_NAMES: Record<ReadyKey, string> = { photo: "Photo", headline: "Headline", city: "City", helps: "Can help with", biz: "Business page" };

export const readyCount = (i: ReadyItems) => READY_ROWS.filter(([k]) => i[k]).length;

/** Suggested tags in the "Can help with" window. A member can add their own; at most 5 are kept. */
export const HELP_CHOICES = ["Bookkeeping", "Local marketing", "Hiring", "Websites", "Catering", "Renovation quotes", "Legal basics", "Exporting", "Funding and grants", "AI tools", "Sales", "Supplier sourcing"];
export const MAX_HELPS = 5;

export const CITY_CHOICES = ["Toronto, ON", "Mississauga, ON", "Brampton, ON", "Ottawa, ON", "Hamilton, ON", "Montréal, QC", "Québec City, QC", "Vancouver, BC", "Surrey, BC", "Calgary, AB", "Edmonton, AB", "Winnipeg, MB", "Saskatoon, SK", "Regina, SK", "Halifax, NS", "Fredericton, NB", "St. John’s, NL", "Charlottetown, PE", "Whitehorse, YT", "Yellowknife, NT", "Iqaluit, NU"];

/** What the AI (or the 3 questions) hands back for the member to check. Nothing is saved until they press Save. */
export type Draft = {
  src: "web" | "questions";
  dom: string;
  title: string;
  biz: string;
  city: string;
  about: string;
  helps: string[];
  cat: string;
  desc: string;
  services: string[];
};

/** [pattern, category, service ideas, services, what the business does]. The last entry matches anything. */
const CATEGORIES: [RegExp, string, string[], string[], string][] = [
  [/renov|build|construct|contract|roof|plumb|electric|trade|handy/i, "Construction and trades", ["Renovation quotes", "Kitchens and bathrooms", "Small commercial fit-outs"], ["Kitchen renovations", "Bathroom renovations", "Small commercial fit-outs"], "renovates homes and small commercial spaces"],
  [/bak|cafe|café|food|cater|kitchen|restaurant|coffee/i, "Food and drink", ["Catering", "Wholesale baking", "Event orders"], ["Custom cakes", "Office catering", "Wholesale orders"], "makes fresh baked goods for customers and local businesses"],
  [/book|account|tax|cpa|payroll|finance/i, "Accounting and bookkeeping", ["Bookkeeping", "Cash-flow planning", "HST filing"], ["Monthly bookkeeping", "Payroll", "HST returns"], "keeps the books and taxes of small businesses in order"],
  [/design|market|media|brand|web|social|seo/i, "Marketing and design", ["Local marketing", "Websites", "Social media"], ["Brand design", "Websites", "Social media management"], "helps small businesses get found and win customers"],
  [/clean|janitor|maid/i, "Cleaning services", ["Office cleaning", "Move-out cleaning", "Commercial contracts"], ["Office cleaning", "Deep cleaning", "Move-out cleaning"], "keeps offices and homes clean"],
  [/./, "Professional services", ["Small-business advice", "Project work", "Referrals"], ["Consulting", "Project work", "Ongoing support"], "helps small businesses with day-to-day problems"],
];

/** The directory's own category names, so the draft's label can be saved on a real business page. */
const DIRECTORY_CATEGORY: Record<string, string> = {
  "Construction and trades": "Construction & Trades",
  "Food and drink": "Food & Drink",
  "Accounting and bookkeeping": "Finance & Accounting",
  "Marketing and design": "Marketing & Design",
  "Cleaning services": "Home Services",
  "Professional services": "Professional Services",
};

/** The business directory category for a draft's label, or "Other" / "" when it is not in the directory's list. */
export function directoryCategory(label: string, list: string[]) {
  const wanted = DIRECTORY_CATEGORY[label] ?? label;
  const hit = list.find((c) => c.toLowerCase() === wanted.toLowerCase());
  return hit ?? (list.includes("Other") ? "Other" : "");
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The business name guessed from a website address: "morganreno.ca" -> "Morganreno". */
export function nameFromDomain(dom: string) {
  return dom.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function domainOf(url: string) {
  return url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase();
}

/** The draft written from the member's three answers (role and business, city, what they help with). */
export function draftFromAnswers(a: { firstName: string; title?: string; biz?: string; city?: string; helps?: string; src?: "web" | "questions"; dom?: string }): Draft {
  const biz = (a.biz ?? "").trim() || (a.dom ? nameFromDomain(a.dom) : "") || "My business";
  const cat = CATEGORIES.find(([re]) => re.test(`${biz} ${a.dom ?? ""} ${a.helps ?? ""}`)) ?? CATEGORIES[CATEGORIES.length - 1];
  const city = (a.city ?? "").trim() || "Mississauga, ON";
  const title = (a.title ?? "").trim() || "Owner";
  let helps = (a.helps ?? "").split(",").map((x) => cap(x.trim())).filter(Boolean);
  if (!helps.length) helps = cat[2].slice();
  helps = helps.slice(0, MAX_HELPS);
  const src = a.src ?? "questions";
  const where = city.split(",")[0];
  const list = helps.slice(0, 3).map((x) => x.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " and $1");
  return {
    src,
    dom: a.dom ?? "",
    title,
    biz,
    city,
    helps,
    cat: cat[1],
    services: cat[3].slice(),
    about: `I’m ${a.firstName}, ${title.toLowerCase()} of ${biz} in ${where}. ${biz} ${cat[4]}. Ask me about ${list}.`,
    desc: `${biz} ${cat[4]} in ${where} and nearby. ${src === "web" ? "Customers choose us for clear quotes and work that is finished on time." : "Get in touch for a quote."}`,
  };
}

/** Initials for the business logo tile in the draft: "Morgan Home Renovations" -> "MH". */
export const logoInitials = (biz: string) => biz.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

export const roleParts = (headline: string | null | undefined): [string, string] => {
  const parts = (headline ?? "").split(", ");
  return [parts[0] ?? "", parts.slice(1).join(", ")];
};

/** The yellow line: [bold sentence, rest]. Only real numbers appear; under 2 it falls back to the plain sentence. */
export function missLine(items: ReadyItems, signals: { views: number; searches: number }, who: { city: string }): [string, string] {
  const city = who.city.split(",")[0].trim();
  if (!items.biz && signals.searches >= 2) {
    return [`${signals.searches} owners${city ? ` near ${city}` : ""} searched the Business Directory for ${items.headline ? "what you do" : "businesses like yours"} this week.`, "Your business isn’t listed, so they didn’t find you."];
  }
  if ((!items.photo || !items.headline) && signals.views >= 2) {
    return [`${signals.views} members looked at your profile this week.`, `Without ${!items.photo && !items.headline ? "a photo and headline" : !items.photo ? "a photo" : "a headline"}, most leave without connecting.`];
  }
  return ["Ready profiles show up in member search, the Directory and daily “People to meet”.", signals.searches >= 2 ? `Finish the last step to show up for ${signals.searches} owners who searched this week.` : ""];
}

/** What the soft limit says when a member without a photo and headline tries to connect or ask for an introduction. */
export const NOT_REACHABLE = "profile_not_ready";
