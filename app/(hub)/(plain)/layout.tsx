import { SectionAside } from "@/components/section-aside";

/**
 * Reading and settings pages, at the same width as the header: the page on the left (8 of 12
 * columns) and, on desktop, a sticky card with the other pages in the same menu group.
 */
export default function PlainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <main className="lg:col-span-8 flex min-w-0 flex-col gap-4">{children}</main>
        <aside className="hidden lg:block lg:col-span-4 sticky top-[78px]">
          <SectionAside />
        </aside>
      </div>
    </div>
  );
}
