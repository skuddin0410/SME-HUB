import Link from "next/link";
import { MailCheck } from "lucide-react";
import { BODY, CARD, TITLE } from "@/components/auth-ui";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      <div className={`${CARD} text-center space-y-3`}>
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/70">
          <MailCheck className="w-7 h-7" />
        </div>
        <h1 className={TITLE}>Check your inbox</h1>
        <p className={BODY}>We sent you a confirmation link from accounts@smbhub.ca. One click confirms your email and signs you in.</p>
        <Link href="/auth/login" className="inline-block text-xs font-semibold text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
