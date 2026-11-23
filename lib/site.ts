// Site-wide navigation and reference content. Every menu link stays on this site;
// the pages behind them are built from lib/content.ts.

export type NavItem = { label: string; href: string };

export const ABOUT_MENU: NavItem[] = [
  { label: "About us", href: "/about" },
  { label: "CanadianSME Magazine", href: "/magazine" },
  { label: "Business guides", href: "/guides" },
  { label: "Contact", href: "/contact" },
];

export const RESOURCES_MENU: NavItem[] = [
  { label: "Indigenous entrepreneurs", href: "/resources/indigenous-entrepreneurs" },
  { label: "Women entrepreneurs", href: "/resources/women-entrepreneurs" },
  { label: "Black entrepreneurs", href: "/resources/black-entrepreneurs" },
  { label: "Immigrant entrepreneurs", href: "/resources/immigrant-entrepreneurs" },
  { label: "Resources for LGBTQ+", href: "/resources/lgbtq" },
];

export const EXPLORE_MENU: NavItem[] = [
  { label: "Groups", href: "/groups" },
  { label: "Members", href: "/members" },
  { label: "Explore businesses", href: "/businesses" },
  { label: "SMB Advisors", href: "/smb-advisor" },
  { label: "Membership plans", href: "/membership-plans" },
  { label: "Blog", href: "/blog" },
  { label: "News", href: "/news" },
  { label: "Courses", href: "/courses" },
  { label: "Small Business Podcast", href: "/podcast" },
];

/** One small business guide per province and territory (pages built from lib/smehub). */
export const PROVINCE_MENU: NavItem[] = [
  { label: "Alberta", href: "/guides/alberta" },
  { label: "British Columbia", href: "/guides/british-columbia" },
  { label: "Manitoba", href: "/guides/manitoba" },
  { label: "New Brunswick", href: "/guides/new-brunswick" },
  { label: "Newfoundland and Labrador", href: "/guides/newfoundland-and-labrador" },
  { label: "Northwest Territories", href: "/guides/northwest-territories" },
  { label: "Nova Scotia", href: "/guides/nova-scotia" },
  { label: "Nunavut", href: "/guides/nunavut" },
  { label: "Ontario", href: "/guides/ontario" },
  { label: "Prince Edward Island", href: "/guides/prince-edward-island" },
  { label: "Quebec", href: "/guides/quebec" },
  { label: "Saskatchewan", href: "/guides/saskatchewan" },
  { label: "Yukon", href: "/guides/yukon" },
];

export const POLICY_MENU: NavItem[] = [
  { label: "Frequently asked questions", href: "/help" },
  { label: "Community guidelines", href: "/policies/community-guidelines" },
  { label: "Discrimination policy", href: "/policies/discrimination-policy" },
  { label: "Terms and conditions", href: "/policies/terms" },
  { label: "Privacy policy", href: "/policies/privacy-policy" },
];

export const SOCIAL = {
  facebook: "https://www.facebook.com/canadiansme",
  x: "https://x.com/canadian_sme",
  youtube: "https://www.youtube.com/@Canadian-SME",
  instagram: "https://www.instagram.com/canadiansme/",
  linkedin: "https://www.linkedin.com/company/canadiansme-business-magazine/",
};

export const EVENTS: NavItem[] = [
  { label: "Small Business Expo", href: "https://www.smeexpo.ca/" },
  { label: "Small Business Summit", href: "https://www.smesummit.ca/" },
  { label: "Small Business Awards", href: "https://www.smeawards.ca/" },
  { label: "Canada Business Talks", href: "https://www.smemagazine.ca/business-talks" },
  { label: "Small Business Podcast", href: "https://smbpodcast.ca/" },
];

export const CONTACT = {
  address: "6345 Dixie Rd, Unit 202, Mississauga, ON L5T 2E6",
  phones: ["+1 437 778 4446", "+1 416 655 0205"],
  emails: ["support@smehub.ca", "info@canadiansme.ca"],
};

