import { redirect } from "next/navigation";

/** The old "check your inbox" page: the code screen replaces it. */
export default function Page() {
  redirect("/auth/verify");
}
