/** Businesses for Sale (Update 5): the hand-off's lists, labels and formatting, shared by the server and the browser. */

export const FS_IND = ["Food and drink", "Construction and trades", "Transport and logistics", "Energy and environment", "Retail", "Professional services", "Health and wellness", "Manufacturing", "Tech and online"] as const;
export const FS_IND_ICON: Record<string, string> = { "Food and drink": "store", "Construction and trades": "building", "Transport and logistics": "send", "Energy and environment": "spark", Retail: "tag", "Professional services": "doc" };
export type SaleType = "full" | "part" | "assets";
export const FS_TYPE: Record<SaleType, string> = { full: "Full sale", part: "Partner wanted (part stake)", assets: "Assets only" };
export type Premises = "lease" | "own" | "home" | "none";
export const FS_RE: Record<Premises, string> = { lease: "Leased premises", own: "Building included", home: "Home-based or online", none: "No premises needed" };
export type SaleStatus = "live" | "offer" | "sold" | "paused" | "hidden";
export const FS_ST: Record<SaleStatus, [string, string]> = { live: ["Live", "ok"], offer: ["Under offer", "offer"], sold: ["Sold", "sold"], paused: ["Paused", "pause"], hidden: ["Hidden by the Hub team", "hide"] };
export const FS_INC = ["Equipment and fixtures", "Inventory and stock", "Customer list", "Website, phone number and social accounts", "Brand name and trademarks", "Supplier contracts", "Vehicles", "Staff willing to stay"];
export const FS_PRICE: [string, string][] = [["", "Any price"], ["0-250000", "Under $250,000"], ["250000-500000", "$250,000 to $500,000"], ["500000-1000000", "$500,000 to $1 million"], ["1000000-1e12", "Over $1 million"]];
export const FS_PHOTOS = ["/zip/img/bizcover-maple.jpg", "/zip/img/bizcover-lakeshore.jpg", "/zip/img/bizcover-morgan.jpg", "/zip/img/bizcover-northside.jpg", "/zip/img/bizcover-brightline.jpg", "/zip/img/post-retail.jpg", "/zip/img/bizcover-clearwater.jpg", "/zip/img/post-design.jpg"];
export const FS_FUND = ["I have the money ready", "I’ll need a business loan", "I’m looking for partners or investors", "I’m just exploring"];
export const FS_WHEN = ["Within 3 months", "In 3 to 6 months", "In 6 to 12 months", "Not sure yet"];
export const FS_REPORT = ["The numbers look wrong or misleading", "I think it’s a scam", "The seller asked me to pay a deposit or fee", "It’s not a real business for sale", "Something else"];
export const PROVS: [string, string][] = [["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"]];
export const FS_DAY = 864e5;
export const FS_MAX_PHOTO = 8 * 1024 * 1024;

/** A card, as sale_browse() and sale_saved() return it. Owner earnings are null for visitors. */
export type SaleCard = {
  id: string; slug: string; title: string; industry: string; city: string; province: string; area: string;
  price: number; por: boolean; type: SaleType; photo: string; status: SaleStatus; checked: boolean; created_at: string;
  earnings: number | null; saved: boolean; search?: string;
};
export type SalePerson = { id: string; name: string; role: string; avatar: string | null; member_type?: string };
/** One listing, as sale_detail() returns it for the viewer. Missing fields were not sent. */
export type SaleDetail = SaleCard & {
  established: number | null; premises: Premises; highlights: string[]; description: string[]; has_employees: boolean;
  mine: boolean; staff: boolean; member: boolean;
  sales?: number; employees?: number; reason?: string; training?: string; lease?: string; financing?: boolean; buyer?: string;
  included?: string[]; documents?: string[]; seller_plan?: string;
  enquiry?: { created_at: string; shared: boolean; thread: boolean } | null;
  seller?: SalePerson; business_name?: string; confidential?: boolean;
  views?: number; saves?: number; enquiries?: number;
};

export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-CA");
export function short(n: number) {
  if (n >= 1e6) return "$" + (Math.round(n / 1e5) / 10).toString().replace(/\.0$/, "") + "M";
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
  return "$" + n;
}
export const priceText = (l: { por: boolean; price: number }) => (l.por ? "Price on request" : money(l.price));
export const provName = (c: string) => PROVS.find((p) => p[0] === c)?.[1] ?? c;
export const where = (l: { area: string; province: string }) => `${l.area}, ${l.province}`;
export function listedAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / FS_DAY);
  return d < 1 ? "Listed today" : d === 1 ? "Listed yesterday" : `Listed ${d} days ago`;
}
export const saleHref = (l: { slug: string }) => `/for-sale/${l.slug}`;
export const num = (v: string | number) => {
  const n = parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
};
export function slugify(title: string, id: string) {
  const base = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
  return `${base || "business"}-${id.replace(/-/g, "").slice(-4)}`;
}

