import Link from "next/link";
import { requireUser } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { loadOwnDetails } from "@/lib/profile-data";
import { CloseAccount, PrivacyCards } from "@/components/zip/account-client";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Settings", description: "Privacy, blocked members and your data on SMB Hub.", path: "/settings", index: false });

export default async function SettingsPage() {
  const { supabase, userId } = await requireUser();
  const details = await loadOwnDetails(supabase, userId);
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead">
          <p className="eyebrow">Only you can see this page</p>
          <h1>Privacy and account</h1>
          <p className="muted">Choose who sees each part of your profile, download your data, or close your account.</p>
        </div>
        <div className="setgrid">
          <PrivacyCards details={details} />
          <div className="card">
            <h2>My data</h2>
            <p className="muted">Download a copy of your profile, posts, comments, connections, recommendations and messages as one file.</p>
            <a className="btn sm" style={{ alignSelf: "flex-start" }} href="/settings/export" download>Download my data</a>
          </div>
          <div className="card">
            <h2>Blocked members</h2>
            <p className="muted">People you have blocked cannot see your posts or message you.</p>
            <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href="/blocked">See blocked members</Link>
          </div>
          <CloseAccount />
        </div>
      </div>
    </div>
  );
}
