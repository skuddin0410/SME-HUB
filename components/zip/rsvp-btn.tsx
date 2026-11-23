"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setRsvp } from "@/app/(hub)/actions";

export function RsvpBtn({ eventId, saved, signedIn }: { eventId: string; saved: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(saved);
  const flip = () => {
    if (!signedIn) return router.push("/auth/sign-up");
    const next = !on;
    setOn(next);
    setRsvp(eventId, next).catch(() => setOn(!next));
  };
  return (
    <button type="button" className={`btn sm${on ? " on" : ""}`} style={{ alignSelf: "flex-start" }} aria-pressed={on} onClick={flip}>
      {on ? "Seat saved" : "Save my seat"}
    </button>
  );
}
