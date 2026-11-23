import Link from "next/link";
import "@/styles/auth-pages.css";

/** The page around every sign-in screen (Update 1): logo, a link to the other screen, a footer. */
export function AuthFrame({ right, children }: { right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="sa">
      <header className="top">
        <Link href="/auth/login" aria-label="SME Hub home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sme-hub-logo.png" srcSet="/brand/sme-hub-logo.png 2x, /brand/sme-hub-logo@3x.png 3x" alt="SME Hub" width={176} height={46} />
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
