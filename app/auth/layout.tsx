import Link from "next/link";
import { Logo } from "@/components/site-nav";
import { AuthNav } from "@/components/auth-nav";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f3f7fe]">
      {/* supplied artwork: blue waves with the Toronto skyline on the right */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[780px] overflow-hidden">
        {/* phones and reduced-motion settings get the still picture */}
        <div
          className="absolute inset-0 bg-[url('/auth-bg.jpg')] bg-cover bg-[position:25%_center] lg:hidden motion-reduce:lg:block motion-reduce:lg:bg-[position:right_center]"
          style={{ maskImage: "linear-gradient(to bottom, black 78%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent)" }}
        />
        {/* large screens: the video at its own size (1280 x 720), never stretched, so it stays sharp.
            It sits against the right edge and fades into the page on its left and bottom. */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/auth-bg-poster.jpg"
          className="absolute right-0 top-0 hidden h-auto w-full max-w-[1280px] lg:block motion-reduce:lg:hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 14%), linear-gradient(to bottom, black 72%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 14%), linear-gradient(to bottom, black 72%, transparent)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        >
          <source src="/auth-bg.mp4" type="video/mp4" />
        </video>
        {/* keeps the form side light: solid page colour up to the form's right edge, then a soft fade */}
        <div
          className="absolute inset-0 hidden lg:block motion-reduce:lg:hidden"
          style={{ ["--edge" as string]: "max(540px, calc(50vw - 115px))", background: "linear-gradient(to right, #f3f7fe 0, #f3f7fe var(--edge), rgb(243 247 254 / 0) calc(var(--edge) + 320px))" }}
        />
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
