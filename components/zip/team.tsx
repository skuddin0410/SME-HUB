import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

/** Team pages: the team sees the page, members see why they cannot, visitors sign in first. */
export async function teamViewer(pageName: string) {
  const v = await getViewer();
  if (!v.userId) redirect("/auth/login");
  return { ...v, userId: v.userId, gate: v.isStaff ? null : <TeamGate name={pageName} /> };
}

export function TeamGate({ name }: { name: string }) {
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="card" style={{ maxWidth: 600, margin: "40px auto", textAlign: "center", alignItems: "center", gap: 12 }}>
          <span className="sq big"><Ic n="lock" s={22} /></span>
          <h1 style={{ font: "800 22px var(--display)" }}>This page is for the Hub team</h1>
          <p className="muted">{name} is part of the team area. Members never see it.</p>
          <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn ghost" href="/feed">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const TeamWrap = ({ children }: { children: React.ReactNode }) => (
  <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>{children}</div></div>
);

export function TeamHead({ title, text }: { title: string; text: string }) {
  return (
    <div className="pagehead">
      <p className="eyebrow">For the Hub team · members never see this page</p>
      <h1>{title}</h1>
      <p className="muted">{text}</p>
    </div>
  );
}
