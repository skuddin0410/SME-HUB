import { CentreIndex } from "@/components/resources/centre";
import { pageMeta } from "@/lib/seo";
import "@/styles/province.css";
import "@/styles/resources.css";

export const metadata = pageMeta({ title: "Resource centres: support for every Canadian entrepreneur", description: "Funding, programs, step-by-step guides and community for women, Black, Indigenous, immigrant and 2SLGBTQI+ business owners.", path: "/resources" });

/** Update 15: all community resource centres. */
export default function Page() {
  return <CentreIndex />;
}
