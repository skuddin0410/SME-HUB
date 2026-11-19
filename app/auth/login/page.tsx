import { AuthLanding } from "@/components/auth-landing";

export const metadata = { title: "Sign in" };

export default function Page() {
  return <AuthLanding initialMode="signin" />;
}
