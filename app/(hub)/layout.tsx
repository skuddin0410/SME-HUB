import Link from "next/link";
import { getMe } from "@/lib/hub";
import { Avatar } from "@/components/hub";
import { LogoutButton } from "@/components/logout-button";
import { Bell, Home, ShieldAlert, UserPlus, Users, UsersRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, profile } = await getMe();
  const [{ count: unread }, { count: requests }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    supabase
      .from("connections")
      .select("requester_id", { count: "exact", head: true })
      .eq("addressee_id", userId)
      .eq("status", "pending"),
  ]);

  const links = [
    { href: "/feed", label: "Feed", icon: Home, badge: 0 },
    { href: "/members", label: "Members", icon: Users, badge: 0 },
    { href: "/network", label: "Network", icon: UserPlus, badge: requests ?? 0 },
    { href: "/groups", label: "Groups", icon: UsersRound, badge: 0 },
    { href: "/notifications", label: "Alerts", icon: Bell, badge: unread ?? 0 },
  ];
  if (profile && profile.role !== "member") {
    links.push({ href: "/admin/reports", label: "Reports", icon: ShieldAlert, badge: 0 });
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3">
          <Link href="/feed" className="text-lg font-bold">
            SME Hub
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {links.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href}
                className="relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                {badge > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">{badge}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {profile && (
              <Link href={`/members/${userId}`} title="My profile">
                <Avatar person={profile} size={32} />
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      {profile?.status === "suspended" && (
        <p className="bg-red-600 px-3 py-2 text-center text-sm text-white">
          Your account is suspended. You can browse but cannot post.
        </p>
      )}
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-3 py-6">{children}</main>
    </div>
  );
}
