/** Reading and settings pages: one centred column at a comfortable reading width. */
export default function PlainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 w-full mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8 py-6">
      <main className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4">{children}</main>
    </div>
  );
}
