import { SECTIONS } from "@/lib/content";
import { StoryIndex } from "@/components/content";

export const metadata = { title: SECTIONS.news.name };

export default function Page() {
  return <StoryIndex section="news" />;
}
