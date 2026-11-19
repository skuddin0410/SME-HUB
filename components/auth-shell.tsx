/** Centred column for the smaller account screens (password reset, confirming, link problems). */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto flex w-full max-w-[465px] flex-1 flex-col justify-center px-5 py-12">{children}</section>;
}
