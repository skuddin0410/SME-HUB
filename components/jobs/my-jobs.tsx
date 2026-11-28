"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { closeJob, cvLink } from "@/app/(hub)/job-actions";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";

/** Update 43: Close job, open a CV, message an applicant. */
export function CloseJob({ id }: { id: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <button type="button" className="btn sm ghost" disabled={busy} onClick={() => start(async () => {
      const r = await closeJob(id);
      if (r.error) return toast(r.error);
      toast("Job closed. It no longer shows on Jobs.");
      router.refresh();
    })}>Close job</button>
  );
}

export type App = { id: string; note: string; cv_name: string | null; cv_path: string | null; share_profile: boolean; referral_id: string | null; created_at: string; applicant: { id: string; full_name: string | null; headline: string | null; avatar_url: string | null } | null };

export function Applicant({ a, age }: { a: App; age: string }) {
  const p = a.applicant;
  const openCv = async () => {
    const r = await cvLink(a.id);
    if (r.url) window.location.href = r.url;
    else toast(r.error ?? "That CV can’t be opened right now.");
  };
  return (
    <li>
      <ZipAv name={p?.full_name || "Member"} src={p?.avatar_url} size="s" />
      <div>
        {p && a.share_profile ? <Link href={`/members/${p.id}`} className="namebtn"><b>{p.full_name}</b></Link> : <b>{p?.full_name ?? "A member"}</b>}
        {a.referral_id && <em className="jxreftag">Recommended by a member</em>}
        <span className="jxmut">{age}</span>
        <p>{a.note}</p>
        {a.cv_path && <button type="button" className="linkbtn" onClick={openCv}><Ic n="dl" s={13} /> {a.cv_name ?? "CV"}</button>}
      </div>
      {p && <Link className="btn sm ghost" href={`/messages?with=${p.id}`}>Message</Link>}
    </li>
  );
}
