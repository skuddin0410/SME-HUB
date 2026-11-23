import { SECTIONS, type SectionKey } from "@/lib/content";

// The topic, date and picture each piece shows in the design guide. Titles and links stay the real ones.
const CATS: Record<SectionKey, string[]> = {
  blog: ["Marketing", "Technology", "Technology", "Leadership", "Cybersecurity", "Cybersecurity", "AI", "Finance", "Technology", "Diversity", "Diversity", "Retail"],
  news: ["Announcement", "AI", "Government", "Research", "Announcement", "Partnership", "Appointment", "Appointment", "Partnership", "Appointment", "Announcement", "Appointment"],
  podcast: ["AI", "Marketing", "Hiring", "Technology", "Technology", "Marketing", "AI", "Marketing", "Marketing", "AI", "AI", "Marketing"],
};
const DATES = ["Nov 18, 2026", "Nov 16, 2026", "Nov 12, 2026", "Nov 9, 2026", "Nov 5, 2026", "Nov 2, 2026", "Oct 28, 2026", "Oct 22, 2026", "Oct 15, 2026", "Oct 9, 2026", "Oct 2, 2026", "Sep 24, 2026"];
const POOL = ["network", "advisors", "post-ai", "community", "support", "hero", "women", "black", "immigrant", "indigenous", "lgbtq"];

export const KIND_LABEL: Record<SectionKey, { all: string; list: string; read: string; plural: string; one: string; by: string }> = {
  blog: { all: "All articles", list: "Articles", read: "Read article", plural: "articles", one: "article", by: "CanadianSME Magazine" },
  news: { all: "All news", list: "News", read: "Read story", plural: "stories", one: "article", by: "Business news" },
  podcast: { all: "All episodes", list: "Small Business Podcast", read: "Listen", plural: "episodes", one: "episode", by: "Podcast episode" },
};

export function pieceMeta(section: SectionKey, i: number) {
  const item = SECTIONS[section].items[i];
  const t = item.title;
  return {
    cat: CATS[section][i % 12],
    date: DATES[i % 12],
    img: `/zip/img/${POOL[(i * 3 + section.length) % POOL.length]}.jpg`,
    time: section === "podcast" ? `${18 + (t.length % 25)} min listen` : `${3 + (t.length % 6)} min read`,
    base: 12 + (t.length % 30),
  };
}
