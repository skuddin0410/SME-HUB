import { AboutPage } from "@/components/about/about";
import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import "@/styles/province.css";
import "@/styles/tools.css";
import "@/styles/about.css";

export const metadata = pageMeta({ title: "About SME Hub", description: "SME Hub is Canada’s small business network, built by CanadianSME Small Business Magazine: customers, suppliers, funding and deadline help in one free place.", path: "/about" });

/** Update 15: the new About page. */
export default async function Page() {
  const { userId } = await getViewer();
  return <AboutPage member={!!userId} />;
}
