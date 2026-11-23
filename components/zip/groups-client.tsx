"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { joinGroup, leaveGroup } from "@/app/(hub)/actions";
import { createGroupV2, type GroupState } from "@/app/(hub)/group-actions";
import { GROUP_COVERS, type GroupSettings } from "@/lib/groups";
import { Ic } from "@/components/zip/ic";
import { Scene } from "@/components/zip/scene";

/** Join, Joined, Request to join or Invite only, as the guide's small buttons. */
export function JoinBtn({ groupId, slug, mode, priv, joined, host, requested, signedIn }: {
  groupId: string; slug: string; mode: string; priv: boolean; joined: boolean; host: boolean; requested: boolean; signedIn: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(joined);
  const [, start] = useTransition();
  if (host) return <span className="pill on">You host this group</span>;
  if (priv && !on) {
    return <Link href={signedIn ? `/groups/${slug}` : "/auth/sign-up"} className="btn sm ghost">{requested ? <><Ic n="clock" s={14} />Requested</> : mode === "invite" ? "Invite only" : "Request to join"}</Link>;
  }
  return (
    <button type="button" className={`btn sm ${on ? "on" : "ghost"}`} aria-pressed={on} onClick={() => {
      if (!signedIn) return router.push("/auth/sign-up");
      const before = on;
      setOn(!before);
      start(async () => { try { await (before ? leaveGroup(groupId) : joinGroup(groupId)); } catch { setOn(before); } });
    }}>{on ? "Joined" : "Join"}</button>
  );
}

/** "Start a group": ask for a public one or create a private one, like the guide's two choices. */
export function StartGroup({ s, canPrivate, signedIn, className = "btn", label = "Start a group" }: { s: GroupSettings; canPrivate: boolean; signedIn: boolean; className?: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"" | "pub" | "priv">("");
  const [state, action, pending] = useActionState<GroupState, FormData>(createGroupV2, {});
  const [cover, setCover] = useState(s.def_cover);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const close = () => { setOpen(false); setKind(""); };
  return (
    <>
      <button type="button" className={className} onClick={() => (signedIn ? setOpen(true) : router.push("/auth/sign-up"))}>{label}</button>
      {open && (
        <div className="overlay" onClick={close}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mt" onClick={(e) => e.stopPropagation()}>
            {kind === "" && (
              <>
                <h2 id="mt" style={{ fontSize: 20 }}>Start a group</h2>
                <p className="muted small">There are two kinds of group. Choose the one that fits.</p>
                <div className="pbbox">
                  <strong style={{ font: "700 15px var(--display)" }}>Ask for a public group</strong>
                  <span className="small muted">A topic, industry or regional group in the main directory, open to everyone. The Hub team reviews each request so groups stay active and do not overlap. Free for every member.</span>
                  {s.create_public !== "off" ? <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setKind("pub")}>Request a public group</button> : <span className="small muted">Paused for now.</span>}
                </div>
                <div className="pbbox">
                  <div className="row"><strong className="grow" style={{ font: "700 15px var(--display)" }}>Create a private group</strong><span className="tag" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Ic n="crown" s={12} />Plus and Advisor</span></div>
                  <span className="small muted">Your own space: a client circle, a mastermind or a local association. You choose who joins. It opens straight away.</span>
                  {s.create_private === "off" ? <span className="small muted">Paused for now.</span> : canPrivate
                    ? <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setKind("priv")}>Create a private group</button>
                    : <Link href="/membership-plans" className="btn sm ghost" style={{ alignSelf: "flex-start" }}><Ic n="crown" s={13} />See how to unlock this</Link>}
                </div>
                <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={close}>Cancel</button>
              </>
            )}
            {kind !== "" && (
              <form action={action} className="stack" style={{ gap: 14 }}>
                <h2 id="mt" style={{ fontSize: 18 }}>{kind === "pub" ? "Request a public group" : "Create a private group"}</h2>
                {kind === "pub" && <p className="muted small">Tell us what the group is for. The Hub team reviews it before it goes live.</p>}
                {kind === "priv" && <input type="hidden" name="is_private" value="on" />}
                <label htmlFor="gn">Group name<input className="field" id="gn" name="name" required minLength={3} maxLength={80} placeholder={kind === "pub" ? "e.g. Peel Region Contractors" : "e.g. Morgan Renovations Client Circle"} /></label>
                <label htmlFor="gd">{kind === "pub" ? "Who is it for, and what will members talk about?" : "What is it for?"}<textarea className="field" id="gd" name="description" rows={3} maxLength={500} /></label>
                <label htmlFor="gt">Type<select className="field" id="gt" name="category">{s.types.map((t) => <option key={t}>{t}</option>)}</select></label>
                <div className="stack" style={{ gap: 6 }}>
                  <span className="small" style={{ fontWeight: 600 }}>Cover picture</span>
                  <div role="radiogroup" aria-label="Cover picture" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {GROUP_COVERS.map((c) => (
                      <button key={c} type="button" role="radio" aria-checked={cover === c} aria-pressed={cover === c} aria-label={`Cover ${c}`} className="imgopt" onClick={() => setCover(c)}><Scene n={c} h={60} /></button>
                    ))}
                  </div>
                  <input type="hidden" name="cover" value={cover} />
                </div>
                {kind === "priv" && (
                  <div className="stack" style={{ gap: 6 }}>
                    <span className="small" style={{ fontWeight: 600 }}>Who can join</span>
                    <label className="check"><input type="radio" name="join_mode" value="request" defaultChecked />Anyone can ask, I approve</label>
                    <label className="check"><input type="radio" name="join_mode" value="invite" />Invite only</label>
                  </div>
                )}
                {state.error && <p role="alert" className="small" style={{ color: "#B91C1C" }}>{state.error}</p>}
                {state.ok && state.info && <p role="status" className="small" style={{ color: "#047857" }}>{state.info}</p>}
                <div className="row">
                  <button className="btn" disabled={pending}>{kind === "pub" ? "Send request" : "Create group"}</button>
                  <button type="button" className="btn ghost" onClick={close}>{state.ok ? "Close" : "Cancel"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
