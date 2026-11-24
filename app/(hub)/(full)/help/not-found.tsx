import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import "@/styles/help.css";
import "@/styles/help-extra.css";

export default function HelpNotFound() {
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="card hcnone" style={{ maxWidth: 640, margin: "30px auto" }}>
          <span className="sq big"><Ic n="help" s={22} /></span>
          <strong>We couldn’t find that help page.</strong>
          <span className="muted">It may have moved. Search the Help Centre or browse the topics.</span>
          <Link className="btn sm" href="/help">Help Centre home</Link>
        </div>
      </div>
    </div>
  );
}
