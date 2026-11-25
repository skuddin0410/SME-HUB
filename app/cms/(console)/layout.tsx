import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  AtSign,
  Ban,
  Bell,
  Building2,
  ExternalLink,
  FileText,
  Flag,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  ScrollText,
  Search,
  ShieldCheck,
  Star,
  Users,
  UsersRound,
} from "lucide-react";
import { requireCms } from "@/lib/cms";
import { AvatarImg, SignOutButton } from "@/components/hub-client";
import { CmsNav, LiveSync } from "@/components/cms/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "CMS", template: "%s · SME Hub CMS" }, robots: { index: false, follow: false } };

const ic = "h-4 w-4";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireCms();
  const { count: openReports } = await supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");

  const groups = [
    {
      title: "Overview",
      items: [
        { href: "/cms", label: "Dashboard", icon: <LayoutDashboard className={ic} /> },
        { href: "/cms/activity", label: "Live activity", icon: <Activity className={ic} /> },
      ],
    },
    {
      title: "People",
      items: [
        { href: "/cms/members", label: "Members", icon: <Users className={ic} /> },
        { href: "/cms/connections", label: "Connections", icon: <Handshake className={ic} /> },
        { href: "/cms/messages", label: "Messages", icon: <MessagesSquare className={ic} /> },
        { href: "/cms/staff", label: "Admins", icon: <ShieldCheck className={ic} /> },
      ],
    },
    {
      title: "Content",
      items: [
        { href: "/cms/posts", label: "Posts", icon: <FileText className={ic} /> },
        { href: "/cms/comments", label: "Comments", icon: <MessageSquare className={ic} /> },
        { href: "/cms/groups", label: "Groups", icon: <UsersRound className={ic} /> },
      ],
    },
    {
      title: "Business",
      items: [
        { href: "/cms/businesses", label: "Business listings", icon: <Building2 className={ic} /> },
        { href: "/cms/reviews", label: "Reviews", icon: <Star className={ic} /> },
      ],
    },
    {
      title: "Safety",
      items: [
        { href: "/cms/reports", label: "Reports", icon: <Flag className={ic} />, badge: openReports ?? 0 },
        { href: "/cms/blocks", label: "Blocks", icon: <Ban className={ic} /> },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/cms/notifications", label: "Notifications", icon: <Bell className={ic} /> },
        { href: "/cms/emails", label: "Emails", icon: <AtSign className={ic} /> },
        { href: "/cms/audit", label: "Audit log", icon: <ScrollText className={ic} /> },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 font-inter text-zinc-900 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5 border-b border-zinc-200 bg-white p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <Link href="/cms" className="flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sme-hub-logo-no-tagline.png" alt="SME Hub" width={941} height={241} className="h-7 w-auto" />
          <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-white">CMS</span>
        </Link>
        <CmsNav groups={groups} />
        <div className="mt-auto hidden border-t border-zinc-100 pt-4 lg:block">
          <a href={process.env.NEXT_PUBLIC_SITE_URL || "/feed"} target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-2 px-3 text-[0.8438rem] text-zinc-500 hover:text-zinc-900">
            <ExternalLink className="h-3.5 w-3.5" /> Open the live hub
          </a>
          <div className="flex items-center gap-2.5 px-2">
            <AvatarImg person={profile} size={32} />
            <div className="min-w-0 text-[0.8438rem]">
              <p className="truncate font-semibold text-zinc-900">{profile.full_name || "Admin"}</p>
              <SignOutButton to="/cms/login" className="text-zinc-500 hover:text-zinc-900" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/95 px-5 backdrop-blur lg:px-8">
          <form action="/cms/members" className="relative max-w-md flex-1">
            <label htmlFor="cms-search" className="sr-only">
              Search members
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="cms-search"
              name="q"
              placeholder="Search members by name, email or city"
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-[0.875rem] placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </form>
          <span className="flex-1" />
          <LiveSync />
        </header>
        <main className="mx-auto flex w-full max-w-[80rem] flex-col gap-5 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
