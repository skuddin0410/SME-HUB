import { notFound } from "next/navigation";
import { ToolExternal, ToolPage } from "@/components/tools/frame";
import { CashTool, GstTool, ImportTool, LoanTool, PricingTool } from "@/components/tools/calculators";
import { TOOLS } from "@/lib/tools/data";
import { pageMeta } from "@/lib/seo";
import "@/styles/province.css";
import "@/styles/tools.css";

const LEAD: Record<string, string> = {
  gst: "Add sales tax to a price, or find how much tax is inside a total, for any province or territory.",
  loan: "See the payment and total interest for a term loan, operating line or equipment financing, and compare two options side by side.",
  pricing: "Find how many sales you need to cover your costs, see the difference between markup and margin, and work out the price rise needed when your costs go up.",
  import: "Work out what an imported product really costs once it reaches you, and the price that protects your margin.",
  cashflow: "See your bank balance week by week for the next 13 weeks, including big one-off payments like GST/HST and payroll remittances.",
};

export const generateStaticParams = () => TOOLS.map(([id]) => ({ id }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = TOOLS.find((x) => x[0] === id);
  return t ? pageMeta({ title: t[1], description: t[3], path: `/tools/${t[0]}` }) : { title: "Page not found" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = TOOLS.find((x) => x[0] === id);
  if (!t) notFound();
  const tool = { gst: <GstTool />, loan: <LoanTool />, pricing: <PricingTool />, import: <ImportTool />, cashflow: <CashTool /> }[id as "gst"];
  return <ToolPage id={id} lead={LEAD[id] ?? t[3]}>{tool ?? <ToolExternal id={id} />}</ToolPage>;
}
