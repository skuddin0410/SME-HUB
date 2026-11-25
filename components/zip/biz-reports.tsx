"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/toast";
import { actOnBizReport, reportBusiness } from "@/app/(hub)/team-extra-actions";

export type BizReport = { id: string; company: { name: string; slug: string }; review: { author: string; body: string } | null; reasons: string[]; count: number };

/** Business Profiles → Reports (handoff: bzRepAct): remove the review or page, or keep it. */
export function BizReportRow({ r }: { r: BizReport }) {
  const router = useRouter();
  const act = async (a: "remove" | "keep") => { const x = await actOnBizReport(r.id, a); toast(x.error ?? (a === "remove" ? "Removed" : "Kept")); router.refresh(); };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span><Link href={`/businesses/${r.company.slug}`}><strong>{r.company.name}</strong></Link> <span className="muted small">· {r.review ? `review by ${r.review.author}` : "business page"}{r.count > 1 ? ` · ${r.count} reports` : ""}</span></span>
      <span className="small sterr">Reported for: {r.reasons.join("; ")}</span>
      {r.review && <span className="small">“{r.review.body}”</span>}
      <div className="row">
        <button type="button" className="btn sm" style={{ background: "#B91C1C", borderColor: "#B91C1C" }} onClick={() => act("remove")}>Remove {r.review ? "review" : "page"}</button>
        <button type="button" className="btn sm ghost" onClick={() => act("keep")}>Keep it</button>
      </div>
    </div>
  );
}

const REVIEW_REASONS = ["Discrimination", "Harassment or hate", "Spam", "Misleading or false", "Something else"];
const PAGE_REASONS = ["Fake or impersonating", "Misleading or false", "Spam", "Discrimination", "Something else"];

/** "Report" on a review, or "Report this page" on a business page (handoff: bzrep). */
export function ReportBizButton({ companyId, reviewAuthorId, label = "Report", className = "linkbtn small" }: { companyId: string; reviewAuthorId?: string | null; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [note, setNote] = useState("");
  const review = !!reviewAuthorId;
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bzrt" onClick={(e) => e.stopPropagation()}>
            <h2 id="bzrt" style={{ fontSize: 18 }}>{review ? "Report this review" : "Report this business page"}</h2>
            <p className="muted small">Tell the Hub team what breaks our <Link href="/policies/community-guidelines" style={{ color: "var(--link)", fontWeight: 600 }}>community guidelines</Link>. {review ? "The reviewer" : "The business"} is not told who reported it.</p>
            <div className="stack" style={{ gap: 8 }} role="radiogroup" aria-label="Reason">
              {/* the handoff styles the chosen chip by aria-pressed */}
              {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
              {(review ? REVIEW_REASONS : PAGE_REASONS).map((x) => <button key={x} type="button" className="chip" role="radio" style={{ justifyContent: "flex-start" }} aria-checked={why === x} aria-pressed={why === x} onClick={() => setWhy(x)}>{x}</button>)}
            </div>
            <label className="small" htmlFor="bzrn">Anything else the team should know? <span className="muted">(optional)</span></label>
            <textarea id="bzrn" className="field" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="row">
              <button type="button" className="btn" onClick={async () => {
                if (!why) return toast("Choose a reason");
                const r = await reportBusiness(companyId, reviewAuthorId ?? null, why, note);
                setOpen(false);
                toast(r.error ?? "Thanks. The Hub team will review it under our community guidelines.");
              }}>Send report</button>
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
