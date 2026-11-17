import { AuthLanding } from "@/components/auth-landing";
import { landingData } from "@/lib/landing";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { stats, people } = await landingData();
  return <AuthLanding initialMode="signin" stats={stats} people={people} />;
}
