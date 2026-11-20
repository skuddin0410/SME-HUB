/** Centred column for the smaller account screens (new password, confirming, link problems). */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 w-full flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md auth-fade-in">{children}</div>
    </main>
  );
}
