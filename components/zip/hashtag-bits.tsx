"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleTagFollow } from "@/app/(hub)/hashtag-actions";

/** + Follow / ✓ Following. Signed-out visitors are sent to sign in. */
export function FollowTag({ tag, following, signedIn, cls = "btn sm ghost" }: { tag: string; following: boolean; signedIn: boolean; cls?: string }) {
  const [on, setOn] = useState(following);
  const [err, setErr] = useState("");
  const [busy, go] = useTransition();
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        className={cls}
        aria-pressed={on}
        disabled={busy}
        onClick={() => {
          if (!signedIn) { router.push("/auth/login"); return; }
          go(async () => {
            const r = await toggleTagFollow(tag);
            if (r.error) setErr(r.error); else { setErr(""); setOn(!!r.following); router.refresh(); }
          });
        }}
      >
        {on ? "✓ Following" : "+ Follow"}
        <span className="sr"> #{tag}</span>
      </button>
      {err && <span role="alert" className="errtxt small">{err}</span>}
    </>
  );
}

/** A chip in "Hashtags I follow" with a small × to stop following. */
export function MyTagChip({ tag }: { tag: string }) {
  const router = useRouter();
  const [busy, go] = useTransition();
  return (
    <span className="tag htchip">
      <a className="hlink" href={`/hashtags/${tag}`}>#{tag}</a>
      <button type="button" className="xbtn" style={{ padding: "0 2px", fontSize: 13 }} aria-label={`Remove #${tag} from my hashtags`} disabled={busy}
        onClick={() => go(async () => { await toggleTagFollow(tag); router.refresh(); })}>×</button>
    </span>
  );
}
