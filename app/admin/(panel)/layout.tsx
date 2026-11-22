import Link from "next/link";
import { Building2, CreditCard, ExternalLink, FileText, Flag, LayoutDashboard, Users, UsersRound } from "lucide-react";
import { requireStaff } from "@/lib/hub";
import { AvatarImg, NavLink, SignOutButton } from "@/components/hub-client";
import { Logo } from "@/components/site-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireStaff();
  const { count: openReports } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  const nav = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard, badge: 0 },
    { href: "/admin/members", label: "Members", icon: Users, badge: 0 },
    { href: "/admin/posts", label: "Posts", icon: FileText, badge: 0 },
    { href: "/admin/reports", label: "Reports", icon: Flag, badge: openReports ?? 0 },
    { href: "/admin/groups", label: "Groups", icon: UsersRound, badge: 0 },
    { href: "/admin/businesses", label: "Businesses", icon: Building2, badge: 0 },
    { href: "/admin/billing", label: "Billing", icon: CreditCard, badge: 0 },
  ];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="flex flex-col gap-1 p-4 md:sticky md:top-0 md:h-screen" style={{ background: "hsl(var(--ink))" }}>
        <div className="mb-4 px-1">
          <Logo onDark href="/admin" />
          <p className="mt-2 text-xs text-white/60">Admin panel</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">
          {nav.map(({ href, label, icon: Icon, badge }) => (
            <NavLink key={href} href={href} label={label} badge={badge} variant="side">
              <Icon className="h-[1.125rem] w-[1.125rem]" />
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-3 border-t border-white/10 pt-4 md:block">
          <Link href="/feed" className="flex items-center gap-2 px-3 text-sm text-white/60 hover:text-white">
            <ExternalLink className="h-4 w-4" /> View the live Hub
          </Link>
          <div className="flex items-center gap-2.5 px-3">
            <span className="rounded-full ring-2 ring-white/30"><AvatarImg person={profile} size={32} /></span>
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-white">{profile.full_name}</p>
              <SignOutButton to="/admin/login" className="text-xs text-white/50 hover:text-white" />
            </div>
          </div>
        </div>
      </aside>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-5 md:p-8">{children}</main>
    </div>
  );
}
