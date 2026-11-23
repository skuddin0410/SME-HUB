"use client";

import { useState, useTransition } from "react";
import { decideBlog, deleteBlog } from "@/app/(hub)/blog-actions";

const NETS: Record<string, string> = { linkedin: "LinkedIn", facebook: "Facebook", x: "X", email: "Email", copy: "Copy link" };

/** Share buttons for the networks the team allows. */
export function BlogShare({ networks, title }: { networks: string[]; title: string }) {
  const [copied, setCopied] = useState(false);
  const go = (n: string) => {
    const url = encodeURIComponent(window.location.href);
    const t = encodeURIComponent(title);
    if (n === "copy") { navigator.clipboard?.writeText(window.location.href).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); return; }
    const to = n === "linkedin" ? `https://www.linkedin.com/sharing/share-offsite/?url=${url}` : n === "facebook" ? `https://www.facebook.com/sharer/sharer.php?u=${url}` : n === "x" ? `https://twitter.com/intent/tweet?url=${url}&text=${t}` : `mailto:?subject=${t}&body=${url}`;
    window.open(to, "_blank", "noopener,noreferrer");
  };
  return (
    <span className="sharebar">
      {networks.map((n) => <button key={n} type="button" className="act" onClick={() => go(n)}>{n === "copy" && copied ? "Link copied" : NETS[n]}</button>)}
    </span>
  );
}

/** The team approves or sends back a post that is waiting. */
export function BlogDecision({ id }: { id: string }) {
  const [busy, start] = useTransition();
  return (
    <span className="row" style={{ flexWrap: "wrap" }}>
      <button type="button" className="btn sm" disabled={busy} onClick={() => start(() => decideBlog(id, true))}>Approve</button>
      <button type="button" className="btn sm ghost" disabled={busy} onClick={() => start(() => decideBlog(id, false))}>Send back</button>
    </span>
  );
}

export function DeleteBlog({ id }: { id: string }) {
  const [busy, start] = useTransition();
  return (
    <button type="button" className="act" disabled={busy} onClick={() => { if (window.confirm("Delete this post for good?")) start(() => deleteBlog(id)); }}>Delete</button>
  );
}
