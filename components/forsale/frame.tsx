import { loadFsCtx } from "@/lib/forsale";
import { FsProvider } from "@/components/forsale/ui";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/courses.css";
import "@/styles/courses-extra.css";
import "@/styles/forsale.css";
import "@/styles/forsale-extra.css";

/** Every Businesses for Sale page: the guide's wrapper, the viewer and the shared pop-up windows. */
export async function FsFrame({ children }: { children: React.ReactNode }) {
  const ctx = await loadFsCtx();
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <FsProvider member={ctx.member} staff={ctx.staff} paid={ctx.paid} userId={ctx.userId}>{children}</FsProvider>
      </div>
    </div>
  );
}

export async function fsTabs() {
  const c = await loadFsCtx();
  return { mine: c.mine, unread: c.unread, saved: c.saved };
}
