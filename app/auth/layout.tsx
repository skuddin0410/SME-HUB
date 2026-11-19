import Link from "next/link";
import { Logo } from "@/components/site-nav";
import { AuthNav } from "@/components/auth-nav";

/**
 * Sign-in, join and password screens. The page is exactly one screen tall on desktop
 * (header, content centred, footer), so there is no empty space below the form on any size.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-[#f3f7fe]">
      <header className="relative z-10 border-b border-[#e3e9f4] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-[66px] w-full max-w-[1270px] items-center gap-4 px-5 xl:px-0">
          <Logo large />
          <AuthNav />
        </div>
      </header>
      <main className="relative flex flex-1 flex-col">{children}</main>
      <footer className="px-4 py-4 text-center text-xs text-slate-500">
        SMB Hub, by Cmarketing Inc. © {new Date().getFullYear()}
        <span className="mx-2">|</span>
        <Link href="/about" className="hover:text-[#0a66c2] hover:underline">
          About
        </Link>
        <span className="mx-2">|</span>
        <Link href="/help" className="hover:text-[#0a66c2] hover:underline">
          Help
        </Link>
      </footer>
    </div>
  );
}
