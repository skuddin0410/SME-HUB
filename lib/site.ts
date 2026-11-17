// Site-wide navigation and reference content. Links that start with http point at pages
// that still live on the current smehub.ca site and have not been rebuilt here yet.
const OLD = "https://smehub.ca";

export type NavItem = { label: string; href: string };

export const ABOUT_MENU: NavItem[] = [
  { label: "About us", href: "/about" },
  { label: "CanadianSME Magazine", href: "https://canadiansme.ca/" },
  { label: "Contact", href: "/help#contact" },
];

export const RESOURCES_MENU: NavItem[] = [
  { label: "Indigenous entrepreneurs", href: `${OLD}/indigenous-entrepreneurs/` },
  { label: "Women entrepreneurs", href: `${OLD}/women-entrepreneurs/` },
  { label: "Black entrepreneurs", href: `${OLD}/black-entrepreneurs/` },
  { label: "Immigrant entrepreneurs", href: `${OLD}/immigrant-entrepreneurs/` },
  { label: "Resources for LGBTQ+", href: `${OLD}/resources-for-lgbtq/` },
];

export const PROVINCES: NavItem[] = [
  ["Alberta", "alberta"], ["British Columbia", "british-columbia"], ["Manitoba", "manitoba"],
  ["New Brunswick", "new-brunswick"], ["Newfoundland and Labrador", "newfoundland-and-labrador"],
  ["Northwest Territories", "northwest-territories"], ["Nova Scotia", "nova-scotia"], ["Nunavut", "nunavut"],
  ["Ontario", "ontario"], ["Prince Edward Island", "prince-edward-island"], ["Quebec", "quebec"],
  ["Saskatchewan", "saskatchewan"], ["Yukon", "yukon"],
].map(([label, slug]) => ({ label, href: `${OLD}/business-guide-${slug}/` }));

export const EXPLORE_MENU: NavItem[] = [
  { label: "Groups", href: "/groups" },
  { label: "Members", href: "/members" },
  { label: "Explore businesses", href: "/businesses" },
  { label: "SMB Advisors", href: "/members?type=advisor" },
  { label: "Membership plans", href: "/membership-plans" },
  { label: "Blog", href: `${OLD}/blog/` },
  { label: "News", href: `${OLD}/news/` },
  { label: "Courses", href: `${OLD}/courses/` },
  { label: "Small Business Podcast", href: "https://smbpodcast.ca/" },
];

export const POLICY_MENU: NavItem[] = [
  { label: "Frequently asked questions", href: "/help" },
  { label: "Community guidelines", href: `${OLD}/small-business-hub-community-guidelines/` },
  { label: "Discrimination policy", href: `${OLD}/smb-hub-discrimination-policy/` },
  { label: "Terms and conditions", href: `${OLD}/general-terms-conditions/` },
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

// Recent articles shown in the left rail. Taken from the current smehub.ca home page;
// replace with a live feed once articles are published from this platform.
const UP = `${OLD}/wp-content/uploads/2026/09`;
export const ARTICLES: { title: string; href: string; image: string }[] = [
  { title: "Be Seen. Be Found. Be Chosen: How SocialEyes Communications Is Evolving the Digital Agency Model", href: `${OLD}/be-seen-be-found-be-chosen-how-socialeyes-communications-is-evolving-the-digital-agency-model/`, image: `${UP}/Be-Seen.-Be-Found.-Be-Chosen-How-SocialEyes-Communications-Is-Evolving-the-Digital-Agency-Model.jpg-150x150.webp` },
  { title: "What BVX 2026 Revealed About Canada's Next Generation of Tech", href: `${OLD}/what-bvx-2026-revealed-about-canadas-next-generation-of-tech/`, image: `${UP}/5-150x150.webp` },
  { title: "The Toronto Company Flying Drones Inside Warehouses and Over Irish Farms", href: `${OLD}/the-toronto-company-flying-drones-inside-warehouses-and-over-irish-farms/`, image: `${UP}/The-Toronto-Company-Flying-Drones-Inside-Warehouses-and-Over-Irish-Farms-150x150.webp` },
  { title: "The Table That Costs Nothing", href: `${OLD}/the-table-that-costs-nothing/`, image: `${UP}/Business-Strategy-150x150.webp` },
  { title: "Teclara Brings Big-Company Security to the Firms That Can Least Afford a Breach", href: `${OLD}/teclara-brings-big-company-security-to-the-firms-that-can-least-afford-a-breach/`, image: `${UP}/Cybersecurity-for-Small-Businesses-150x150.webp` },
  { title: "Why More Ontario Businesses Are Treating Compliance as Part of Their Security Stack", href: `${OLD}/why-more-ontario-businesses-are-treating-compliance-as-part-of-their-security-stack-not-an-afterthought/`, image: `${UP}/Cybersecurity-for-Small-Businesses-1-150x150.webp` },
];

export const PLANS = [
  { key: "free", name: "Free", monthly: 0, yearly: 0, blurb: "Join the conversation and start building your network.",
    features: ["Up to 100 connections", "Join business groups", "Free articles and guides", "Listen to podcasts", "Register for events", "Community mentorship"] },
  { key: "plus", name: "SMB Plus", monthly: 25, yearly: 250, blurb: "Put your business on the map.",
    features: ["Everything in Free", "Up to 250 connections", "1 company page", "Publish 2 articles a month", "CanadianSME events discount", "Add your exclusive offers"] },
  { key: "elite", name: "SMB Elite", monthly: 50, yearly: 500, blurb: "More reach, more pages, your own groups.", featured: true,
    features: ["Everything in SMB Plus", "Up to 500 connections", "2 company pages", "Publish 5 articles a month", "Create your own groups", "Featured offers and promotions"] },
  { key: "advisor", name: "SMB Advisor", monthly: 200, yearly: 2000, blurb: "For experts who serve small businesses.",
    features: ["Everything in SMB Elite", "Up to 1,000 connections", "3 company pages", "Publish 10 articles a month", "Host events and sell courses", "Podcast interview and advertorial", "SMB Advisor badge"] },
] as const;
