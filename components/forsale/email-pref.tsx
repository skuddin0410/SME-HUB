"use client";

import { useState } from "react";
import { setSaleEmails } from "@/app/(hub)/forsale-actions";

/** Settings › Email notifications: the "Businesses for sale" group (Update 5). */
export function EmailNotifications({ forsale }: { forsale: boolean }) {
  const [on, setOn] = useState(forsale);
  const [note, setNote] = useState("");
  const change = async (v: boolean) => {
    setOn(v);
    const r = await setSaleEmails(v);
    if (r.error) {
      setOn(!v);
      setNote(r.error);
    } else setNote(v ? "You’ll get these emails again." : "Turned off. You won’t get these emails.");
  };
  return (
    <div className="card" id="email-notifications">
      <h2>Email notifications</h2>
      <p className="muted">Choose which notification emails you get. Account and security emails are always sent.</p>
      <label className="fschk">
        <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} />
        <span><b>Businesses for sale</b><small className="muted">Your listing going live, new buyer enquiries, enquiries you send, and changes to listings you saved.</small></span>
      </label>
      {note && <span className="small muted" role="status">{note}</span>}
    </div>
  );
}
