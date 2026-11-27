import Link from "next/link";
import { CanadaHorizon } from "./canada-map";
import "@/styles/auth-pages.css";

/**
 * The page around every sign-in screen (Update 1): logo, a link to the other screen, a footer.
 * `map`: the Canada map along the bottom (log-in page). `enter`: the card fades and rises in when the page opens.
 */
export function AuthFrame({ right, children, map, enter }: { right?: React.ReactNode; children: React.ReactNode; map?: boolean; enter?: boolean }) {
  return (
    <div className={`sa${map ? " withmap" : ""}${enter ? " enter" : ""}`}>
      {map ? <CanadaHorizon /> : null}
      <header className="top">
        <Link href="/auth/login" aria-label="SME Hub home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sme-hub-logo-full.png" alt="SME HUB, Canada’s Small Business Network." width={180} height={46} />
        </Link>
        {right ? <div className="r">{right}</div> : null}
      </header>
      <main>{children}</main>
      <SiteFoot />
    </div>
  );
}

export function SiteFoot() {
  return (
    <footer className="sitefoot">
      © 2026 CanadianSME · <Link href="/policies/terms">Terms</Link>
      <Link href="/policies/privacy-policy">Privacy</Link>
      <Link href="/help">Help Centre</Link>
      <a href="mailto:support@smehub.ca">support@smehub.ca</a>
    </footer>
  );
}
