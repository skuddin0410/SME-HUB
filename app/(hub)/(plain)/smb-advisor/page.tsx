import Link from "next/link";
import { BadgeCheck, Mic, Presentation, Users } from "lucide-react";
import { getDegrees, getLinks, getViewer } from "@/lib/hub";
import { Empty } from "@/components/hub";
import { Hero } from "@/components/content";
import { PersonCard, type Person } from "@/components/network-client";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "SMB Advisors",
  description: "Experienced advisors who serve Canadian small businesses: accountants, lawyers, consultants and coaches on SMB Hub.",
  path: "/smb-advisor",
});

const PERKS = [
  { icon: Users, title: "Up to 1,000 connections", text: "Reach owners across Canada and build a client network." },
  { icon: Presentation, title: "Host events and courses", text: "Run sessions for members and sell your courses on the Hub." },
  { icon: Mic, title: "Podcast and advertorial", text: "An interview on the Small Business Podcast and a CanadianSME feature." },
];

/** Members on the SMB Advisor plan (smehub.ca/smb-advisor), with what the plan includes. */
export default async function SmbAdvisorPage() {
  const { supabase, userId } = await getViewer();
  const fields = "id, full_name, headline, avatar_url, member_type, location";
  const [{ data }, links] = await Promise.all([
    supabase.from("profiles").select(fields).eq("member_type", "advisor").order("created_at", { ascending: true }).limit(60),
    getLinks(),
  ]);
  const advisors = ((data ?? []) as Person[]).filter((m) => m.id !== userId);
  const degrees = await getDegrees(supabase, userId, advisors.map((m) => m.id));

  return (
    <>
      <Hero
        eyebrow="Explore the Hub"
        title="SMB Advisors"
        text="Accountants, lawyers, consultants and coaches who work with Canadian small businesses. Connect with an advisor, ask a question in the feed, or message them directly."
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            {advisors.length} {advisors.length === 1 ? "advisor" : "advisors"} on SMB Hub
          </span>
          <Link href="/members?type=advisor" className="rounded-full border border-[#E6E3DC] px-3 py-1.5 text-[12px] font-semibold text-zinc-700 hover:bg-[#F4F2EE]">
            Search all members
          </Link>
        </div>
      </Hero>

      {advisors.length === 0 ? (
        <Empty title="No advisors listed yet">Advisors appear here once they join the SMB Advisor plan.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {advisors.map((m) => (
            <PersonCard key={m.id} person={m} link={links.get(m.id) ?? "none"} signedIn={!!userId} degree={degrees.get(m.id)} />
          ))}
        </div>
      )}

      <section className="rounded-3xl border border-[#E6E3DC] bg-white p-6 shadow-card">
        <h2 className="font-display text-[16px] font-bold text-zinc-950">Become an SMB Advisor</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-zinc-600">
          For experts who serve small businesses. The plan includes everything in SMB Elite, an SMB Advisor badge on your profile and posts, and:
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-[#F0EEE9] bg-[#FAF9F7] p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E6E3DC] bg-white text-blue-600">
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="mt-2.5 text-[13px] font-bold text-zinc-950">{title}</h3>
              <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">{text}</p>
            </div>
          ))}
        </div>
        <Link href="/membership-plans" className="mt-5 inline-flex h-10 items-center rounded-full bg-blue-600 px-5 text-[13px] font-semibold text-white hover:bg-blue-700">
          See the SMB Advisor plan
        </Link>
      </section>
    </>
  );
}
