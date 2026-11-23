/** Defaults for the team settings pages. A saved row only holds what the team changed; the rest comes from here. */
export type SettingsKey = "profiles" | "feed" | "groups" | "blogs" | "hashtags" | "stories" | "automations";
export const SETTINGS_KEYS: SettingsKey[] = ["profiles", "feed", "groups", "blogs", "hashtags", "stories", "automations"];
export const STTYPES: [string, string][] = [["jpg", "JPG"], ["png", "PNG"], ["webp", "WebP"], ["gif", "GIF"], ["mp4", "MP4"], ["mov", "MOV"], ["webm", "WebM"]];

/** The choices in the workflow builder. */
export const AUOPT = {
  trigger: ["Every day at 9:00 am ET", "Every Monday at 9:00 am ET", "When a member joins", "When a question gets no reply for 24 hours", "When a member reaches a free plan limit", "On the 1st of each month"],
  aud: ["Unactivated users|Invited exactly 30 days ago and never activated their account", "New members|Joined in the last 24 hours", "Incomplete profiles|Joined 3 or more days ago with no introduction", "Quiet members|No visit in the last 30 days", "Members who can help|Skills match the unanswered question", "Free members at a limit|Used all free AI questions or introductions", "All active members|Visited in the last 60 days"],
  action: ["Email: Welcome to the community", "Email: Friendly reminder", "Email: Finish your profile with AI", "Email: Here is what you missed", "Email: Your matchmaking round is open", "Email: See what Plus includes", "Notification: A member needs your help", "Notify the Hub team"],
  delay: ["Wait 1 day", "Wait 3 days", "Wait 7 days", "Wait 14 days", "Wait 30 days"],
  refine: ["If user is still unactivated", "If profile is still incomplete", "If still no visit", "If no reply yet", "If on the Free plan", "If not opted in yet"],
} as Record<string, string[]>;
export const AUTPL: { name: string; why: string; trigger: number; aud: number; steps: [string, number][] }[] = [
  { name: "Welcome new members", why: "A warm first day sets the tone and gets the first post.", trigger: 2, aud: 1, steps: [["action", 0], ["delay", 1], ["refine", 1], ["action", 2]] },
  { name: "Nudge invited people who never joined", why: "Turns your invite list into real members.", trigger: 0, aud: 0, steps: [["action", 0], ["delay", 2], ["refine", 0], ["action", 1]] },
  { name: "Finish your profile", why: "Complete profiles get better matches and more replies.", trigger: 0, aud: 2, steps: [["action", 2], ["delay", 2], ["refine", 1], ["action", 1]] },
  { name: "Win back quiet members", why: "Brings people back before they forget the Hub.", trigger: 1, aud: 3, steps: [["action", 3], ["delay", 3], ["refine", 2], ["action", 7]] },
  { name: "Rescue unanswered questions", why: "No question should sit without a reply.", trigger: 3, aud: 4, steps: [["action", 6], ["delay", 0], ["refine", 3], ["action", 7]] },
  { name: "Monthly matchmaking invite", why: "Fills each matchmaking round without manual emails.", trigger: 5, aud: 6, steps: [["action", 4], ["delay", 1], ["refine", 5], ["action", 1]] },
  { name: "Upgrade nudge at the free limit", why: "Offers Plus at the moment a member wants more.", trigger: 4, aud: 5, steps: [["action", 5]] },
];
export type Flow = { name: string; on: boolean; runs: number; trigger: string; aud: string; steps: { t: string; v: string }[] };
export const flowFromTpl = (t: (typeof AUTPL)[number]): Flow => ({ name: t.name, on: false, runs: 0, trigger: AUOPT.trigger[t.trigger], aud: AUOPT.aud[t.aud], steps: t.steps.map(([k, i]) => ({ t: k, v: AUOPT[k][i] })) });

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
    relevant: false, filters: { mine: true, reacted: true, groups: true, conn: true, follow: true, mention: true } as Record<string, boolean>, topics: true, refresh: true, share: true, shareOut: true,
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
    blocked: ["free", "cheap", "followers"], removed: {} as Record<string, boolean>, merge: {} as Record<string, string>,
  },
  stories: {
    publish: "all", aud: { public: false, members: true, conn: true } as Record<string, boolean>, defAud: "members", approval: false, dur: "24",
    types: { jpg: true, png: true, webp: true, gif: false, mp4: true, mov: true, webm: true } as Record<string, boolean>,
    maxMB: "25", maxVid: "30", perMember: "3", perStory: "5", showViewers: true, likes: true, cleanup: false,
  },
  automations: (() => {
    const a = flowFromTpl(AUTPL[1]); a.steps = a.steps.slice(0, 3);
    return { flows: [a, flowFromTpl(AUTPL[0]), flowFromTpl(AUTPL[4])] as Flow[], queue: [] as { day: string; time: string; text: string }[] };
  })(),
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
