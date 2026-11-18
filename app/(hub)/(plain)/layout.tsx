/** Reading and settings pages: one centred column, no side cards. */
export default function PlainLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex max-w-[960px] flex-col gap-2 px-4 py-6">{children}</main>;
}
