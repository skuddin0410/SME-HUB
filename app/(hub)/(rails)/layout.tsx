import { Suspense } from "react";
import { ZipLeftRail, ZipRightRail } from "@/components/zip/rails";
import { SkRail } from "@/components/zip/skeletons";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

/**
 * Feed-style pages, laid out as in the design guide: a left rail (shortcuts and recent articles),
 * the centre column, and a right rail with the member's card. On phones the centre column comes first.
 */
export default function RailsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="cols">
          <aside className="rail" aria-label="Your shortcuts">
            {/* Speed: the side columns load on their own, so the page (and its loading shape) never waits for them */}
            <Suspense fallback={<SkRail cards={1} />}><ZipLeftRail /></Suspense>
          </aside>
          <section className="mid pgmid" style={{ display: "flex", flexDirection: "column" }}>{children}</section>
          <aside className="rail" aria-label="Your account">
            <Suspense fallback={<SkRail />}><ZipRightRail /></Suspense>
          </aside>
        </div>
      </div>
    </div>
  );
}
