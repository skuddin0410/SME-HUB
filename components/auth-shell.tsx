/** Centred column for the smaller account screens (new password, confirming, link problems). */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-md mx-auto auth-fade-in">{children}</div>;
}
