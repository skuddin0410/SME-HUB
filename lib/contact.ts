/** Update 24: the Contact us topics, with the inbox each one goes to (shared by the page and the server). */
export const CTOPICS: [key: string, label: string, inbox: string, icon: string][] = [
  ["account", "Account and sign-in help", "support@smehub.ca", "key"],
  ["plans", "Membership plans and billing", "support@smehub.ca", "crown"],
  ["listing", "Business listings and the directory", "support@smehub.ca", "store"],
  ["partner", "Advertising, sponsorship and partnerships", "info@canadiansme.ca", "trend"],
  ["press", "Media and press", "info@canadiansme.ca", "doc"],
  ["report", "Report a problem or unsafe content", "support@smehub.ca", "shield"],
];
export const topicLabel = (k: string) => CTOPICS.find((t) => t[0] === k)?.[1] ?? "Something else";
export const topicInbox = (k: string) => CTOPICS.find((t) => t[0] === k)?.[2] ?? "support@smehub.ca";
