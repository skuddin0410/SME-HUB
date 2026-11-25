/** Reading and settings pages: the same content width as the navbar and every other page. */
export default function PlainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hubw flex-1 pt-5 pb-10">
      <main className="pgmid flex min-w-0 flex-col gap-4">{children}</main>
    </div>
  );
}
