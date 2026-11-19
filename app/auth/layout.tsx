import Link from "next/link";
import { Logo } from "@/components/site-nav";
import { AuthNav } from "@/components/auth-nav";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f3f7fe]">
      {/* supplied artwork: blue waves with the Toronto skyline on the right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[780px]"
        style={{ maskImage: "linear-gradient(to bottom, black 78%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent)" }}
      >
        <div className="absolute inset-0 bg-[url('/auth-bg.jpg')] bg-cover bg-[position:25%_center] lg:bg-[position:right_center]" />
        {/* the same artwork in motion, on large screens only; phones and reduced-motion settings keep the still picture */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/auth-bg-poster.jpg"
          className="absolute inset-0 hidden h-full w-full object-cover object-right lg:block motion-reduce:lg:hidden"
        >
          <source src="/auth-bg.mp4" type="video/mp4" />
        </video>
        {/* the video's skyline grows across the picture; this veil keeps the form side light and readable */}
        <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,#edf3fd_0%,#edf3fd_40%,rgb(237_243_253/0.75)_50%,transparent_64%)] lg:block motion-reduce:lg:hidden" />
      </div>
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
