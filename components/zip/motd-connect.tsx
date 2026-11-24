"use client";
import Link from "next/link";
import { useState } from "react";
import { acceptConnection, removeConnection, requestConnection } from "@/app/(hub)/actions";
import { useReady } from "@/components/ready/provider";
import type { LinkState } from "@/lib/hub";

/** "+ Connect" on the Member of the Day card: "Request sent" once selected, "Connected" when connected; visitors are asked to join. */
export function MotdConnect({ id, initial, signedIn }: { id: string; initial: LinkState; signedIn: boolean }) {
  const ready = useReady();
  const [state, setState] = useState<LinkState>(initial);
  if (!signedIn) return <Link className="btn sm ghost" href="/auth/sign-up">+ Connect</Link>;
  if (state === "connected") return <span className="small muted">Connected</span>;
  const go = (next: LinkState, save: () => Promise<unknown>) => {
    const before = state;
    setState(next);
    save().catch(() => setState(before));
  };
  if (state === "received") return <button type="button" className="btn sm ghost" onClick={() => go("connected", () => acceptConnection(id))}>Accept</button>;
  if (state === "sent") return <button type="button" className="btn sm ghost" aria-pressed="true" title="Withdraw request" onClick={() => go("none", () => removeConnection(id))}>Request sent</button>;
  return (
    <button type="button" className="btn sm ghost" onClick={() => { const run = () => go("sent", () => requestConnection(id)); if (ready) ready.gate("connect", run); else run(); }}>
      + Connect
    </button>
  );
}
