import { pageMeta } from "@/lib/seo";
import { ZipHelp } from "@/components/zip/info";

export const metadata = pageMeta({ title: "Help and frequently asked questions", description: "Answers about joining SMB Hub, posting, connections, groups, business listings and membership plans.", path: "/help" });

export default function HelpPage() {
  return <ZipHelp />;
}
