import { redirect } from "next/navigation";

// The hub is open: everyone lands on the feed, signed in or not.
export default function Home() {
  redirect("/feed");
}
