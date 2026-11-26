import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/sa/frame";
import { FinishForm } from "@/components/sa/finish-form";
import { createClient } from "@/lib/supabase/server";
import { needsFinish, providerName } from "@/lib/auth/oauth-profile";
import { safeNext } from "@/lib/auth/safe-next";

export const metadata = { title: "Finish your profile", robots: { index: false, follow: false } };

/** Google and LinkedIn members land here once, to give what the sign-up form would have asked. */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next ?? null);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/auth/login");
  if (!needsFinish(user)) redirect(next);

  const m = user.user_metadata ?? {};
  const name = providerName(user);
  const first = String(m.first_name || m.given_name || name.split(" ")[0] || "").slice(0, 40);
  const last = String(m.last_name || m.family_name || name.split(" ").slice(1).join(" ") || "").slice(0, 40);
  const via = (user.app_metadata?.providers as string[] | undefined)?.includes("linkedin_oidc") ? "LinkedIn" : "Google";

  return (
    <AuthFrame>
      <FinishForm next={next} via={via} email={user.email ?? ""} initial={{ fn: first, ln: last, ws: String(m.website ?? "") }} />
    </AuthFrame>
  );
}
