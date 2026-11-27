import { ContactPage } from "@/components/contact/contact-page";
import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { humanCheckOn } from "@/lib/safety/server";
import "@/styles/province.css";

export const metadata = pageMeta({ title: "Contact us", description: "Questions about your account, a membership plan, your business listing or working with CanadianSME? Send us a message, email or call.", path: "/contact" });

/** Update 24: the Contact us page. */
export default async function Page() {
  const { profile } = await getViewer();
  return <ContactPage name={(profile as { full_name?: string } | null)?.full_name ?? ""} human={await humanCheckOn()} />;
}