/** The sell form, as the hand-off keeps it (text fields, so a half-typed number is fine). */
export type Draft = {
  id: string; title: string; ind: string; city: string; prov: string; area: string; price: string; por: boolean; rev: string; cf: string;
  est: string; staff: string; type: SaleType; re: Premises; reLeft: string; fin: boolean; train: string; reason: string; inc: number[];
  photo: string; conf: boolean; biz: string; hl: string; desc: string; buyer: string; docs: string;
};
export type DraftErr = Partial<Record<keyof Draft, string>>;

/** The hand-off's checks (fsCheck). The database checks the same rules again. */
export function checkDraft(D: Draft): DraftErr {
  const e: DraftErr = {};
  if (D.title.trim().length < 15) e.title = "Write a headline of at least 15 characters.";
  if (!D.ind) e.ind = "Pick an industry.";
  if (!D.city.trim()) e.city = "Add the city.";
  if (!D.por && num(D.price) < 1000) e.price = "Add an asking price, or tick “Price on request”.";
  if (D.type !== "assets" && !num(D.rev)) e.rev = "Add last year’s sales. Buyers skip listings without numbers.";
  if (D.desc.trim().length < 80) e.desc = "Describe the business in at least 80 characters.";
  if (D.hl.split("\n").filter((x) => x.trim()).length < 1) e.hl = "Add at least one highlight.";
  return e;
}

/** What gets saved from the form (fsFromDraft): defaults for the optional answers, as the hand-off fills them. */
export function draftToRow(D: Draft) {
  return {
    title: D.title.trim(), industry: D.ind, city: D.city.trim(), province: D.prov, area_shown: D.area.trim() || D.city.trim(),
    price: num(D.price), price_on_request: !!D.por, yearly_sales: num(D.rev), owner_earnings: num(D.cf),
    year_established: num(D.est) || null, employees: num(D.staff), sale_type: D.type, premises: D.re, lease_details: D.reLeft.trim(),
    seller_financing: !!D.fin, training: D.train.trim() || "To be agreed with the buyer.", reason: D.reason.trim() || "Shared with buyers who make contact.",
    included: [...D.inc].sort((a, b) => a - b).map((i) => FS_INC[i]).filter(Boolean),
    highlights: D.hl.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 5),
    description: D.desc.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean),
    ideal_buyer: D.buyer.trim() || "Open to any serious buyer.", documents: D.docs.split("\n").map((x) => x.trim()).filter(Boolean),
    photo_url: D.photo, confidential: !!D.conf, business_name: D.conf ? "" : D.biz.trim(),
  };
}

/** A card for the form's live preview. */
export function draftCard(D: Draft): SaleCard {
  const r = draftToRow(D);
  return {
    id: "preview", slug: "", title: D.title.trim(), industry: D.ind, city: r.city, province: D.prov, area: D.area.trim() || D.city.trim(),
    price: r.price, por: r.price_on_request, type: D.type, photo: D.photo, status: "live", checked: false, created_at: new Date().toISOString(),
    earnings: r.owner_earnings, saved: false,
  };
}

export function newDraft(location: string): Draft {
  const [city, prov] = location.split(", ");
  return {
    id: "", title: "", ind: "", city: city ?? "", prov: PROVS.some((p) => p[0] === prov) ? prov : "ON", area: "", price: "", por: false, rev: "", cf: "", est: "", staff: "",
    type: "full", re: "lease", reLeft: "", fin: false, train: "", reason: "", inc: [], photo: FS_PHOTOS[2], conf: true, biz: "", hl: "", desc: "", buyer: "",
    docs: "Financial statements for the last 3 years\nEquipment list",
  };
}

export function toDraft(l: {
  id: string; title: string; industry: string; city: string; province: string; area_shown: string; price: number; price_on_request: boolean; yearly_sales: number;
  owner_earnings: number; year_established: number | null; employees: number; sale_type: SaleType; premises: Premises; lease_details: string; seller_financing: boolean;
  training: string; reason: string; included: string[]; photo_url: string; confidential: boolean; business_name: string; highlights: string[]; description: string[];
  ideal_buyer: string; documents: string[];
}): Draft {
  return {
    id: l.id, title: l.title, ind: l.industry, city: l.city, prov: l.province, area: l.area_shown, price: l.price_on_request ? "" : String(l.price), por: l.price_on_request,
    rev: String(l.yearly_sales || ""), cf: String(l.owner_earnings || ""), est: String(l.year_established || ""), staff: String(l.employees || ""), type: l.sale_type,
    re: l.premises, reLeft: l.lease_details, fin: l.seller_financing, train: l.training, reason: l.reason, inc: l.included.map((t) => FS_INC.indexOf(t)).filter((i) => i >= 0),
    photo: l.photo_url, conf: l.confidential, biz: l.business_name, hl: l.highlights.join("\n"), desc: l.description.join("\n\n"), buyer: l.ideal_buyer, docs: l.documents.join("\n"),
  };
}
