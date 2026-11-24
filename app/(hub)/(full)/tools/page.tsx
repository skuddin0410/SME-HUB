import { ToolsIndex } from "@/components/tools/frame";
import { pageMeta } from "@/lib/seo";
import "@/styles/province.css";
import "@/styles/tools.css";

export const metadata = pageMeta({ title: "Business tools: calculators built for Canadian rules", description: "Free GST/HST, payroll, cash-flow, loan, self-employed tax, import landed cost and pricing calculators for Canadian small businesses.", path: "/tools" });

export default function Page() {
  return <ToolsIndex />;
}
