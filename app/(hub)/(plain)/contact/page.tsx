import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { CONTACT } from "@/lib/site";
import { Hero } from "@/components/content";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  const card = "panel p-4";
  const icon = "flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary";
  return (
    <>
      <Hero title="Contact us" text="Questions about your account, a membership plan or working with CanadianSME? Call or email and our team will help." />
      <div className="grid gap-3 sm:grid-cols-2">
        <section className={card}>
          <span className={icon}>
            <Mail className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-base font-semibold">Email</h2>
          {CONTACT.emails.map((e) => (
            <a key={e} href={`mailto:${e}`} className="mt-1 block text-sm text-primary hover:underline">
              {e}
            </a>
          ))}
        </section>
        <section className={card}>
          <span className={icon}>
            <Phone className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-base font-semibold">Phone</h2>
          {CONTACT.phones.map((p) => (
            <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="mt-1 block text-sm text-primary hover:underline">
              {p}
            </a>
          ))}
        </section>
      </div>
      <section className={`${card} flex items-start gap-3`}>
        <span className={`${icon} shrink-0`}>
          <MapPin className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Office</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cmarketing Inc.</p>
          <p className="text-sm text-muted-foreground">{CONTACT.address}</p>
        </div>
      </section>
      <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <p className="text-sm text-muted-foreground">Looking for a quick answer about posting, connections or plans?</p>
        <Link href="/help" className="press rounded-xl border border-primary px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
          Read the FAQ
        </Link>
      </section>
    </>
  );
}
