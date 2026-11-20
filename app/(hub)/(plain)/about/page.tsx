import { Hero } from "@/components/content";
import Link from "next/link";
import { Handshake, Lightbulb, Megaphone, UsersRound } from "lucide-react";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "About SMB Hub", description: "SMB Hub is CanadianSME's network for Canadian small business owners, advisors and professionals.", path: "/about" });

const POINTS = [
  { icon: Handshake, title: "Meet other owners", text: "Connect with people running businesses like yours, in your city or your industry." },
  { icon: Lightbulb, title: "Ask and answer", text: "Post a question, share a win or pass on a lesson. Filter the feed to find what you need." },
  { icon: UsersRound, title: "Join groups", text: "Smaller rooms for specific topics: funding, retail, importing, AI and more." },
  { icon: Megaphone, title: "Get your business seen", text: "List your company in the business directory and share offers with members." },
];

export default function AboutPage() {
  return (
    <>
      <Hero eyebrow="CanadianSME Small Business Hub" title="About SMB Hub" text="SMB Hub is the community from CanadianSME where small business owners and entrepreneurs connect and trade experience, tools and advice, from financing to expansion." />
      <div className="grid gap-4 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <section key={title} className="panel p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </section>
        ))}
      </div>
      <section className="panel p-6 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Who runs it</h2>
        <p className="mt-2 text-muted-foreground">
          SMB Hub is operated by Cmarketing Inc., the company behind CanadianSME Small Business Magazine, the Small
          Business Expo, the Small Business Summit and the Small Business Awards.
        </p>
        <Link href="/contact" className="mt-3 inline-block font-semibold text-primary hover:underline">
          Contact the team
        </Link>
      </section>
    </>
  );
}
