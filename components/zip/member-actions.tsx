"use client";
import { useInstant } from "@/lib/optimistic";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeConnection, requestConnection, acceptConnection } from "@/app/(hub)/actions";
import { toggleFollow } from "@/app/(hub)/network-actions";
import type { LinkState } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import { useReady } from "@/components/ready/provider";

/** Connect, Pending and Connected in the guide's buttons. Changes at once and steps back if the save fails. */
export function ConnectBtn({ otherId, initial, signedIn, small, primary }: { otherId: string; initial: LinkState; signedIn: boolean; small?: boolean; primary?: boolean }) {
  const router = useRouter();
  const { value: state, set, tap } = useInstant<LinkState>(initial, "Your connection request didn’t save. Try again.");
  const ready = useReady();
  const sm = small ? " sm" : "";
  const go = (next: LinkState, save: () => Promise<unknown>) => {
    if (!signedIn) return router.push("/auth/sign-up");
    set(next, save);
  };
  if (state === "connected") return <span className={`btn${sm} ghost ${tap}`} aria-pressed="true"><Ic n="check" s={14} />Connected</span>;
  if (state === "sent") return <button type="button" className={`btn${sm} ghost ${tap}`} aria-pressed="true" onClick={() => go("none", () => removeConnection(otherId))}><Ic n="clock" s={14} />Pending</button>;
  if (state === "received") return <button type="button" className={`btn${sm}`} onClick={() => go("connected", () => acceptConnection(otherId))}><Ic n="check" s={14} />Accept</button>;
  return <button type="button" className={`btn${sm}${primary ? "" : " ghost"}`} aria-pressed="false" onClick={() => { const run = () => go("sent", () => requestConnection(otherId)); if (ready) ready.gate("connect", run); else run(); }}><Ic n="users" s={14} />Connect</button>;
}

export function FollowBtn({ otherId, initial, signedIn, small }: { otherId: string; initial: boolean; signedIn: boolean; small?: boolean }) {
  const router = useRouter();
  const { value: on, set, tap } = useInstant(initial, "Following didn’t save. Try again.");
  return (
    <button type="button" className={`btn${small ? " sm" : ""} ghost ${tap}`} aria-pressed={on} onClick={() => {
      if (!signedIn) return router.push("/auth/sign-up");
      set(!on, () => toggleFollow(otherId, on));
    }}>
      <Ic n="flag" s={14} />{on ? "Following" : "Follow"}
    </button>
  );
}

/** The three dots: copy the link, block. Opens and closes without a page load. */
export function MoreMenu({ copyPath, blockName, onBlock }: { copyPath: string; blockName: string; onBlock?: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="menuwrap pmenu">
      <button type="button" className="iconbtn" style={{ border: "1px solid var(--line)", borderRadius: "50%" }} aria-label="More actions" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Ic n="dots" s={18} />
      </button>
      {open && (
        <div className="menu">
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(location.origin + copyPath); setDone(true); } catch { /* the link is in the address bar */ } setOpen(false); }}>
            {done ? "Link copied" : "Copy profile link"}
          </button>
          {onBlock && <button type="button" onClick={() => { setOpen(false); void onBlock(); }}><Ic n="ban" s={14} /> Block {blockName}</button>}
        </div>
      )}
    </div>
  );
}

/** The profile's web address in Details; selecting it copies the link. */
export function CopyProfileLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="linkbtn" style={{ color: "var(--accent)", fontWeight: 600 }}
      onClick={async () => { try { await navigator.clipboard.writeText(location.origin + path); setDone(true); } catch { /* the link is in the address bar */ } }}>
      {`smehub.ca${path}`}{done && <span className="muted small" role="status"> · Copied</span>}
    </button>
  );
}
