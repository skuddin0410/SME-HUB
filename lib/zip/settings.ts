/** Defaults for the team settings pages. A saved row only holds what the team changed; the rest comes from here. */
export type SettingsKey = "profiles" | "feed" | "groups" | "blogs" | "hashtags" | "stories";
export const SETTINGS_KEYS: SettingsKey[] = ["profiles", "feed", "groups", "blogs", "hashtags", "stories"];

export const NETS: [string, string][] = [["linkedin", "LinkedIn"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["x", "X"], ["youtube", "YouTube"], ["tiktok", "TikTok"], ["whatsapp", "WhatsApp"], ["pinterest", "Pinterest"], ["threads", "Threads"], ["reddit", "Reddit"], ["medium", "Medium"], ["telegram", "Telegram"], ["snapchat", "Snapchat"]];
export const VISL: Record<string, string> = { public: "Public", members: "All members", conn: "My connections", only: "Only me" };
export const FTYPES = ["Text", "Number", "Dropdown", "Date", "Phone", "Email", "Web address", "Social networks", "Repeater"];
export const WIN: [string, string][] = [["0", "Off"], ["10", "10 minutes"], ["60", "1 hour"], ["forever", "Forever"]];
export const GCOVERS = ["nodes", "bars", "awning", "laptop", "ship", "solar", "truck", "bakery"];
export const FEED_FILTERS: [string, string][] = [["mine", "Created by me"], ["reacted", "I have reacted to"], ["groups", "From my groups"], ["conn", "From my connections"], ["follow", "From people I follow"], ["mention", "I am mentioned in"]];

export type Field = { k: string; g: string; l: string; t: string; vis: string; lock: boolean; search?: boolean; core?: boolean };
const f = (k: string, g: string, l: string, t: string, vis: string, lock: boolean, search?: boolean): Field => ({ k, g, l, t, vis, lock, search, core: true });

export const DEFAULTS = {
  profiles: {
    header: "left", head: { online: true, type: true, joined: true, followers: true, last: true }, dname: "full", link: "name",
    tabs: [["about", "About", true], ["posts", "Posts", true], ["conn", "Connections", true], ["groups", "Groups", true], ["blog", "Blog", true]] as [string, string, boolean][],
    defTab: "about", dview: "grid", dswitch: true, dcard: { online: true, type: true, followers: false, last: true, joined: false },
    connect: true, follow: true, autoFollow: true, gate: false, actions: [["connect", true], ["message", true], ["follow", true]] as [string, boolean][],
    invites: true, del: "free", exportData: true,
    nets: { linkedin: true, facebook: true, instagram: true, x: true, youtube: true, tiktok: true, whatsapp: true, pinterest: false, threads: false, reddit: false, medium: false, telegram: false, snapchat: false } as Record<string, boolean>,
    types: [["owner", "Business owner", "#F4F4F5", "#27272A"], ["advisor", "SMB Advisor", "#DBEAFE", "#1D4ED8"], ["maker", "Canadian maker", "#FEE2E2", "#B91C1C"], ["provider", "Service provider", "#DCFCE7", "#15803D"], ["team", "Hub team", "#EDE9FE", "#6D28D9"]] as [string, string, string, string][],
    access: { owner: null, advisor: null, maker: null, provider: ["advisor", "maker", "provider", "team"], team: null } as Record<string, string[] | null>,
    auto: { owner: ["funding"], advisor: ["funding"], maker: ["trade"], provider: ["ai"], team: [] } as Record<string, string[]>,
    fields: [
      f("first", "About", "First name", "Text", "public", true, true), f("last", "About", "Last name", "Text", "public", true, true), f("nick", "About", "Nickname", "Text", "members", false),
      f("biz", "Business", "Business name", "Text", "public", true, true), f("industry", "Business", "Industry", "Dropdown", "public", true, true), f("city", "Business", "City and province", "Text", "public", true, true),
      f("founded", "Business", "Year founded", "Number", "members", false), f("team", "Business", "Team size", "Dropdown", "members", false, true),
      f("email", "Contact", "Email", "Email", "conn", false), f("phone", "Contact", "Phone", "Phone", "conn", false), f("web", "Contact", "Website", "Web address", "public", false), f("social", "Contact", "Social networks", "Social networks", "public", false),
      f("history", "Work history", "Past businesses and roles", "Repeater", "members", false),
    ] as Field[],
    pv: { on: true, strip: true, optout: true, guests: false, free: "2", notify: "weekly", chart: "bar" },
  },
  feed: {
    relevant: false, filters: { mine: true, reacted: true, groups: true, conn: true, follow: true, mention: true } as Record<string, boolean>, topics: false, refresh: true, share: true, shareOut: true,
    schedule: true, pin: true, polls: true, pollMax: "10", cover: true, title: "optional", edit: "10", closeC: true,
    comments: true, cedit: "10", thread: "2", cshow: "2", cload: "10",
    access: "all", accessTypes: { owner: true, advisor: true, maker: true, provider: false, team: true } as Record<string, boolean>,
    auto: { register: true, joinGroup: true, connect: false, blog: true } as Record<string, boolean>,
  },
  groups: {
    create: "paid", privJoin: "request", layout: "grid", header: "side",
    card: { cat: true, desc: true, count: true, act: true, host: true } as Record<string, boolean>,
    head: { type: true, priv: true, desc: true, faces: true, act: true } as Record<string, boolean>,
    defCover: "nodes", msgAll: true, archive: true, types: ["Topic", "Industry", "Community", "City or region", "Private circle"],
  },
  blogs: {
    who: "all", approve: "free", reqImg: true, memberTags: true, layout: "grid", imgStyle: "standard",
    share: { linkedin: true, facebook: true, x: false, email: true, copy: true } as Record<string, boolean>,
    authorBox: true, cats: ["Money", "Sales & marketing", "Operations", "Hiring & people", "AI & technology", "Legal", "Owner stories"],
  },
  hashtags: {
    posts: true, comments: true, auto: true, follow: true, trend: true, profile: true, notify: "weekly", create: "all", min: "3", max: "24", per: "5",
    blocked: ["free", "cheap", "followers"],
  },
  stories: {} as Record<string, unknown>,
};
export type Defaults = typeof DEFAULTS;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
/** Objects merge key by key, so a new default appears even when an older row exists; arrays and values are replaced whole. */
export function mergeSettings<T>(base: T, saved: unknown): T {
  if (!isObj(base) || !isObj(saved)) return (saved === undefined || saved === null ? base : (saved as T));
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(saved)) out[k] = k in base ? mergeSettings((base as Record<string, unknown>)[k], v) : v;
  return out as T;
}
