import { requireUser } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { listSessions } from "@/app/auth/actions";
import { gateReady } from "@/lib/auth/device-gate";
import { SecurityPanel } from "@/components/sa/security-panel";

export const metadata = pageMeta({ title: "Security and sign-in", description: "Change your password, see where you are logged in, and manage how you log in to SME Hub.", path: "/settings/security", index: false });

export default async function Page() {
  const { supabase, userId } = await requireUser();
  const [{ data: auth }, sessions, { data: sec }] = await Promise.all([
    supabase.auth.getUser(),
    listSessions(),
    supabase.from("user_security").select("email_code").eq("user_id", userId).maybeSingle(),
  ]);
  const identities = (auth.user?.identities ?? []).map((i) => ({ provider: i.provider, email: (i.identity_data?.email as string | undefined) ?? "" }));
  return (
    <SecurityPanel
      email={auth.user?.email ?? ""}
      sessions={sessions}
      identities={identities}
      emailCode={(sec as { email_code?: boolean } | null)?.email_code !== false}
      codeLive={gateReady()}
    />
  );
}
