import Link from "next/link";
import { Logo } from "@/components/site-nav";
import { AuthNav } from "@/components/auth-nav";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f3f7fe]">
      {/* supplied artwork: blue waves with the Toronto skyline on the right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[780px] bg-[url('/auth-bg.jpg')] bg-cover bg-[position:25%_center] lg:bg-[position:right_center]"
        style={{ maskImage: "linear-gradient(to bottom, black 78%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent)" }}
      />
      <header className="relative z-10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-[66px] w-full max-w-[1270px] items-center gap-4 px-5 xl:px-0">
          <Logo large />
          <AuthNav />
        </div>
      </header>
      <main className="relative z-10 flex-1">{children}</main>
      <footer className="relative z-10 px-4 py-5 text-center text-xs text-slate-500">
        SMB Hub, by Cmarketing Inc. © {new Date().getFullYear()}
        <span className="mx-2">|</span>
        <Link href="/about" className="hover:text-[#0b2bcf] hover:underline">
          About
        </Link>
        <span className="mx-2">|</span>
        <Link href="/help" className="hover:text-[#0b2bcf] hover:underline">
          Help
        </Link>
      </footer>
    </div>
  );
}
