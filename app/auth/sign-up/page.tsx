import { AuthLanding } from "@/components/auth-landing";

export const metadata = { title: "Join SMB Hub" };

export default function Page() {
  return <AuthLanding initialMode="join" />;
}
