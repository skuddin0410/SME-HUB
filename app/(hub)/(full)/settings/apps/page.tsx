import { pageMeta } from "@/lib/seo";
import { requireUser } from "@/lib/hub";
import { SettingsX } from "@/components/zip/settings-x";
import { AppsSection } from "@/components/zip/zoom-x";
import { loadSettingsData } from "@/lib/zip/settings-data";
import { myApps } from "@/lib/apps/settings-load";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = pageMeta({ title: "Connected apps", description: "Link Zoom and Google Calendar to SME Hub.", path: "/settings/apps", index: false });
export const dynamic = "force-dynamic";

/** Update 36: Settings and privacy → Connected apps (Zoom, Google Calendar busy times). */
export default async function AppsPage() {
  const { supabase, userId } = await requireUser();
  const [data, apps] = await Promise.all([loadSettingsData(), myApps(supabase, userId)]);
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <SettingsX data={data} initial="apps" extra={{ id: "apps", node: <AppsSection d={{ advisor: apps.advisor, zoom: apps.zoom, gcal: apps.gcal, gcalOn: apps.settings.gcal }} /> }} />
      </div>
    </div>
  );
}
