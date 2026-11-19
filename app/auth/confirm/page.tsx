import type { Metadata } from "next";
import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = {
  title: "Confirming",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams;
  return <ConfirmForm tokenHash={p.token_hash ?? ""} type={p.type ?? ""} next={p.next ?? ""} />;
}
