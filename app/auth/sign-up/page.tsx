import { redirect } from "next/navigation";
import { AuthLanding } from "@/components/auth-landing";
import { getViewer } from "@/lib/hub";

export const metadata = { title: "Join SMB Hub" };

export default async function Page() {
  // already signed in: nothing to do here
  if ((await getViewer()).userId) redirect("/feed");
  return <AuthLanding initialMode="join" />;
}
