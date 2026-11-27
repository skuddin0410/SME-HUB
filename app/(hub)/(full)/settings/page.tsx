import { pageMeta } from "@/lib/seo";
import { SettingsX } from "@/components/zip/settings-x";
import { loadSettingsData } from "@/lib/zip/settings-data";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = pageMeta({ title: "Settings and privacy", description: "Your account, privacy, notifications, business card and data on SME Hub.", path: "/settings", index: false });
export const dynamic = "force-dynamic";

/** Update 33: Settings and privacy (replaces "Privacy and account"). */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sp = await searchParams;
  const data = await loadSettingsData();
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <SettingsX data={data} initial={sp.s ?? "account"} />
      </div>
    </div>
  );
}
