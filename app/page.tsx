import { redirect } from "next/navigation";
import { getViewer } from "@/lib/hub";

// The front door: members go straight to their feed, everyone else to sign in.
export default async function Home() {
  const { userId } = await getViewer();
  redirect(userId ? "/feed" : "/auth/login");
}
