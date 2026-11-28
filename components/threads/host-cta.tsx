"use client";

import { useState, useTransition } from "react";
import { requestHost } from "@/app/(hub)/thread-actions";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";

/** Update 42: "Host a group" on the Groups page. The request goes to the team's Moderation area. */
export function HostCta({ sent: initial }: { sent: boolean }) {
  const [sent, setSent] = useState(initial);
  const [busy, start] = useTransition();
  return (
    <div className="cchostcta">
      <span className="ccci"><Ic n="users" s={18} /></span>
      <div>
        <b>Host a group</b>
        <span>Hosts welcome new members, start the weekly check-in and make sure every question gets an answer. You get free Plus, a Host badge and a mention in CanadianSME Small Business Magazine.</span>
      </div>
      <button type="button" className="btn sm ghost" disabled={busy || sent} onClick={() => start(async () => {
        const r = await requestHost().catch(() => ({ error: "That didn’t send. Try again." }) as { error: string });
        if ("error" in r && r.error) return toast(r.error);
        setSent(true);
        toast("Thanks for offering to host. The CanadianSME team picks hosts from active members each month and will email you.");
      })}>{sent ? "Request sent" : "I’d like to host"}</button>
    </div>
  );
}
