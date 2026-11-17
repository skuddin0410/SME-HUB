import { BrandLogo } from "@/components/hub-client";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="flex flex-col justify-between gap-8 p-8 text-white lg:p-12" style={{ background: "hsl(var(--ink))" }}>
        <BrandLogo />
        <div className="hidden lg:block">
          <p className="font-display text-4xl font-bold leading-tight">Where Canadian small business owners meet.</p>
          <p className="mt-4 max-w-md text-white/70">
            Ask questions, share what is working and find the people who can help you grow.
          </p>
        </div>
        <p className="hidden text-xs text-white/40 lg:block">CanadianSME Hub, by Cmarketing Inc.</p>
      </aside>
      <div className="bg-white">{children}</div>
    </div>
  );
}
