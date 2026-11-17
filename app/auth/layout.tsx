import Link from "next/link";
import { Building2, CreditCard, Newspaper, Users, UsersRound } from "lucide-react";
import { Logo } from "@/components/site-nav";

const LINKS = [
  { href: "/feed", label: "Top posts", icon: Newspaper },
  { href: "/members", label: "People", icon: Users },
  { href: "/groups", label: "Groups", icon: UsersRound },
  { href: "/businesses", label: "Businesses", icon: Building2 },
  { href: "/membership-plans", label: "Plans", icon: CreditCard },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex h-[76px] w-full max-w-[1128px] items-center gap-2 px-4">
        <Logo />
        <nav className="ml-auto hidden items-center md:flex" aria-label="Browse">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="press flex h-[52px] min-w-[80px] flex-col items-center justify-center gap-0.5 rounded px-2 text-xs text-foreground/60 transition-colors hover:text-foreground"
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          ))}
          <span className="mx-3 h-9 w-px bg-border" />
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/auth/sign-up"
            className="press rounded-full border border-primary px-5 py-2.5 text-base font-semibold text-primary transition-all hover:bg-primary/10 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary))]"
          >
            Join now
          </Link>
          <Link href="/auth/login" className="press rounded-full bg-primary px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[hsl(224_76%_44%)]">
            Sign in
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
        SMB Hub, by Cmarketing Inc. © {new Date().getFullYear()}
        <span className="mx-2">|</span>
        <Link href="/about" className="hover:text-primary hover:underline">
          About
        </Link>
        <span className="mx-2">|</span>
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
      </footer>
    </div>
  );
}
