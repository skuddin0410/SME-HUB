/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { HIcon } from "@/components/help/icons";
import { LegacyHash } from "@/components/help/client";
import "@/styles/help-centre.css";

export const metadata: Metadata = {
  title: { absolute: "SME Hub Help Centre" },
  description: "Guides and answers for every part of SME Hub, from your first post to running your business page.",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hc">
      <LegacyHash />
      <a className="sr" href="#main">Skip to content</a>
      <header className="top">
        <div className="wrap hd">
          <Link className="logo" href="/help" aria-label="SME Hub Help Centre home">
            <img src="/brand/sme-hub-logo.png" alt="SME Hub" width={118} height={30} />
            <span>Help Centre</span>
          </Link>
          <span className="grow" />
          <form className="hsearch" role="search" action="/help/search" method="get">
            <HIcon n="search" s={15} />
            <label className="sr" htmlFor="hq">Search help articles</label>
            <input id="hq" name="q" type="search" placeholder="Search help" />
          </form>
          <Link className="tbtn hide" href="/help/a/contact-support">Contact us</Link>
          <Link className="btn" href="/">Back to SME Hub</Link>
        </div>
      </header>
      <main id="main" className="wrap" tabIndex={-1}>{children}</main>
      <footer>
        <div className="wrap">
          <span>© 2026 CanadianSME · SME Hub Help Centre</span>
          <span className="grow" />
          <Link href="/help/a/community-guidelines">Community guidelines</Link>
          <Link href="/help/a/contact-support">Contact us</Link>
        </div>
      </footer>
    </div>
  );
}
