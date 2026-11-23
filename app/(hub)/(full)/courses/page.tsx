import Link from "next/link";
import { COURSES } from "@/lib/content";
import { Scene } from "@/components/zip/scene";
import { SoonButton } from "@/components/zip/account-client";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = { title: "Courses" };

export default function CoursesPage() {
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead">
          <p className="eyebrow">Explore the Hub</p>
          <h1>Courses</h1>
          <p className="muted">Short courses taught by SMB Advisors and guest experts.</p>
        </div>
        <div className="grid">
          {COURSES.map((c) => (
            <div key={c.title} className="card">
              <div className="cover"><Scene n="nodes" h={150} /></div>
              <span className="tag question" style={{ alignSelf: "flex-start" }}>{c.category}</span>
              <h2 style={{ fontSize: 17, lineHeight: 1.3 }}>{c.title}</h2>
              <p className="muted">{c.about}</p>
              <p className="small muted">{c.instructor} · {c.lessons} lessons · {c.price}</p>
              <SoonButton title={c.title} />
            </div>
          ))}
          <div className="card" style={{ justifyContent: "center", alignItems: "flex-start", borderStyle: "dashed" }}>
            <h2 style={{ fontSize: 17 }}>Teach a course</h2>
            <p className="muted">SMB Advisors can create and sell courses to members.</p>
            <Link className="btn ghost" href="/smb-advisor">Become an SMB Advisor</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
