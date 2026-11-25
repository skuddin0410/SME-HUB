"use client";
import { useInstant } from "@/lib/optimistic";
import { useRouter } from "next/navigation";
import { setRsvp } from "@/app/(hub)/actions";

export function RsvpBtn({ eventId, saved, signedIn }: { eventId: string; saved: boolean; signedIn: boolean }) {
  const router = useRouter();
  const { value: on, set, tap } = useInstant(saved, "Your seat didn’t save. Try again.");
  const flip = () => {
    if (!signedIn) return router.push("/auth/sign-up");
    set(!on, () => setRsvp(eventId, !on));
  };
  return (
    <button type="button" className={`btn sm${on ? " on" : ""} ${tap}`} style={{ alignSelf: "flex-start" }} aria-pressed={on} onClick={flip}>
      {on ? "Seat saved" : "Save my seat"}
    </button>
  );
}
