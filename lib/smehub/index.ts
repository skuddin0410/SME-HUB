import { ORGS_1, type OrgTuple } from "./orgs-1";
import { ORGS_2 } from "./orgs-2";
import { PAGES_1, type HubPage } from "./pages-1";
import { PAGES_2 } from "./pages-2";
import { PAGES_3 } from "./pages-3";

/** Pictures still live on the old site's media library. Copy them across before smehub.ca points here. */
export const UPLOADS = "https://smehub.ca/wp-content/uploads/";

export type Org = { name: string; text: string; logo: string; website: string; socials: { kind: "facebook" | "twitter" | "instagram" | "linkedin"; url: string }[] };

const KINDS = ["facebook", "twitter", "instagram", "linkedin"] as const;
const toOrg = ([name, text, logo, website, ...rest]: OrgTuple): Org => ({
  name,
  text,
  logo: UPLOADS + logo,
  website,
  socials: KINDS.flatMap((kind, i) => (rest[i] ? [{ kind, url: `https://${rest[i]}` }] : [])),
});

const ORGS = [...ORGS_1, ...ORGS_2].map(toOrg);
const PAGES: HubPage[] = [...PAGES_1, ...PAGES_2, ...PAGES_3];

/** Our address for each page, and the address it had on the old site. */
const ourSlug = (old: string) => (old === "resources-for-lgbtq" ? "lgbtq" : old.replace(/^business-guide-/, ""));
const isGuide = (old: string) => old.startsWith("business-guide-");

export type FullPage = Omit<HubPage, "orgs" | "img"> & { img: string; orgs: Org[]; band: string; path: string; oldPath: string };

const build = (p: HubPage): FullPage => {
  const guide = isGuide(p.slug);
  // "Indigenous Entrepreneurs Resource Centre" -> "Indigenous"; "The Ontario Small Business Guide:" -> "Ontario"
  const subject = p.heads[0].replace(/^The /, "").replace(/ Small Business Guide:$/, "").replace(/ Entrepreneurs Resource Centre$/, "");
  return {
    ...p,
    img: UPLOADS + p.img,
    orgs: p.orgs.map((i) => ORGS[i]),
    band: guide ? `SMBs and StartUps in ${subject}` : `${subject} SMBs and StartUps`,
    path: `/${guide ? "guides" : "resources"}/${ourSlug(p.slug)}`,
    oldPath: `/${p.slug}`,
  };
};

const ALL = PAGES.map(build);
export const RESOURCE_FULL = ALL.filter((p) => p.path.startsWith("/resources/"));
export const GUIDE_FULL = ALL.filter((p) => p.path.startsWith("/guides/"));
export const findFull = (path: string) => ALL.find((p) => p.path === path);
/** Old smehub.ca addresses and where each one lives now. */
export const OLD_PATHS = ALL.map((p) => ({ from: p.oldPath, to: p.path }));
