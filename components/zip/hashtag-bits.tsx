"use client";
import { useInstant } from "@/lib/optimistic";
import { toast } from "@/components/toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleTagFollow } from "@/app/(hub)/hashtag-actions";

/** + Follow / ✓ Following. Signed-out visitors are sent to sign in. */
export function FollowTag({ tag, following, signedIn, cls = "btn sm ghost" }: { tag: string; following: boolean; signedIn: boolean; cls?: string }) {
  const { value: on, set, tap } = useInstant(following);
  const [err, setErr] = useState("");
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        className={`${cls} ${tap}`}
        aria-pressed={on}
        onClick={() => {
          if (!signedIn) { router.push("/auth/login"); return; }
          // changes at once; the answer only matters if it failed (then it is undone with a message)
          set(!on, async () => {
            const r = await toggleTagFollow(tag);
            if (r.error) { setErr(r.error); return r; }
            setErr("");
            router.refresh();
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
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <span className="tag htchip">
      <a className="hlink" href={`/hashtags/${tag}`}>#{tag}</a>
      <button type="button" className="xbtn" style={{ padding: "0 2px", fontSize: 13 }} aria-label={`Remove #${tag} from my hashtags`} 
        onClick={() => {
          setGone(true);
          toggleTagFollow(tag).then((r) => { if (r.error) { setGone(false); toast(r.error); } else router.refresh(); }).catch(() => { setGone(false); toast("That didn’t save. Try again."); });
        }}>×</button>
    </span>
  );
}
