import Link from "next/link";
import { Ic } from "@/components/zip/ic";

/** The team-only notice, inside a page that already has the guide's wrapper. */
export function TeamGate({ name }: { name: string }) {
  return (
    <div className="card" style={{ maxWidth: 600, margin: "40px auto", textAlign: "center", alignItems: "center", gap: 12 }}>
      <span className="sq big"><Ic n="lock" s={22} /></span>
      <h1 style={{ font: "800 22px var(--display)" }}>This page is for the Hub team</h1>
      <p className="muted">{name} is part of the team area. Members never see it.</p>
      <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn ghost" href="/feed">Back to Home</Link>
      </div>
    </div>
  );
}
