import { AuthChrome } from "@/components/auth-chrome";

/** Sign-in, join and password screens. Design: docs/design/auth.html. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthChrome>{children}</AuthChrome>;
}
