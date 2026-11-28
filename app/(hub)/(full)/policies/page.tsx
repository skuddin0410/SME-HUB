import { PolicyIndex } from "@/components/policies/policy-view";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "SME Hub policies", description: "The rules that keep SME Hub fair, safe and honest: terms, privacy, cookies, membership and refunds, community guidelines and more.", path: "/policies" });

/** Update 45: all policies. */
export default function PoliciesPage() {
  return <PolicyIndex />;
}
