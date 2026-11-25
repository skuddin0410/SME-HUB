import { HubGuide } from "@/components/about/hub-guide";
import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import "@/styles/province.css";

export const metadata = pageMeta({ title: "How SME Hub works", description: "SME Hub is Canada’s free small business network: meet other owners, get your business found, find funding and deadlines, and learn.", path: "/how-sme-hub-works" });

/** Update 23: How SME Hub works. */
export default async function Page() {
  const { userId } = await getViewer();
  return <HubGuide member={!!userId} />;
}
