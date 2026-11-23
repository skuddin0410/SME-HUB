import Link from "next/link";

export default function HelpNotFound() {
  return (
    <div className="card empty" style={{ marginTop: 30 }}>
      <b>We couldn’t find that page.</b>
      <p>It may have moved. Try searching or browse by topic.</p>
      <Link className="btn" href="/help">Help Centre home</Link>
    </div>
  );
}
