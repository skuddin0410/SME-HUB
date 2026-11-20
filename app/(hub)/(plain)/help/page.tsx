import { Hero } from "@/components/content";
import { Mail, MapPin, Phone } from "lucide-react";
import { CONTACT } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Help and frequently asked questions", description: "Answers about joining SMB Hub, posting, connections, groups, business listings and membership plans.", path: "/help" });

const FAQ = [
  { q: "Do I need an account to look around?", a: "No. Anyone can read the public feed and browse members, groups and businesses. You need a free account to post, like, comment and connect." },
  { q: "How do I post?", a: "Open Home, click the box at the top of the feed, choose what you are sharing (update, question, win, offer or hiring), write it and press Post. You can add one photo." },
  { q: "Who can see my post?", a: "You choose each time: anyone, members only, your connections, or only you. Posts inside a private group are visible to that group's members." },
  { q: "How do connections work?", a: "Press Connect on a member's card or profile. They get an alert and can accept or decline. Manage requests under the Network icon." },
  { q: "How do I report something?", a: "Use the flag on any post that is not yours and pick a reason. Our team reviews every report." },
  { q: "How do I upgrade my plan?", a: "See Upgrade in the menu for what each plan includes, then contact us and we will set it up." },
];

export default function HelpPage() {
  return (
    <>
      <Hero eyebrow="Policies & help" title="Help and frequently asked questions" text="Quick answers about accounts, posting, privacy, connections and plans. Still stuck? Email the team and we will help." />
      <section className="panel divide-y">
        {FAQ.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-xl font-normal text-primary transition-transform duration-200 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 animate-rise text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </section>

      <section id="contact" className="panel scroll-mt-24 p-6">
        <h2 className="text-lg font-semibold">Contact us</h2>
        <ul className="mt-3 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {CONTACT.address}
          </li>
          <li className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="flex flex-wrap gap-x-4">
              {CONTACT.phones.map((p) => (
                <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-primary">
                  {p}
                </a>
              ))}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="flex flex-wrap gap-x-4">
              {CONTACT.emails.map((e) => (
                <a key={e} href={`mailto:${e}`} className="hover:text-primary">
                  {e}
                </a>
              ))}
            </span>
          </li>
        </ul>
      </section>
    </>
  );
}
